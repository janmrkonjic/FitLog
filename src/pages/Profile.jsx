import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { supabase } from '../lib/supabase'

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M2.695 14.763l-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
    </svg>
  )
}

function ExercisesSection({ userId }) {
  const [names, setNames]     = useState(null)  // string[] sorted, excluding hidden
  const [editing, setEditing] = useState(null)  // { original: string, value: string }
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!userId) return
    const [{ data: rows }, { data: hidden }] = await Promise.all([
      supabase.from('exercises').select('name, workouts!inner(user_id)').eq('workouts.user_id', userId),
      supabase.from('hidden_exercise_names').select('name_lower').eq('user_id', userId),
    ])
    const hiddenSet = new Set((hidden ?? []).map((h) => h.name_lower))
    const seen = new Map() // lower -> canonical
    for (const r of rows ?? []) {
      const raw = (r.name || '').trim()
      if (!raw) continue
      const key = raw.toLowerCase()
      if (hiddenSet.has(key)) continue
      if (!seen.has(key)) seen.set(key, raw)
    }
    setNames([...seen.values()].sort((a, b) => a.localeCompare(b)))
  }, [userId])

  useEffect(() => { load().catch(console.error) }, [load])

  const startEdit = (name) => {
    setError(null)
    setEditing({ original: name, value: name })
  }

  const cancelEdit = () => {
    setEditing(null)
    setError(null)
  }

  const saveEdit = async () => {
    if (!editing) return
    const newName = editing.value.trim()
    if (!newName) { setError('Name cannot be empty.'); return }
    if (newName.toLowerCase() === editing.original.toLowerCase()) {
      setEditing(null)
      return
    }
    setBusy(true)
    setError(null)
    try {
      // Get this user's exercise ids whose name matches the old name (case-insensitive)
      const { data: rows, error: fetchErr } = await supabase
        .from('exercises')
        .select('id, name, workouts!inner(user_id)')
        .eq('workouts.user_id', userId)
        .ilike('name', editing.original)
      if (fetchErr) throw fetchErr
      const ids = (rows ?? []).map((r) => r.id)
      if (ids.length > 0) {
        const { error: updErr } = await supabase
          .from('exercises')
          .update({ name: newName })
          .in('id', ids)
        if (updErr) throw updErr
      }
      // If the new name was previously hidden, un-hide it so it shows up again.
      await supabase
        .from('hidden_exercise_names')
        .delete()
        .eq('user_id', userId)
        .eq('name_lower', newName.toLowerCase())

      setEditing(null)
      await load()
    } catch (e) {
      setError(e.message || 'Failed to rename.')
    } finally {
      setBusy(false)
    }
  }

  const hideName = async (name) => {
    setBusy(true)
    setError(null)
    try {
      const { error: insErr } = await supabase
        .from('hidden_exercise_names')
        .upsert({ user_id: userId, name_lower: name.toLowerCase() })
      if (insErr) throw insErr
      await load()
    } catch (e) {
      setError(e.message || 'Failed to remove.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-8">
      <h2 className="text-slate-100 font-semibold text-base mb-3">Your Exercises</h2>
      <p className="text-slate-500 text-xs mb-3">
        These names appear in the autocomplete when you log a workout. Renaming updates all past workouts.
        Removing only hides the name from autocomplete — your history is kept.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {names === null ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : names.length === 0 ? (
        <p className="text-slate-500 text-sm bg-slate-800 border border-slate-700 rounded-xl px-4 py-4">
          No exercises yet. Log a workout to start building your list.
        </p>
      ) : (
        <ul className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700/70 overflow-hidden">
          {names.map((name) => {
            const isEditing = editing?.original === name
            return (
              <li key={name} className="px-3 py-2.5 flex items-center gap-2">
                {isEditing ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      value={editing.value}
                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        else if (e.key === 'Escape') cancelEdit()
                      }}
                      disabled={busy}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                    />
                    <button
                      onClick={saveEdit}
                      disabled={busy}
                      className="text-xs font-medium px-2.5 py-1 rounded bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={busy}
                      className="text-xs font-medium px-2.5 py-1 rounded border border-slate-600 text-slate-300 hover:text-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-slate-200 text-sm truncate">{name}</span>
                    <button
                      onClick={() => startEdit(name)}
                      disabled={busy}
                      className="text-slate-500 hover:text-brand-400 transition-colors p-1"
                      aria-label={`Rename ${name}`}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => hideName(name)}
                      disabled={busy}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      aria-label={`Remove ${name} from autocomplete`}
                    >
                      <TrashIcon />
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

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

        <ExercisesSection userId={user?.id} />

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
