import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fetch a full plan by id: plan + plan_workouts (sorted by week then order) + plan_exercises.
 *
 * plan shape:
 *   {
 *     id, name, duration_weeks, start_date, status, created_at,
 *     plan_workouts: [{
 *       id, name, week_number, order, session_date, status,
 *       completed_workout_id, source_workout_id,
 *       plan_exercises: [{ id, name, per_hand, sets_count,
 *                           baseline_weight_kg, baseline_reps, weekly_increment_kg, order }]
 *     }]
 *   }
 */
export function usePlan(planId) {
  const [plan,      setPlan]      = useState(undefined)
  const [error,     setError]     = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    if (!planId) { setPlan(null); return }
    let cancelled = false
    setPlan(undefined)
    setError(null)

    ;(async () => {
      const { data, error } = await supabase
        .from('plans')
        .select(`
          id, name, duration_weeks, start_date, status, created_at,
          plan_workouts (
            id, name, week_number, order, session_date, status,
            completed_workout_id, source_workout_id,
            plan_exercises (
              id, name, per_hand, sets_count,
              baseline_weight_kg, baseline_reps, weekly_increment_kg, order
            )
          )
        `)
        .eq('id', planId)
        .single()

      if (cancelled) return
      if (error) { setError(error); setPlan(null); return }

      // Sort plan_workouts: week_number → session_date (nulls last) → order
      data.plan_workouts.sort((a, b) => {
        if (a.week_number !== b.week_number) return a.week_number - b.week_number
        if (a.session_date && b.session_date) return a.session_date.localeCompare(b.session_date)
        if (a.session_date) return -1
        if (b.session_date) return 1
        return (a.order ?? 0) - (b.order ?? 0)
      })
      for (const pw of data.plan_workouts) {
        pw.plan_exercises.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      }

      setPlan(data)
    })().catch((err) => { if (!cancelled) { setError(err); setPlan(null) } })

    return () => { cancelled = true }
  }, [planId, reloadKey])

  return { plan, isLoading: plan === undefined, error, refresh }
}
