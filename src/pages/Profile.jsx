import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    async function load() {
      const { count: workoutCount } = await supabase
        .from('workouts')
        .select('id', { count: 'exact', head: true })

      const { data: exercises } = await supabase
        .from('exercises')
        .select('id')

      let totalSets = 0
      if (exercises?.length) {
        const { count } = await supabase
          .from('sets')
          .select('id', { count: 'exact', head: true })
          .in('exercise_id', exercises.map((e) => e.id))
        totalSets = count ?? 0
      }

      setStats({ workoutCount: workoutCount ?? 0, totalSets })
    }
    load().catch(console.error)
  }, [user?.id])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? '?'
  const displayName  = user?.email ?? ''

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-sm">
        <h1 className="text-2xl font-bold text-slate-100 mb-8">Profile</h1>

        {/* Avatar + email */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
            <span className="text-brand-400 text-2xl font-bold">{avatarLetter}</span>
          </div>
          <div>
            <p className="text-slate-100 font-bold text-base break-all">{displayName}</p>
            <p className="text-slate-500 text-sm mt-0.5">Synced account</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Workouts</p>
              <p className="text-slate-100 font-bold text-2xl">{stats.workoutCount}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Total Sets</p>
              <p className="text-slate-100 font-bold text-2xl">{stats.totalSets}</p>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 font-semibold text-sm transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
