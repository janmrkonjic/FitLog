import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useWorkoutStore from '../store/workoutStore'
import useUnitStore from '../store/unitStore'
import { db } from '../db/db'

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
  )
}

// ── SetRow ────────────────────────────────────────────────────────────────────

function SetRow({ exTempId, set, index, onUpdate, onRemove, isOnly, isLast,
                  onWeightRef, onTabFromLastReps, invalidIds, unit }) {
  const weightInvalid = invalidIds.has(set.tempId) && set.weight === ''
  const repsInvalid   = invalidIds.has(set.tempId) && set.reps === ''

  const inputBase = 'bg-slate-700 rounded px-2 py-1 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 text-right border'
  const weightCls = `w-20 ${inputBase} ${weightInvalid ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-brand-500 focus:border-brand-500'}`
  const repsCls   = `w-16 ${inputBase} ${repsInvalid   ? 'border-red-500 focus:ring-red-500' : 'border-slate-600 focus:ring-brand-500 focus:border-brand-500'}`

  return (
    <tr>
      <td className="py-1.5 pr-3 text-sm text-slate-400 w-8 text-center font-mono select-none">
        {index + 1}
      </td>
      <td className="py-1.5 pr-2">
        <div className="flex items-center gap-1">
          <input
            ref={onWeightRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            placeholder="0"
            value={set.weight}
            onChange={(e) => onUpdate(exTempId, set.tempId, 'weight', e.target.value)}
            className={weightCls}
          />
          <span className="text-xs text-slate-500">{unit}</span>
        </div>
      </td>
      <td className="py-1.5 pr-2">
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="0"
            value={set.reps}
            onChange={(e) => onUpdate(exTempId, set.tempId, 'reps', e.target.value)}
            onKeyDown={(e) => {
              if (isLast && e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault()
                onTabFromLastReps()
              }
            }}
            className={repsCls}
          />
          <span className="text-xs text-slate-500">reps</span>
        </div>
      </td>
      <td className="py-1.5 w-8 text-right">
        <button
          onClick={() => onRemove(exTempId, set.tempId)}
          disabled={isOnly}
          tabIndex={-1}
          className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label="Remove set"
        >
          <TrashIcon />
        </button>
      </td>
    </tr>
  )
}

// ── ExerciseBlock ─────────────────────────────────────────────────────────────

function ExerciseBlock({ exercise, onUpdateName, onAddSet, onRemoveSet, onUpdateSet,
                         onRemove, invalidIds, unit }) {
  const nameInputRef  = useRef(null)
  const weightRefsMap = useRef(new Map())
  const prevSetsLen   = useRef(exercise.sets.length)
  const didMount      = useRef(false)

  // Auto-focus name input when a new exercise block is first added
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      nameInputRef.current?.focus()
    }
  }, [])

  // Auto-focus last weight input when a new set is appended
  useEffect(() => {
    if (exercise.sets.length > prevSetsLen.current) {
      const lastSet = exercise.sets[exercise.sets.length - 1]
      weightRefsMap.current.get(lastSet.tempId)?.focus()
    }
    prevSetsLen.current = exercise.sets.length
  }, [exercise.sets.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSet = () => onAddSet(exercise.tempId)

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      {/* Exercise header */}
      <div className="flex items-start gap-2 mb-4">
        <input
          ref={nameInputRef}
          type="text"
          placeholder="Exercise name (required for stats)"
          value={exercise.name}
          onChange={(e) => onUpdateName(exercise.tempId, e.target.value)}
          className="flex-1 bg-transparent text-slate-100 font-semibold text-base placeholder-slate-500 focus:outline-none border-b border-transparent focus:border-brand-500 pb-0.5 transition-colors"
        />
        <button
          onClick={() => onRemove(exercise.tempId)}
          tabIndex={-1}
          className="text-slate-600 hover:text-red-400 transition-colors mt-0.5 shrink-0"
          aria-label="Remove exercise"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Sets table */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wide">
              <th className="pb-2 pr-3 text-center font-medium w-8">#</th>
              <th className="pb-2 pr-2 text-left font-medium">Weight</th>
              <th className="pb-2 pr-2 text-left font-medium">Reps</th>
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {exercise.sets.map((set, idx) => (
              <SetRow
                key={set.tempId}
                exTempId={exercise.tempId}
                set={set}
                index={idx}
                isLast={idx === exercise.sets.length - 1}
                isOnly={exercise.sets.length === 1}
                onUpdate={onUpdateSet}
                onRemove={onRemoveSet}
                onWeightRef={(el) => {
                  if (el) weightRefsMap.current.set(set.tempId, el)
                  else weightRefsMap.current.delete(set.tempId)
                }}
                onTabFromLastReps={handleAddSet}
                invalidIds={invalidIds}
                unit={unit}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Add set */}
      <button
        onClick={handleAddSet}
        className="mt-3 flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Add Set
      </button>
    </div>
  )
}

// ── Live timer display ────────────────────────────────────────────────────────

function WorkoutTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startTime)

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000)
    return () => clearInterval(id)
  }, [startTime])

  const totalSec = Math.floor(elapsed / 1000)
  const h   = Math.floor(totalSec / 3600)
  const m   = Math.floor((totalSec % 3600) / 60)
  const s   = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  const label = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`

  return (
    <div className="flex items-center gap-1.5 text-slate-400 text-sm">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
      </svg>
      <span className="font-mono tabular-nums">{label}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewWorkout() {
  const navigate     = useNavigate()
  const nameInputRef = useRef(null)

  const { unit } = useUnitStore()

  const {
    workoutName, exercises, workoutStartTime,
    setWorkoutName, addExercise, removeExercise,
    updateExerciseName, addSet, removeSet, updateSet,
    startWorkout, resetWorkout,
  } = useWorkoutStore()

  const started = workoutStartTime !== null

  const [validationError, setValidationError] = useState(null)
  const [invalidIds,      setInvalidIds]      = useState(new Set())

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (invalidIds.size > 0) setInvalidIds(new Set())
    if (validationError)     setValidationError(null)
  }, [exercises]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinish = async () => {
    if (exercises.length === 0) {
      setValidationError('Add at least one exercise before finishing.')
      return
    }

    const bad = new Set()
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.weight === '' || s.reps === '') bad.add(s.tempId)
      }
    }
    if (bad.size > 0) {
      setInvalidIds(bad)
      setValidationError('Please fill in all set values before finishing.')
      return
    }

    setValidationError(null)
    setInvalidIds(new Set())

    const durationMinutes = workoutStartTime
      ? Math.round((Date.now() - workoutStartTime) / 60000)
      : null

    const workoutId = await db.workouts.add({
      name: workoutName.trim() || 'Untitled Workout',
      date: new Date().toISOString(),
      notes: '',
      durationMinutes: durationMinutes > 0 ? durationMinutes : null,
    })

    for (const [exIdx, exercise] of exercises.entries()) {
      const exerciseId = await db.exercises.add({
        workoutId,
        name: exercise.name.trim() || 'Unnamed Exercise',
        order: exIdx,
      })
      for (const [setIdx, s] of exercise.sets.entries()) {
        const kgValue = unit === 'lbs'
          ? Math.round((parseFloat(s.weight) / 2.2046) * 100) / 100
          : parseFloat(s.weight)
        await db.sets.add({
          exerciseId,
          setNumber: setIdx + 1,
          weight: kgValue || 0,
          reps: parseInt(s.reps, 10) || 0,
        })
      }
    }

    resetWorkout()
    navigate('/history')
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-2xl">

        {/* Workout name + live timer */}
        <div className="mb-8">
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Workout name..."
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="w-full bg-transparent text-3xl font-bold text-slate-100 placeholder-slate-700 focus:outline-none border-b-2 border-transparent focus:border-brand-500 pb-1 transition-colors"
          />
          {started && (
            <div className="mt-2">
              <WorkoutTimer startTime={workoutStartTime} />
            </div>
          )}
        </div>

        {/* Exercise list */}
        {exercises.length > 0 && (
          <div className="space-y-4 mb-6">
            {exercises.map((exercise) => (
              <ExerciseBlock
                key={exercise.tempId}
                exercise={exercise}
                onUpdateName={updateExerciseName}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                onUpdateSet={updateSet}
                onRemove={removeExercise}
                invalidIds={invalidIds}
                unit={unit}
              />
            ))}
          </div>
        )}

        {/* Add exercise */}
        <button
          onClick={addExercise}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-700 text-slate-400 hover:border-brand-500 hover:text-brand-400 font-medium text-sm transition-colors mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add Exercise
        </button>

        {/* Validation error */}
        {validationError && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400 mt-0.5 shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <p className="text-red-400 text-sm">{validationError}</p>
          </div>
        )}

        {/* Start / Finish */}
        {started ? (
          <button
            onClick={handleFinish}
            className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-base transition-colors"
          >
            Finish Workout
          </button>
        ) : (
          <button
            onClick={startWorkout}
            className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-base transition-colors"
          >
            Start Workout
          </button>
        )}

      </div>
    </div>
  )
}
