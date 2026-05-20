import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export function formatDuration(minutes) {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-slate-500">
          <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0 1 18 9.375v9.375a3 3 0 0 0 3-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 0 0-.673-.05A3 3 0 0 0 15 1.5h-1.5a3 3 0 0 0-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6ZM13.5 3A1.5 1.5 0 0 0 12 4.5h4.5A1.5 1.5 0 0 0 15 3h-1.5Z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V9.375Z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-slate-300 font-semibold text-lg mb-1">No workouts yet</p>
      <p className="text-slate-500 text-sm mb-6">Log your first session to start tracking progress.</p>
      <Link
        to="/new"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Start your first workout
      </Link>
    </div>
  )
}

export function WorkoutCard({ workout }) {
  const duration = formatDuration(workout.duration_minutes)
  return (
    <Link
      to={`/workout/${workout.id}`}
      className="flex items-center justify-between gap-4 bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 hover:border-brand-500/60 hover:bg-slate-800/80 transition-colors group"
    >
      <div className="min-w-0">
        <p className="text-slate-100 font-semibold text-base truncate group-hover:text-brand-400 transition-colors">
          {workout.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-slate-400 text-sm">{formatDate(workout.date)}</p>
          {duration && (
            <>
              <span className="text-slate-600 text-xs">·</span>
              <span className="text-slate-500 text-sm">{duration}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-slate-400 text-sm">
          {workout.exerciseCount}{' '}
          {workout.exerciseCount === 1 ? 'exercise' : 'exercises'}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-600 group-hover:text-brand-500 transition-colors">
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </div>
    </Link>
  )
}

async function fetchWorkouts() {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, name, date, duration_minutes, exercises(id)')
    .order('date', { ascending: false })

  if (error) throw error

  return data.map((w) => ({ ...w, exerciseCount: w.exercises?.length ?? 0 }))
}

export default function History() {
  const [searchQuery, setSearchQuery] = useState('')
  const [workouts,    setWorkouts]    = useState(undefined)

  useEffect(() => {
    fetchWorkouts().then(setWorkouts).catch(console.error)
  }, [])

  const q = searchQuery.trim().toLowerCase()
  const filtered = workouts?.filter((w) => !q || w.name.toLowerCase().includes(q)) ?? []

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">History</h1>

      {workouts === undefined ? (
        <Spinner />
      ) : workouts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="max-w-2xl space-y-4">
          {/* Search */}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              placeholder="Search workouts…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            )}
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              No workouts match &ldquo;{searchQuery}&rdquo;.
            </p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((workout) => (
                <li key={workout.id}>
                  <WorkoutCard workout={workout} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
