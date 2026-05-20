import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import useAuthStore from '../store/authStore'
import { db } from '../db/db'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const stats = useLiveQuery(async () => {
    if (!user?.id) return null
    const workouts = await db.workouts.where('userId').equals(user.id).toArray()
    const workoutIds = workouts.map((w) => w.id)
    let totalSets = 0
    for (const wid of workoutIds) {
      const exercises = await db.exercises.where('workoutId').equals(wid).toArray()
      for (const ex of exercises) {
        totalSets += await db.sets.where('exerciseId').equals(ex.id).count()
      }
    }
    return { workoutCount: workouts.length, totalSets }
  }, [user?.id])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-sm">
        <h1 className="text-2xl font-bold text-slate-100 mb-8">Profile</h1>

        {/* Avatar + username */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
            <span className="text-brand-400 text-2xl font-bold uppercase">
              {user?.username?.[0] ?? '?'}
            </span>
          </div>
          <div>
            <p className="text-slate-100 font-bold text-xl">{user?.username}</p>
            <p className="text-slate-500 text-sm mt-0.5">Local account</p>
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
