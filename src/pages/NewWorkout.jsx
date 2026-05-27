import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useWorkoutStore from "../store/workoutStore";
import useUnitStore from "../store/unitStore";
import useAuthStore from "../store/authStore";
import { supabase } from "../lib/supabase";

// ── ConfirmModal ──────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-slate-100 font-semibold text-lg mb-2">{title}</h2>
        <p className="text-slate-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-slate-100 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${
              danger
                ? "bg-red-600 hover:bg-red-500"
                : "bg-brand-500 hover:bg-brand-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ── SetRow ────────────────────────────────────────────────────────────────────

function SetRow({
  exTempId,
  set,
  index,
  onUpdate,
  onRemove,
  isOnly,
  isLast,
  onWeightRef,
  onTabFromLastReps,
  invalidIds,
  unit,
  perHand,
}) {
  const weightInvalid = invalidIds.has(set.tempId) && set.weight === "";
  const repsInvalid = invalidIds.has(set.tempId) && set.reps === "";
  const leftWeightInvalid = invalidIds.has(set.tempId) && set.leftWeight === "";
  const leftRepsInvalid = invalidIds.has(set.tempId) && set.leftReps === "";
  const rightWeightInvalid =
    invalidIds.has(set.tempId) && set.rightWeight === "";
  const rightRepsInvalid = invalidIds.has(set.tempId) && set.rightReps === "";

  const inputBase =
    "bg-slate-700 rounded px-2 py-1 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 text-right border";
  const cls = (invalid) =>
    `w-16 ${inputBase} ${invalid ? "border-red-500 focus:ring-red-500" : "border-slate-600 focus:ring-brand-500 focus:border-brand-500"}`;
  const weightCls = `w-20 ${inputBase} ${weightInvalid ? "border-red-500 focus:ring-red-500" : "border-slate-600 focus:ring-brand-500 focus:border-brand-500"}`;
  const repsCls = `w-16 ${inputBase} ${repsInvalid ? "border-red-500 focus:ring-red-500" : "border-slate-600 focus:ring-brand-500 focus:border-brand-500"}`;

  if (perHand) {
    return (
      <tr>
        <td className="py-1.5 pr-3 text-sm text-slate-400 w-8 text-center font-mono select-none">
          {index + 1}
        </td>
        {/* Left hand */}
        <td className="py-1.5 pr-1">
          <div className="flex items-center gap-1">
            <input
              ref={onWeightRef}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              placeholder="0"
              value={set.leftWeight}
              onChange={(e) =>
                onUpdate(exTempId, set.tempId, "leftWeight", e.target.value)
              }
              className={cls(leftWeightInvalid)}
            />
            <span className="text-xs text-slate-500">{unit}</span>
          </div>
        </td>
        <td className="py-1.5 pr-3">
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="0"
              value={set.leftReps}
              onChange={(e) =>
                onUpdate(exTempId, set.tempId, "leftReps", e.target.value)
              }
              className={cls(leftRepsInvalid)}
            />
            <span className="text-xs text-slate-500">reps</span>
          </div>
        </td>
        {/* Right hand */}
        <td className="py-1.5 pr-1">
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              placeholder="0"
              value={set.rightWeight}
              onChange={(e) =>
                onUpdate(exTempId, set.tempId, "rightWeight", e.target.value)
              }
              className={cls(rightWeightInvalid)}
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
              value={set.rightReps}
              onChange={(e) =>
                onUpdate(exTempId, set.tempId, "rightReps", e.target.value)
              }
              onKeyDown={(e) => {
                if (isLast && e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  onTabFromLastReps();
                }
              }}
              className={cls(rightRepsInvalid)}
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
    );
  }

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
            onChange={(e) =>
              onUpdate(exTempId, set.tempId, "weight", e.target.value)
            }
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
            onChange={(e) =>
              onUpdate(exTempId, set.tempId, "reps", e.target.value)
            }
            onKeyDown={(e) => {
              if (isLast && e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                onTabFromLastReps();
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
  );
}

// ── ExerciseBlock ─────────────────────────────────────────────────────────────

function ExerciseBlock({
  exercise,
  onUpdateName,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onRemove,
  onTogglePerHand,
  invalidIds,
  unit,
  nameSuggestions,
}) {
  const nameInputRef = useRef(null);
  const weightRefsMap = useRef(new Map());
  const prevSetsLen = useRef(exercise.sets.length);
  const didMount = useRef(false);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const query = exercise.name.trim().toLowerCase();
  const matches =
    query.length === 0
      ? []
      : nameSuggestions
          .filter(
            (n) => n.toLowerCase().includes(query) && n.toLowerCase() !== query,
          )
          .slice(0, 6);

  const showSuggestions = suggestOpen && matches.length > 0;

  const pickSuggestion = (name) => {
    onUpdateName(exercise.tempId, name);
    setSuggestOpen(false);
    setHighlightIdx(-1);
  };

  // Auto-focus name input when a new exercise block is first added
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      nameInputRef.current?.focus();
    }
  }, []);

  // Auto-focus last weight input when a new set is appended
  useEffect(() => {
    if (exercise.sets.length > prevSetsLen.current) {
      const lastSet = exercise.sets[exercise.sets.length - 1];
      weightRefsMap.current.get(lastSet.tempId)?.focus();
    }
    prevSetsLen.current = exercise.sets.length;
  }, [exercise.sets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSet = () => onAddSet(exercise.tempId);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      {/* Exercise header */}
      <div className="flex items-start gap-2 mb-3">
        <div className="flex-1 relative">
          <input
            ref={nameInputRef}
            type="text"
            placeholder="Exercise name (required for stats)"
            value={exercise.name}
            onChange={(e) => {
              onUpdateName(exercise.tempId, e.target.value);
              setSuggestOpen(true);
              setHighlightIdx(-1);
            }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 120)}
            onKeyDown={(e) => {
              if (!showSuggestions) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIdx((i) => (i + 1) % matches.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIdx((i) => (i <= 0 ? matches.length - 1 : i - 1));
              } else if (e.key === "Enter" || e.key === "Tab") {
                if (highlightIdx >= 0) {
                  e.preventDefault();
                  pickSuggestion(matches[highlightIdx]);
                }
              } else if (e.key === "Escape") {
                setSuggestOpen(false);
              }
            }}
            autoComplete="off"
            className="w-full bg-transparent text-slate-100 font-semibold text-base placeholder-slate-500 focus:outline-none border-b border-transparent focus:border-brand-500 pb-0.5 transition-colors"
          />
          {showSuggestions && (
            <ul className="absolute left-0 right-0 top-full mt-1 z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
              {matches.map((name, i) => (
                <li key={name}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickSuggestion(name);
                    }}
                    onMouseEnter={() => setHighlightIdx(i)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      i === highlightIdx
                        ? "bg-brand-500/20 text-brand-300"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={() => onRemove(exercise.tempId)}
          tabIndex={-1}
          className="text-slate-600 hover:text-red-400 transition-colors mt-0.5 shrink-0"
          aria-label="Remove exercise"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Per-hand toggle */}
      <div className="mb-3">
        <button
          onClick={() => onTogglePerHand(exercise.tempId)}
          tabIndex={-1}
          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
            exercise.perHand
              ? "border-brand-500 text-brand-400 bg-brand-500/10"
              : "border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-400"
          }`}
        >
          Per hand
        </button>
      </div>

      {/* Sets table */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full">
          <thead>
            {exercise.perHand ? (
              <tr className="text-xs text-slate-500 uppercase tracking-wide">
                <th className="pb-2 pr-3 text-center font-medium w-8">#</th>
                <th className="pb-2 pr-1 text-left font-medium text-brand-500/70">
                  L Weight
                </th>
                <th className="pb-2 pr-3 text-left font-medium text-brand-500/70">
                  L Reps
                </th>
                <th className="pb-2 pr-1 text-left font-medium text-slate-400">
                  R Weight
                </th>
                <th className="pb-2 pr-2 text-left font-medium text-slate-400">
                  R Reps
                </th>
                <th className="pb-2 w-8" />
              </tr>
            ) : (
              <tr className="text-xs text-slate-500 uppercase tracking-wide">
                <th className="pb-2 pr-3 text-center font-medium w-8">#</th>
                <th className="pb-2 pr-2 text-left font-medium">Weight</th>
                <th className="pb-2 pr-2 text-left font-medium">Reps</th>
                <th className="pb-2 w-8" />
              </tr>
            )}
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
                  if (el) weightRefsMap.current.set(set.tempId, el);
                  else weightRefsMap.current.delete(set.tempId);
                }}
                onTabFromLastReps={handleAddSet}
                invalidIds={invalidIds}
                unit={unit}
                perHand={exercise.perHand}
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Add Set
      </button>
    </div>
  );
}

// ── Live timer display ────────────────────────────────────────────────────────

function WorkoutTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startTime);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const totalSec = Math.floor(elapsed / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  const label = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return (
    <div className="flex items-center gap-1.5 text-slate-400 text-sm">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
          clipRule="evenodd"
        />
      </svg>
      <span className="font-mono tabular-nums">{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewWorkout() {
  const navigate = useNavigate();
  const nameInputRef = useRef(null);

  const { unit } = useUnitStore();
  const userId = useAuthStore((s) => s.user?.id);

  const {
    workoutName,
    exercises,
    workoutStartTime,
    setWorkoutName,
    addExercise,
    removeExercise,
    updateExerciseName,
    togglePerHand,
    addSet,
    removeSet,
    updateSet,
    startWorkout,
    resetWorkout,
  } = useWorkoutStore();

  const started = workoutStartTime !== null;

  const [validationError, setValidationError] = useState(null);
  const [invalidIds, setInvalidIds] = useState(new Set());
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'start' | 'finish' }
  const [nameSuggestions, setNameSuggestions] = useState([]);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Load distinct exercise names this user has used before, for autocomplete
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [{ data, error }, { data: hidden }] = await Promise.all([
        supabase
          .from("exercises")
          .select("name, workouts!inner(user_id)")
          .eq("workouts.user_id", userId),
        supabase
          .from("hidden_exercise_names")
          .select("name_lower")
          .eq("user_id", userId),
      ]);
      if (cancelled || error || !data) return;
      const hiddenSet = new Set((hidden ?? []).map((h) => h.name_lower));
      const seen = new Map(); // lowercase -> canonical display name
      for (const row of data) {
        const raw = (row.name || "").trim();
        if (!raw) continue;
        const key = raw.toLowerCase();
        if (hiddenSet.has(key)) continue;
        if (!seen.has(key)) seen.set(key, raw);
      }
      setNameSuggestions([...seen.values()].sort((a, b) => a.localeCompare(b)));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (invalidIds.size > 0) setInvalidIds(new Set());
    if (validationError) setValidationError(null);
  }, [exercises]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinishRequest = () => {
    if (exercises.length === 0) {
      setValidationError("Add at least one exercise before finishing.");
      return;
    }

    const bad = new Set();
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (ex.perHand) {
          if (
            s.leftWeight === "" ||
            s.leftReps === "" ||
            s.rightWeight === "" ||
            s.rightReps === ""
          )
            bad.add(s.tempId);
        } else {
          if (s.weight === "" || s.reps === "") bad.add(s.tempId);
        }
      }
    }
    if (bad.size > 0) {
      setInvalidIds(bad);
      setValidationError("Please fill in all set values before finishing.");
      return;
    }

    setConfirmModal({ type: "finish" });
  };

  const handleFinish = async () => {
    setConfirmModal(null);
    setValidationError(null);
    setInvalidIds(new Set());

    const durationMinutes = workoutStartTime
      ? Math.round((Date.now() - workoutStartTime) / 60000)
      : null;

    const toKg = (val) =>
      unit === "lbs"
        ? Math.round((parseFloat(val) / 2.2046) * 100) / 100
        : parseFloat(val);

    const { data: workout, error: workoutError } = await supabase
      .from("workouts")
      .insert({
        user_id: userId,
        name: workoutName.trim() || "Untitled Workout",
        date: new Date().toISOString(),
        notes: "",
        duration_minutes: durationMinutes > 0 ? durationMinutes : null,
      })
      .select("id")
      .single();

    if (workoutError) {
      setValidationError(`Failed to save workout: ${workoutError.message}`);
      return;
    }

    for (const [exIdx, exercise] of exercises.entries()) {
      const { data: ex } = await supabase
        .from("exercises")
        .insert({
          workout_id: workout.id,
          name: exercise.name.trim() || "Unnamed Exercise",
          order: exIdx,
          per_hand: exercise.perHand || false,
        })
        .select("id")
        .single();

      const setsToInsert = exercise.sets.map((s, setIdx) => {
        if (exercise.perHand) {
          const leftKg = toKg(s.leftWeight) || 0;
          const rightKg = toKg(s.rightWeight) || 0;
          return {
            exercise_id: ex.id,
            set_number: setIdx + 1,
            weight: Math.max(leftKg, rightKg),
            reps: parseInt(s.leftReps, 10) || 0,
            left_weight: leftKg,
            left_reps: parseInt(s.leftReps, 10) || 0,
            right_weight: rightKg,
            right_reps: parseInt(s.rightReps, 10) || 0,
          };
        }
        const kgValue = toKg(s.weight);
        return {
          exercise_id: ex.id,
          set_number: setIdx + 1,
          weight: kgValue || 0,
          reps: parseInt(s.reps, 10) || 0,
        };
      });

      await supabase.from("sets").insert(setsToInsert);
    }

    resetWorkout();
    navigate("/history");
  };

  return (
    <>
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
                  onTogglePerHand={togglePerHand}
                  invalidIds={invalidIds}
                  unit={unit}
                  nameSuggestions={nameSuggestions}
                />
              ))}
            </div>
          )}

          {/* Add exercise */}
          <button
            onClick={addExercise}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-700 text-slate-400 hover:border-brand-500 hover:text-brand-400 font-medium text-sm transition-colors mb-8"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add Exercise
          </button>

          {/* Validation error */}
          {validationError && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-red-400 mt-0.5 shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-red-400 text-sm">{validationError}</p>
            </div>
          )}

          {/* Start / Finish */}
          {started ? (
            <button
              onClick={handleFinishRequest}
              className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-base transition-colors"
            >
              Finish Workout
            </button>
          ) : (
            <button
              onClick={() => setConfirmModal({ type: "start" })}
              className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-base transition-colors"
            >
              Start Workout
            </button>
          )}
        </div>
      </div>

      {confirmModal?.type === "start" && (
        <ConfirmModal
          title="Start Workout?"
          message="This will start the timer and begin tracking your session."
          confirmLabel="Start"
          onConfirm={() => {
            setConfirmModal(null);
            startWorkout();
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {confirmModal?.type === "finish" && (
        <ConfirmModal
          title="Finish Workout?"
          message="Your workout will be saved and you'll be taken to your history."
          confirmLabel="Finish"
          danger
          onConfirm={handleFinish}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </>
  );
}
