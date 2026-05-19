import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

const EMPTY = { sessions: [], allTimeBest: null, bestVolumeSession: null }

export function useExerciseStats(exerciseName) {
  const result = useLiveQuery(async () => {
    if (!exerciseName) return EMPTY

    const needle = exerciseName.toLowerCase().trim()
    const exercises = (await db.exercises.toArray()).filter(
      (e) => (e.name ?? '').toLowerCase().trim() === needle
    )

    if (exercises.length === 0) return EMPTY

    const sessions = (
      await Promise.all(
        exercises.map(async (exercise) => {
          const workout = await db.workouts.get(exercise.workoutId)
          if (!workout) return null

          const sets = await db.sets
            .where('exerciseId')
            .equals(exercise.id)
            .sortBy('setNumber')

          // Best set = highest weight; tie-break by most reps
          const bestSet = sets.reduce((best, s) => {
            if (!best) return s
            if (s.weight > best.weight) return s
            if (s.weight === best.weight && s.reps > best.reps) return s
            return best
          }, null)

          const totalVolume = sets.reduce(
            (sum, s) => sum + (s.weight || 0) * (s.reps || 0),
            0
          )

          return {
            workoutId: workout.id,
            workoutName: workout.name,
            date: workout.date,
            sets,
            bestSet: bestSet
              ? { weight: bestSet.weight, reps: bestSet.reps, date: workout.date }
              : null,
            totalVolume,
          }
        })
      )
    ).filter(Boolean)

    // Newest first for display
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date))

    const allTimeBest = sessions.reduce((best, session) => {
      if (!session.bestSet) return best
      if (!best) return session.bestSet
      if (session.bestSet.weight > best.weight) return session.bestSet
      if (session.bestSet.weight === best.weight && session.bestSet.reps > best.reps)
        return session.bestSet
      return best
    }, null)

    const bestVolumeSession = sessions.reduce((best, session) => {
      if (!best || session.totalVolume > best.totalVolume)
        return { totalVolume: session.totalVolume, date: session.date }
      return best
    }, null)

    return { sessions, allTimeBest, bestVolumeSession }
  }, [exerciseName])

  return {
    ...(result ?? EMPTY),
    isLoading: result === undefined,
  }
}
