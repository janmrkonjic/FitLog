import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useUnitStore from '../store/unitStore'

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

function setVolumeKg(s) {
  // Use plain weight*reps; per-hand sets store the heavier-side weight in `weight`.
  return (s.weight || 0) * (s.reps || 0)
}

const PERIODS = [
  { label: '1 Week',  days: 7   },
  { label: '1 Month', days: 30  },
  { label: '1 Year',  days: 365 },
]

// Build time buckets for the bar chart based on period length.
function buildBuckets(periodDays, now = new Date()) {
  const buckets = []
  if (periodDays <= 7) {
    // 7 daily buckets, oldest -> newest
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const end = new Date(d); end.setDate(end.getDate() + 1)
      buckets.push({
        start: d, end,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      })
    }
  } else if (periodDays <= 31) {
    // ~4 weekly buckets
    for (let i = 3; i >= 0; i--) {
      const end = new Date(now); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() - i * 7 + 1)
      const start = new Date(end); start.setDate(start.getDate() - 7)
      buckets.push({
        start, end,
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })
    }
  } else {
    // 12 monthly buckets
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    for (let i = 0; i < 12; i++) {
      const start = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1)
      const end   = new Date(startMonth.getFullYear(), startMonth.getMonth() + i + 1, 1)
      buckets.push({
        start, end,
        label: start.toLocaleDateString('en-US', { month: 'short' }),
      })
    }
  }
  return buckets
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className="text-slate-100 font-bold text-2xl tabular-nums">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ── BarChart ──────────────────────────────────────────────────────────────────

function BarChart({ buckets, values, formatValue }) {
  const max = Math.max(1, ...values)
  const W = 600, H = 180
  const padTop = 12, padBottom = 28, padLeft = 8, padRight = 8
  const innerW = W - padLeft - padRight
  const innerH = H - padTop - padBottom
  const n = buckets.length
  const gap = 6
  const barW = (innerW - gap * (n - 1)) / n

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44">
      {values.map((v, i) => {
        const h = (v / max) * innerH
        const x = padLeft + i * (barW + gap)
        const y = padTop + (innerH - h)
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={Math.max(h, v > 0 ? 2 : 0)}
              rx={3}
              fill={v > 0 ? '#0ea5e9' : '#334155'}
              opacity={v > 0 ? 0.85 : 0.4}
            />
            {v > 0 && (
              <text
                x={x + barW / 2} y={y - 3}
                fontSize="9" fill="#cbd5e1" textAnchor="middle"
              >
                {formatValue(v)}
              </text>
            )}
            <text
              x={x + barW / 2} y={H - 10}
              fontSize="10" fill="#64748b" textAnchor="middle"
            >
              {buckets[i].label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── LineChart ─────────────────────────────────────────────────────────────────

function LineChart({ points, formatX, formatY }) {
  // points: [{ date: Date, value: number }]
  if (points.length === 0) return null

  const W = 600, H = 200
  const padTop = 16, padBottom = 28, padLeft = 36, padRight = 12
  const innerW = W - padLeft - padRight
  const innerH = H - padTop - padBottom

  const values = points.map((p) => p.value)
  const minV   = Math.min(...values)
  const maxV   = Math.max(...values)
  const range  = maxV - minV || 1
  const yMin   = Math.max(0, minV - range * 0.1)
  const yMax   = maxV + range * 0.1 || maxV + 1

  const xMin = points[0].date.getTime()
  const xMax = points[points.length - 1].date.getTime()
  const xRange = xMax - xMin || 1

  const xPos = (d) => padLeft + ((d.getTime() - xMin) / xRange) * innerW
  const yPos = (v) => padTop + innerH - ((v - yMin) / (yMax - yMin)) * innerH

  const path = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${xPos(p.date).toFixed(2)} ${yPos(p.value).toFixed(2)}`
  ).join(' ')

  // y-axis labels: min, mid, max
  const yLabels = [yMin, (yMin + yMax) / 2, yMax]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-52">
      {/* gridlines */}
      {yLabels.map((v, i) => {
        const y = yPos(v)
        return (
          <g key={i}>
            <line x1={padLeft} x2={W - padRight} y1={y} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={padLeft - 6} y={y + 3} fontSize="10" fill="#64748b" textAnchor="end">
              {formatY(v)}
            </text>
          </g>
        )
      })}
      {/* line */}
      <path d={path} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* points */}
      {points.map((p, i) => (
        <circle key={i} cx={xPos(p.date)} cy={yPos(p.value)} r="3" fill="#0ea5e9" />
      ))}
      {/* x-axis labels: first and last */}
      <text x={padLeft} y={H - 8} fontSize="10" fill="#64748b" textAnchor="start">
        {formatX(points[0].date)}
      </text>
      {points.length > 1 && (
        <text x={W - padRight} y={H - 8} fontSize="10" fill="#64748b" textAnchor="end">
          {formatX(points[points.length - 1].date)}
        </text>
      )}
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Progress() {
  const { unit } = useUnitStore()
  const [periodIdx, setPeriodIdx] = useState(1) // default: 1 Month
  const [rawData,   setRawData]   = useState(undefined)
  const [selectedExercise, setSelectedExercise] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          id,
          name,
          workouts!inner (id, date),
          sets (set_number, weight, reps, left_weight, left_reps, right_weight, right_reps)
        `)
        .order('set_number', { referencedTable: 'sets', ascending: true })

      if (error || !data) { setRawData([]); return }
      setRawData(data)
    }
    load().catch(() => setRawData([]))
  }, [])

  const period = PERIODS[periodIdx]

  // Normalise + filter to current period
  const filtered = useMemo(() => {
    if (!rawData) return null
    const cutoff = new Date(Date.now() - period.days * 24 * 60 * 60 * 1000)
    const rows = []
    for (const ex of rawData) {
      const name = (ex.name ?? '').trim()
      if (!name) continue
      const date = new Date(ex.workouts.date)
      if (date < cutoff) continue
      rows.push({
        name,
        workoutId: ex.workouts.id,
        date,
        sets: ex.sets ?? [],
      })
    }
    return rows
  }, [rawData, period])

  // Overall stats for period
  const stats = useMemo(() => {
    if (!filtered) return null
    const workoutIds = new Set()
    let setCount = 0
    let volumeKg = 0
    for (const ex of filtered) {
      workoutIds.add(ex.workoutId)
      for (const s of ex.sets) {
        setCount += 1
        volumeKg += setVolumeKg(s)
      }
    }
    return { workouts: workoutIds.size, sets: setCount, volumeKg }
  }, [filtered])

  // Volume per time bucket
  const volumeBuckets = useMemo(() => {
    if (!filtered) return { buckets: [], values: [] }
    const buckets = buildBuckets(period.days)
    const values = buckets.map(() => 0)
    for (const ex of filtered) {
      const i = buckets.findIndex((b) => ex.date >= b.start && ex.date < b.end)
      if (i === -1) continue
      for (const s of ex.sets) values[i] += setVolumeKg(s)
    }
    return { buckets, values }
  }, [filtered, period])

  // List of exercises that have data in the period
  const exerciseNames = useMemo(() => {
    if (!filtered) return []
    const seen = new Map()
    for (const ex of filtered) {
      const key = ex.name.toLowerCase()
      if (!seen.has(key)) seen.set(key, ex.name)
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }, [filtered])

  // Default-select first exercise once data loads
  useEffect(() => {
    if (!selectedExercise && exerciseNames.length > 0) {
      setSelectedExercise(exerciseNames[0])
    }
    if (selectedExercise && !exerciseNames.some((n) => n.toLowerCase() === selectedExercise.toLowerCase())) {
      setSelectedExercise(exerciseNames[0] ?? '')
    }
  }, [exerciseNames, selectedExercise])

  // Best-weight-per-session trend for the selected exercise
  const exerciseTrend = useMemo(() => {
    if (!filtered || !selectedExercise) return []
    const sel = selectedExercise.toLowerCase()
    // Group by workoutId — each workout = one session
    const byWorkout = new Map()
    for (const ex of filtered) {
      if (ex.name.toLowerCase() !== sel) continue
      if (!byWorkout.has(ex.workoutId)) {
        byWorkout.set(ex.workoutId, { date: ex.date, sets: [] })
      }
      byWorkout.get(ex.workoutId).sets.push(...ex.sets)
    }
    const points = []
    for (const { date, sets } of byWorkout.values()) {
      const best = bestSetFromSets(sets)
      if (!best || !best.weight) continue
      points.push({ date, value: best.weight })
    }
    points.sort((a, b) => a.date - b.date)
    return points
  }, [filtered, selectedExercise])

  const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const fmtWeightShort = (kg) => `${toDisplay(kg, unit)}`

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Progress</h1>
        <p className="text-slate-400 text-sm mb-6">
          Your training summary for the selected period.
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
        ) : !filtered || filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-slate-300 font-semibold text-lg mb-2">No data in this period</p>
            <p className="text-slate-500 text-sm mb-6 max-w-xs">
              Log a workout or pick a longer period to see your trends.
            </p>
            <Link
              to="/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Log a workout
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overall stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Workouts" value={stats.workouts} />
                <StatCard label="Sets" value={stats.sets} />
                <StatCard
                  label="Volume"
                  value={toDisplay(stats.volumeKg, unit).toLocaleString()}
                  sub={unit}
                />
              </div>
            )}

            {/* Volume over time bar chart */}
            <section className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-slate-100 font-semibold text-sm">Volume over time</h2>
                <span className="text-xs text-slate-500">
                  {period.days <= 7 ? 'per day' : period.days <= 31 ? 'per week' : 'per month'}
                </span>
              </div>
              <BarChart
                buckets={volumeBuckets.buckets}
                values={volumeBuckets.values.map((kg) => toDisplay(kg, unit))}
                formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))}
              />
            </section>

            {/* Per-exercise trend */}
            <section className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h2 className="text-slate-100 font-semibold text-sm">Best weight per session</h2>
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                >
                  {exerciseNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              {exerciseTrend.length === 0 ? (
                <p className="text-slate-500 text-sm py-6 text-center">
                  No sessions for this exercise in the selected period.
                </p>
              ) : exerciseTrend.length === 1 ? (
                <div className="py-6 text-center">
                  <p className="text-slate-100 font-bold text-2xl tabular-nums">
                    {toDisplay(exerciseTrend[0].value, unit)} {unit}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Single session on {fmtDate(exerciseTrend[0].date)} — log more to see a trend.
                  </p>
                </div>
              ) : (
                <>
                  <LineChart
                    points={exerciseTrend.map((p) => ({ date: p.date, value: toDisplay(p.value, unit) }))}
                    formatX={fmtDate}
                    formatY={fmtWeightShort}
                  />
                  {(() => {
                    const first = exerciseTrend[0].value
                    const last  = exerciseTrend[exerciseTrend.length - 1].value
                    const delta = last - first
                    const sign  = delta > 0 ? '+' : ''
                    const cls   = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-400'
                    return (
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        {exerciseTrend.length} sessions ·{' '}
                        <span className={`font-semibold ${cls}`}>
                          {sign}{toDisplay(delta, unit)} {unit}
                        </span>{' '}
                        since {fmtDate(exerciseTrend[0].date)}
                      </p>
                    )
                  })()}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
