import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const EMPTY = { sessions: [], allTimeBest: null, bestVolumeSession: null }

export function useExerciseStats(exerciseName) {
  const [result, setResult] = useState(undefined)

  useEffect(() => {
    if (!exerciseName) { setResult(EMPTY); return }

    async function load() {
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select(`
          id,
          workout_id,
          workouts (id, name, date),
          sets (id, set_number, weight, reps, left_weight, left_reps, right_weight, right_reps)
        `)
        .ilike('name', exerciseName.trim())
        .order('set_number', { referencedTable: 'sets', ascending: true })

      if (error || !exercises) { setResult(EMPTY); return }

      const sessions = exercises
        .map((exercise) => {
          const workout = exercise.workouts
          if (!workout) return null

          const sets = (exercise.sets ?? [])
            .slice()
            .sort((a, b) => a.set_number - b.set_number)

          const bestSet = sets.reduce((best, s) => {
            if (!best) return s
            if (s.weight > best.weight) return s
            if (s.weight === best.weight && s.reps > best.reps) return s
            if (s.weight === best.weight && s.reps === best.reps) return s
            return best
          }, null)

          const totalVolume = sets.reduce((sum, s) => {
            if (s.left_weight != null) {
              return sum + (s.left_weight || 0) * (s.left_reps || 0)
                         + (s.right_weight || 0) * (s.right_reps || 0)
            }
            return sum + (s.weight || 0) * (s.reps || 0)
          }, 0)

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
        .filter(Boolean)

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

      setResult({ sessions, allTimeBest, bestVolumeSession })
    }

    load().catch(() => setResult(EMPTY))
  }, [exerciseName])

  return {
    ...(result ?? EMPTY),
    isLoading: result === undefined,
  }
}
