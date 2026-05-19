import { create } from 'zustand'

let _uid = 1
const uid = () => _uid++

const makeSet = () => ({ tempId: uid(), weight: '', reps: '' })
const makeExercise = () => ({ tempId: uid(), name: '', sets: [makeSet()] })

const useWorkoutStore = create((set) => ({
  workoutName: '',
  exercises: [],
  workoutStartTime: null,  // Date.now() timestamp, null = not yet started

  startWorkout: () => set({ workoutStartTime: Date.now() }),

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

  resetWorkout: () => set({ workoutName: '', exercises: [], workoutStartTime: null }),
}))

export default useWorkoutStore
