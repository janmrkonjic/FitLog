import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useUnitStore, { fmtWeight } from '../store/unitStore'

// ── helpers ───────────────────────────────────────────────────────────────────

function toDisplay(kg, unit) {
  if (!kg) return 0
  return unit === 'lbs' ? Math.round(kg * 2.2046 * 10) / 10 : kg
}

function bestSetFromSets(sets) {
  return sets.reduce((best, s) => {
    if (!best) return s
    if (s.weight > best.weight) return s
    if (s.weight === best.weight && s.reps > best.reps) return s
    return best
  }, null)
}

const PERIODS = [
  { label: '1 Week',  days: 7   },
  { label: '1 Month', days: 30  },
  { label: '1 Year',  days: 365 },
]

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── Delta badge ───────────────────────────────────────────────────────────────

function DeltaBadge({ delta, unit }) {
  if (delta === null) {
    return <span className="text-slate-500 text-xs">No prior data</span>
  }
  if (delta === 0) {
    return <span className="text-slate-400 text-xs">No change</span>
  }
  const sign    = delta > 0 ? '+' : ''
  const display = toDisplay(Math.abs(delta), unit)
  const isPos   = delta > 0
  return (
    <span className={`text-xs font-semibold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
      {sign}{delta > 0 ? '+' : ''}{toDisplay(delta, unit)} {unit}
    </span>
  )
}

// ── ExerciseProgressRow ───────────────────────────────────────────────────────

function ExerciseProgressRow({ item, unit, periodDays }) {
  const currentDisplay = item.currentBest
    ? `${toDisplay(item.currentBest.weight, unit)} ${unit} × ${item.currentBest.reps}`
    : '—'

  const pastDisplay = item.pastBest
    ? `${toDisplay(item.pastBest.weight, unit)} ${unit} × ${item.pastBest.reps}`
    : null

  const delta = item.currentBest && item.pastBest
    ? item.currentBest.weight - item.pastBest.weight
    : null

  return (
    <Link
      to={`/exercise/${encodeURIComponent(item.name)}`}
      className="flex items-center justify-between gap-4 bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 hover:border-brand-500/50 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <p className="text-slate-100 font-semibold text-sm group-hover:text-brand-400 transition-colors truncate">
          {item.name}
        </p>
        <p className="text-slate-500 text-xs mt-0.5">
          {item.sessionCount} {item.sessionCount === 1 ? 'session' : 'sessions'}
        </p>
      </div>

      <div className="text-right shrink-0 space-y-1">
        <p className="text-slate-200 text-sm font-semibold tabular-nums">{currentDisplay}</p>
        {pastDisplay && (
          <p className="text-slate-500 text-xs tabular-nums">{pastDisplay}</p>
        )}
        {item.isNew && (
          <span className="text-xs font-semibold text-brand-400">New exercise</span>
        )}
        {!item.isNew && <DeltaBadge delta={delta} unit={unit} />}
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Progress() {
  const { unit } = useUnitStore()
  const [periodIdx, setPeriodIdx] = useState(1) // default: 1 Month
  const [rawData,   setRawData]   = useState(undefined)

  useEffect(() => {
    async function load() {
      // Fetch all exercises with their workout dates and sets
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          id,
          name,
          workouts!inner (date),
          sets (set_number, weight, reps, left_weight, left_reps, right_weight, right_reps)
        `)
        .order('set_number', { referencedTable: 'sets', ascending: true })

      if (error || !data) { setRawData([]); return }
      setRawData(data)
    }
    load().catch(() => setRawData([]))
  }, [])

  const period = PERIODS[periodIdx]

  const exerciseItems = useMemo(() => {
    if (!rawData) return []

    const cutoff = new Date(Date.now() - period.days * 24 * 60 * 60 * 1000)

    // Group sessions by exercise name
    const byName = new Map()
    for (const ex of rawData) {
      const name = (ex.name ?? '').trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (!byName.has(key)) byName.set(key, { name, sessions: [] })
      byName.get(key).sessions.push({
        date: new Date(ex.workouts.date),
        sets: ex.sets ?? [],
      })
    }

    const items = []
    for (const { name, sessions } of byName.values()) {
      // Current best = best across ALL sessions
      const allSets = sessions.flatMap((s) => s.sets)
      const currentBest = bestSetFromSets(allSets)

      // Past best = best across sessions that occurred BEFORE the cutoff
      const pastSets = sessions
        .filter((s) => s.date < cutoff)
        .flatMap((s) => s.sets)
      const pastBest = bestSetFromSets(pastSets)

      const isNew = pastSets.length === 0

      const delta = currentBest && pastBest
        ? currentBest.weight - pastBest.weight
        : null

      items.push({
        name,
        currentBest,
        pastBest,
        isNew,
        delta,
        sessionCount: sessions.length,
      })
    }

    // Sort: improved most first, then new exercises, then unchanged/regressed
    items.sort((a, b) => {
      const da = a.delta ?? (a.isNew ? -Infinity : 0)
      const db = b.delta ?? (b.isNew ? -Infinity : 0)
      if (db !== da) return db - da
      return a.name.localeCompare(b.name)
    })

    return items
  }, [rawData, period])

  const improved  = exerciseItems.filter((i) => (i.delta ?? 0) > 0)
  const unchanged = exerciseItems.filter((i) => !i.isNew && (i.delta ?? 0) === 0)
  const regressed = exerciseItems.filter((i) => !i.isNew && (i.delta ?? 0) < 0)
  const isNewList = exerciseItems.filter((i) => i.isNew)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Progress</h1>
        <p className="text-slate-400 text-sm mb-6">
          Compare your current best sets to where you were before.
        </p>

        {/* Period selector */}
        <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1 mb-8 w-fit">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriodIdx(i)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                periodIdx === i
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {rawData === undefined ? (
          <Spinner />
        ) : exerciseItems.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-slate-300 font-semibold text-lg mb-2">No data yet</p>
            <p className="text-slate-500 text-sm mb-6 max-w-xs">
              Log some workouts and come back to see your progress.
            </p>
            <Link
              to="/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Log a workout
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Improved */}
            {improved.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                    Improved
                  </h2>
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                    {improved.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {improved.map((item) => (
                    <li key={item.name}>
                      <ExerciseProgressRow item={item} unit={unit} periodDays={period.days} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Unchanged */}
            {unchanged.length > 0 && (
              <section>
                <h2 className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                  No Change
                </h2>
                <ul className="space-y-2">
                  {unchanged.map((item) => (
                    <li key={item.name}>
                      <ExerciseProgressRow item={item} unit={unit} periodDays={period.days} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Regressed */}
            {regressed.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                    Below previous best
                  </h2>
                  <span className="text-xs text-red-400 font-semibold bg-red-400/10 border border-red-400/20 rounded-full px-2 py-0.5">
                    {regressed.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {regressed.map((item) => (
                    <li key={item.name}>
                      <ExerciseProgressRow item={item} unit={unit} periodDays={period.days} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* New exercises */}
            {isNewList.length > 0 && (
              <section>
                <h2 className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                  Started in this period
                </h2>
                <ul className="space-y-2">
                  {isNewList.map((item) => (
                    <li key={item.name}>
                      <ExerciseProgressRow item={item} unit={unit} periodDays={period.days} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
