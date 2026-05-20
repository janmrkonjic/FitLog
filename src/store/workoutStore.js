import { create } from 'zustand'

let _uid = 1
const uid = () => _uid++

const makeSet = () => ({
  tempId: uid(),
  weight: '', reps: '',
  leftWeight: '', leftReps: '',
  rightWeight: '', rightReps: '',
})
const makeExercise = () => ({ tempId: uid(), name: '', sets: [makeSet()], perHand: false })

const useWorkoutStore = create((set) => ({
  workoutName: '',
  exercises: [],
  workoutStartTime: null,  // Date.now() timestamp, null = not yet started
  planSessionId: null,     // when set, this workout fulfils a plan session
  planMeta: null,          // { planName, weekNumber, sessionInWeek, frequencyPerWeek }

  startWorkout: () => set({ workoutStartTime: Date.now() }),

  // Prefill the store from a planned session. `name` is the workout name,
  // `prefilled` is [{ name, perHand, sets: [{ weight, reps }] }] already in
  // the user's display unit. Replaces any in-progress workout state.
  prefillFromPlan: (planSessionId, planMeta, name, prefilled) =>
    set({
      planSessionId,
      planMeta,
      workoutName: name,
      workoutStartTime: null,
      exercises: prefilled.map((e) => ({
        tempId: uid(),
        name: e.name,
        perHand: !!e.perHand,
        sets: e.sets.map((s) => ({
          tempId: uid(),
          weight: e.perHand ? '' : (s.weight ?? ''),
          reps:   e.perHand ? '' : (s.reps ?? ''),
          leftWeight:  e.perHand ? (s.weight ?? '') : '',
          leftReps:    e.perHand ? (s.reps ?? '') : '',
          rightWeight: e.perHand ? (s.weight ?? '') : '',
          rightReps:   e.perHand ? (s.reps ?? '') : '',
        })),
      })),
    }),

  setWorkoutName: (name) => set({ workoutName: name }),

  addExercise: () =>
    set((state) => ({ exercises: [...state.exercises, makeExercise()] })),

  removeExercise: (exTempId) =>
    set((state) => ({
      exercises: state.exercises.filter((e) => e.tempId !== exTempId),
    })),

  updateExerciseName: (exTempId, name) =>
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.tempId === exTempId ? { ...e, name } : e
      ),
    })),

  togglePerHand: (exTempId) =>
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.tempId === exTempId ? { ...e, perHand: !e.perHand } : e
      ),
    })),

  addSet: (exTempId) =>
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.tempId === exTempId ? { ...e, sets: [...e.sets, makeSet()] } : e
      ),
    })),

  removeSet: (exTempId, setTempId) =>
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.tempId === exTempId
          ? { ...e, sets: e.sets.filter((s) => s.tempId !== setTempId) }
          : e
      ),
    })),

  updateSet: (exTempId, setTempId, field, value) =>
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.tempId === exTempId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.tempId === setTempId ? { ...s, [field]: value } : s
              ),
            }
          : e
      ),
    })),

  resetWorkout: () => set({
    workoutName: '',
    exercises: [],
    workoutStartTime: null,
    planSessionId: null,
    planMeta: null,
  }),
}))

export default useWorkoutStore
