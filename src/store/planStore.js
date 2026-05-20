import { create } from 'zustand'
import { classifyIncrement } from '../lib/planMath'

let _uid = 1
const uid = () => _uid++

const todayIso = () => new Date().toISOString().slice(0, 10)

/**
 * Return deduplicated exercises across all week slots.
 * Keyed by exercise name (first occurrence wins for perHand).
 * Returns [{ name, perHand }]
 */
export function getUniqueExercises(weeks) {
  const seen = new Map()
  for (const week of weeks) {
    for (const slot of week) {
      for (const ex of slot.exercises) {
        if (!seen.has(ex.name)) seen.set(ex.name, { name: ex.name, perHand: !!ex.perHand })
      }
    }
  }
  return [...seen.values()]
}

function makeWeeks(n) {
  return Array.from({ length: n }, () => [])
}

const initial = {
  name: '',
  durationWeeks: 3,
  startDate: todayIso(),
  step: 1,
  weeks: makeWeeks(3), // weeks[i] = [{ tempId, sourceWorkoutId, name, exercises: [{name, perHand}] }]
  exerciseBaselines: {}, // { [exerciseName]: { baselineWeightKg, baselineReps, setsCount, weeklyIncrementKg, perHand } }
}

const usePlanStore = create((set, get) => ({
  ...initial,

  setName: (name) => set({ name }),

  setDurationWeeks: (n) => {
    const count = Math.max(1, Math.min(5, Number(n) || 1))
    set((state) => {
      const existing = state.weeks
      const updated = Array.from({ length: count }, (_, i) => existing[i] ?? [])
      return { durationWeeks: count, weeks: updated }
    })
  },

  setStartDate: (startDate) => set({ startDate }),
  setStep: (step) => set({ step }),

  reset: () => set({ ...initial, startDate: todayIso(), weeks: makeWeeks(3) }),

  // Step 2 — add a workout slot to a specific week.
  // exercises: [{ name: string, perHand: bool }]
  addSlotToWeek: (weekIdx, { sourceWorkoutId, name, exercises }) =>
    set((state) => {
      const weeks = state.weeks.map((w, i) =>
        i === weekIdx
          ? [...w, { tempId: uid(), sourceWorkoutId, name, exercises }]
          : w
      )
      return { weeks }
    }),

  removeSlotFromWeek: (weekIdx, slotTempId) =>
    set((state) => ({
      weeks: state.weeks.map((w, i) =>
        i === weekIdx ? w.filter((s) => s.tempId !== slotTempId) : w
      ),
    })),

  // Step 3 — seed baselines for exercises that don't have one yet.
  // baselines: { [name]: { baselineWeightKg, baselineReps, setsCount, weeklyIncrementKg, perHand } }
  initExerciseBaselines: (baselines) =>
    set((state) => ({
      exerciseBaselines: { ...baselines, ...state.exerciseBaselines },
    })),

  setExerciseBaseline: (name, field, value) =>
    set((state) => ({
      exerciseBaselines: {
        ...state.exerciseBaselines,
        [name]: { ...state.exerciseBaselines[name], [field]: value },
      },
    })),

  baselinesValid: () => {
    const { weeks, exerciseBaselines } = get()
    const unique = getUniqueExercises(weeks)
    if (unique.length === 0) return false
    return unique.every(({ name }) => {
      const b = exerciseBaselines[name]
      if (!b) return false
      if (b.baselineWeightKg === '' || b.baselineWeightKg === null || b.baselineWeightKg === undefined) return false
      if (!Number(b.baselineReps) || Number(b.baselineReps) <= 0) return false
      if (!Number(b.setsCount)    || Number(b.setsCount)    <= 0) return false
      return true
    })
  },

  hasAnySlot: () => get().weeks.some((w) => w.length > 0),
}))

export default usePlanStore
