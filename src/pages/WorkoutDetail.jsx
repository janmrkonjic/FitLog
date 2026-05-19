import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import useUnitStore, { fmtWeight } from '../store/unitStore'
import { formatDuration } from './History'

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/history"
      className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
      </svg>
      History
    </Link>
  )
}

function ExerciseTable({ exercise, workoutId, unit }) {
  const validWeights = exercise.sets.map((s) => s.weight).filter((w) => w > 0)
  const bestWeight   = validWeights.length > 0 ? Math.max(...validWeights) : null

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="mb-3">
        {exercise.name ? (
          <Link
            to={`/exercise/${encodeURIComponent(exercise.name)}`}
            state={{ workoutId }}
            className="text-slate-100 font-semibold text-base hover:text-brand-400 transition-colors inline-flex items-center gap-1.5 group"
          >
            {exercise.name}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand-500 transition-colors">
              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </Link>
        ) : (
          <h2 className="text-slate-100 font-semibold text-base">Unnamed Exercise</h2>
        )}
      </div>

      {exercise.sets.length === 0 ? (
        <p className="text-slate-500 text-sm">No sets recorded.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-700">
              <th className="pb-2 pr-4 text-left font-medium w-10">Set</th>
              <th className="pb-2 pr-4 text-right font-medium">Weight</th>
              <th className="pb-2 pr-4 text-right font-medium">Reps</th>
              <th className="pb-2 w-16 text-right font-medium">Best</th>
            </tr>
          </thead>
          <tbody>
            {exercise.sets.map((set) => {
              const isBest = bestWeight !== null && set.weight === bestWeight
              return (
                <tr key={set.id} className={isBest ? 'text-brand-400' : 'text-slate-300'}>
                  <td className="py-1.5 pr-4 font-mono text-slate-400 text-xs">{set.setNumber}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">
                    {set.weight > 0
                      ? fmtWeight(set.weight, unit)
                      : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">
                    {set.reps > 0 ? set.reps : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="py-1.5 text-right">
                    {isBest && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full px-2 py-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M8 1.75a.75.75 0 0 1 .692.462l1.41 3.393 3.664.293a.75.75 0 0 1 .428 1.317l-2.791 2.39.853 3.575a.75.75 0 0 1-1.12.814L8 11.944l-3.136 1.05a.75.75 0 0 1-1.12-.814l.853-3.576-2.79-2.39a.75.75 0 0 1 .427-1.316l3.663-.293 1.41-3.393A.75.75 0 0 1 8 1.75Z" clipRule="evenodd" />
                        </svg>
                        Best
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function DeleteButton({ onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleClick = () => {
    if (!confirming) {
      setConfirming(true)
      timerRef.current = setTimeout(() => setConfirming(false), 3000)
    } else {
      clearTimeout(timerRef.current)
      onDelete()
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full py-3 rounded-xl border font-medium text-sm transition-colors ${
        confirming
          ? 'border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20'
          : 'border-slate-700 text-slate-400 hover:border-red-500/60 hover:text-red-400'
      }`}
    >
      {confirming ? 'Tap again to confirm delete' : 'Delete Workout'}
    </button>
  )
}

export default function WorkoutDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const workoutId = parseInt(id, 10)
  const { unit }  = useUnitStore()

  const data = useLiveQuery(async () => {
    const workout = await db.workouts.get(workoutId)
    if (!workout) return null

    const exercises = await db.exercises
      .where('workoutId').equals(workoutId).sortBy('order')

    const exercisesWithSets = await Promise.all(
      exercises.map(async (exercise) => ({
        ...exercise,
        sets: await db.sets.where('exerciseId').equals(exercise.id).sortBy('setNumber'),
      }))
    )

    return { workout, exercises: exercisesWithSets }
  }, [workoutId])

  const handleDelete = async () => {
    const exercises  = await db.exercises.where('workoutId').equals(workoutId).toArray()
    const exerciseIds = exercises.map((e) => e.id)
    if (exerciseIds.length > 0) {
      await db.sets.where('exerciseId').anyOf(exerciseIds).delete()
    }
    await db.exercises.where('workoutId').equals(workoutId).delete()
    await db.workouts.delete(workoutId)
    navigate('/history')
  }

  if (data === undefined) {
    return <div className="px-4 py-6 md:px-8 md:py-8"><BackLink /><Spinner /></div>
  }

  if (data === null) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8">
        <BackLink />
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-slate-300 font-semibold text-lg mb-2">Workout not found</p>
          <p className="text-slate-500 text-sm mb-6">This workout may have been deleted.</p>
          <Link to="/history" className="text-brand-400 hover:text-brand-300 text-sm font-medium">
            Back to History
          </Link>
        </div>
      </div>
    )
  }

  const { workout, exercises } = data
  const duration = formatDuration(workout.durationMinutes)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-2xl">
        <BackLink />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">{workout.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-slate-400 text-sm">{formatDate(workout.date)}</p>
            {duration && (
              <>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-slate-500 text-sm">{duration}</span>
              </>
            )}
          </div>
        </div>

        {exercises.length === 0 ? (
          <p className="text-slate-500 text-sm">No exercises recorded for this workout.</p>
        ) : (
          <div className="space-y-4 mb-8">
            {exercises.map((exercise) => (
              <ExerciseTable
                key={exercise.id}
                exercise={exercise}
                workoutId={workoutId}
                unit={unit}
              />
            ))}
          </div>
        )}

        <DeleteButton onDelete={handleDelete} />
      </div>
    </div>
  )
}
