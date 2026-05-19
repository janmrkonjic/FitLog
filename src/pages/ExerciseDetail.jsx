import { useParams, Link, useLocation } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { useExerciseStats } from '../hooks/useExerciseStats'
import useUnitStore, { fmtWeight } from '../store/unitStore'

// ── helpers ───────────────────────────────────────────────────────────────────

function formatLong(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function formatShort(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

function toDisplay(kg, unit) {
  if (!kg) return 0
  return unit === 'lbs' ? Math.round(kg * 2.2046 * 10) / 10 : kg
}

// ── primitives ────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function BackLink({ workoutId }) {
  const to    = workoutId ? `/workout/${workoutId}` : '/history'
  const label = workoutId ? 'Workout' : 'History'
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
      </svg>
      {label}
    </Link>
  )
}

// ── Unit toggle ───────────────────────────────────────────────────────────────

function UnitToggle() {
  const { unit, setUnit } = useUnitStore()
  return (
    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 gap-0.5">
      {['kg', 'lbs'].map((u) => (
        <button
          key={u}
          onClick={() => setUnit(u)}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            unit === u
              ? 'bg-brand-500 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  )
}

// ── Personal Best cards ───────────────────────────────────────────────────────

function StatCard({ label, primary, secondary }) {
  return (
    <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">{label}</p>
      <p className="text-slate-100 font-bold text-xl leading-tight">{primary}</p>
      {secondary && <p className="text-slate-400 text-xs mt-1">{secondary}</p>}
    </div>
  )
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 shadow-xl text-sm">
      <p className="text-slate-400 text-xs mb-1">{formatLong(d.date)}</p>
      <p className="text-brand-400 font-semibold">
        {d.displayWeight} {unit} &times; {d.reps} reps
      </p>
    </div>
  )
}

// ── Progress chart ────────────────────────────────────────────────────────────

function ProgressChart({ sessions, unit }) {
  const data = [...sessions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((s) => ({
      dateLabel:     formatShort(s.date),
      date:          s.date,
      displayWeight: toDisplay(s.bestSet?.weight ?? 0, unit),
      reps:          s.bestSet?.reps ?? 0,
    }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false} tickLine={false} dy={6}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false} tickLine={false}
            width={42}
            unit={` ${unit}`}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: '#334155' }} />
          <Line
            type="monotone"
            dataKey="displayWeight"
            stroke="#38BDF8"
            strokeWidth={2}
            dot={{ fill: '#38BDF8', strokeWidth: 0, r: 4 }}
            activeDot={{ fill: '#38BDF8', stroke: '#0f172a', strokeWidth: 2, r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {data.length === 1 && (
        <p className="text-center text-slate-500 text-xs mt-3">
          Log this exercise again to see your progress trend.
        </p>
      )}
    </div>
  )
}

// ── Session history ───────────────────────────────────────────────────────────

function SessionRow({ session, unit }) {
  const volDisplay = unit === 'lbs'
    ? Math.round(session.totalVolume * 2.2046)
    : session.totalVolume

  return (
    <Link
      to={`/workout/${session.workoutId}`}
      className="flex items-center justify-between gap-4 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 hover:border-brand-500/50 transition-colors group"
    >
      <div className="min-w-0">
        <p className="text-slate-100 text-sm font-medium group-hover:text-brand-400 transition-colors truncate">
          {session.workoutName}
        </p>
        <p className="text-slate-500 text-xs mt-0.5">{formatLong(session.date)}</p>
      </div>

      <div className="text-right shrink-0 space-y-0.5">
        {session.bestSet && (
          <p className="text-slate-200 text-sm font-semibold tabular-nums">
            {fmtWeight(session.bestSet.weight, unit)} &times; {session.bestSet.reps}
          </p>
        )}
        <p className="text-slate-500 text-xs">
          {session.sets.length} {session.sets.length === 1 ? 'set' : 'sets'}
          {volDisplay > 0 && ` · ${volDisplay.toLocaleString()} ${unit} vol`}
        </p>
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExerciseDetail() {
  const { name: rawName } = useParams()
  let exerciseName = ''
  if (rawName) {
    try { exerciseName = decodeURIComponent(rawName) } catch { exerciseName = rawName }
  }

  const location = useLocation()
  const workoutId = location.state?.workoutId ?? null

  const { unit } = useUnitStore()
  const { sessions, allTimeBest, bestVolumeSession, isLoading } =
    useExerciseStats(exerciseName)

  if (isLoading) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8">
        <BackLink workoutId={workoutId} />
        <Spinner />
      </div>
    )
  }

  const bestSetDisplay = allTimeBest
    ? `${toDisplay(allTimeBest.weight, unit)} ${unit} × ${allTimeBest.reps}`
    : '—'

  const bestVolDisplay = bestVolumeSession
    ? `${(unit === 'lbs'
        ? Math.round(bestVolumeSession.totalVolume * 2.2046)
        : bestVolumeSession.totalVolume
      ).toLocaleString()} ${unit}`
    : '—'

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-2xl">
        {/* Back + unit toggle in one row */}
        <div className="flex items-center justify-between mb-6">
          <BackLink workoutId={workoutId} />
          <UnitToggle />
        </div>

        <h1 className="text-2xl font-bold text-slate-100 mb-6">
          {exerciseName || 'Exercise'}
        </h1>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-slate-300 font-semibold text-lg mb-1">No data yet</p>
            <p className="text-slate-500 text-sm mb-6 max-w-xs">
              Every time you log <strong className="text-slate-300">{exerciseName || 'this exercise'}</strong> in
              a workout and finish it, a new data point appears here.
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
          <>
            {/* Personal Bests */}
            <section className="mb-8">
              <h2 className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                Personal Bests
              </h2>
              <div className="flex gap-3">
                <StatCard
                  label="Best Set"
                  primary={bestSetDisplay}
                  secondary={allTimeBest ? formatLong(allTimeBest.date) : null}
                />
                <StatCard
                  label="Best Volume Session"
                  primary={bestVolDisplay}
                  secondary={bestVolumeSession ? formatLong(bestVolumeSession.date) : null}
                />
              </div>
            </section>

            {/* Progress chart */}
            <section className="mb-8">
              <h2 className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                Progress Over Time
              </h2>
              <div className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-4">
                <ProgressChart sessions={sessions} unit={unit} />
              </div>
            </section>

            {/* Session history */}
            <section>
              <h2 className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                Session History
              </h2>
              <ul className="space-y-2">
                {sessions.map((session) => (
                  <li key={`${session.workoutId}-${session.date}`}>
                    <SessionRow session={session} unit={unit} />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
