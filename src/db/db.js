import Dexie from 'dexie'

export const db = new Dexie('FitLogDB')

db.version(1).stores({
  workouts:  '++id, name, date, notes',
  exercises: '++id, workoutId, name, order',
  sets:      '++id, exerciseId, setNumber, weight, reps',
})

db.version(2).stores({
  users:     '++id, &username',
  workouts:  '++id, name, date, notes, userId',
  exercises: '++id, workoutId, name, order',
  sets:      '++id, exerciseId, setNumber, weight, reps',
})
