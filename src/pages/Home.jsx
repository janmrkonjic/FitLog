import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { WorkoutCard, formatDuration } from './History'
import useAuthStore from '../store/authStore'

// ── Install banner ────────────────────────────────────────────────────────────

function InstallBanner() {
  const [prompt,    setPrompt]    = useState(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('fitlog_install_dismissed') === 'true'
  )

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (dismissed || !prompt) return null

  const handleInstall = async () => {
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    setPrompt(null)
    if (outcome === 'accepted') dismiss()
  }

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem('fitlog_install_dismissed', 'true')
  }

  return (
    <div className="flex items-center gap-3 bg-brand-500/10 border border-brand-500/30 rounded-xl px-4 py-3 mb-6">
      <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-4 h-4">
          <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-100 text-sm font-medium">Add FitLog to your home screen</p>
        <p className="text-slate-400 text-xs mt-0.5">Install for the full app experience</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          Install
        </button>
        <button
          onClick={dismiss}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Welcome state ─────────────────────────────────────────────────────────────

function WelcomeState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-brand-400">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
        </svg>
      </div>
      <h2 className="text-slate-100 font-bold text-xl mb-2">Welcome to FitLog</h2>
      <p className="text-slate-400 text-sm mb-8 max-w-xs">
        Track your workouts, monitor progress, and hit new personal bests.
      </p>
      <Link
        to="/new"
        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Log your first workout
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const userId = useAuthStore((s) => s.user?.id)

  const recentWorkouts = useLiveQuery(async () => {
    const all = (await db.workouts.where('userId').equals(userId).toArray())
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3)
    return Promise.all(
      all.map(async (w) => ({
        ...w,
        exerciseCount: await db.exercises.where('workoutId').equals(w.id).count(),
      }))
    )
  }, [userId])

  const hasWorkouts = recentWorkouts && recentWorkouts.length > 0

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-2xl">
        <InstallBanner />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-100">FitLog</h1>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Start Workout
          </Link>
        </div>

        {/* Body */}
        {recentWorkouts === undefined ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasWorkouts ? (
          <WelcomeState />
        ) : (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                Recent Workouts
              </h2>
              <Link
                to="/history"
                className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                See all
              </Link>
            </div>
            <ul className="space-y-3">
              {recentWorkouts.map((workout) => (
                <li key={workout.id}>
                  <WorkoutCard workout={workout} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
