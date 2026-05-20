import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import useAuthStore from "../store/authStore";
import useUnitStore, { fmtWeight } from "../store/unitStore";
import usePlanStore, { getUniqueExercises } from "../store/planStore";
import { classifyIncrement, prescribedWeight } from "../lib/planMath";

// ─── unit helpers ─────────────────────────────────────────────────────────────
const kgToDisplay = (kg, unit) =>
  unit === "lbs" ? Math.round(kg * 2.2046 * 10) / 10 : Number(kg);
const displayToKg = (val, unit) =>
  unit === "lbs" ? Math.round((Number(val) / 2.2046) * 100) / 100 : Number(val);

// ─── shared ───────────────────────────────────────────────────────────────────
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
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StepHeader({ step, total, title, subtitle }) {
  return (
    <div className="mb-6">
      <p className="text-xs text-brand-400 font-semibold uppercase tracking-wide mb-1">
        Step {step} of {total}
      </p>
      <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
      {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────
function Step1() {
  const {
    name,
    durationWeeks,
    startDate,
    setName,
    setDurationWeeks,
    setStartDate,
  } = usePlanStore();
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <label className="block text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">
          Plan name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Spring Strength Block"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">
          Duration:{" "}
          <span className="text-brand-400">
            {durationWeeks} week{durationWeeks > 1 ? "s" : ""}
          </span>
        </label>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={durationWeeks}
          onChange={(e) => setDurationWeeks(e.target.value)}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1 px-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n}>{n}w</span>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">
          Start date
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
function HistoryPicker({ history, loading, onPick, onClose }) {
  return (
    <div className="mt-3 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
          Pick a workout
        </p>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          ✕
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <p className="text-slate-500 text-sm italic px-3 py-4">
          No workout history found.
        </p>
      ) : (
        <ul className="max-h-56 overflow-y-auto divide-y divide-slate-700/50">
          {history.map((w) => (
            <li key={w.id}>
              <button
                onClick={() => onPick(w)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-slate-100 text-sm font-medium truncate">
                    {w.name}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {w.exercises.length} exercises
                  </p>
                </div>
                <span className="text-brand-400 text-xs font-semibold shrink-0">
                  Add
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WeekSection({ weekIdx, history, historyLoading }) {
  const { weeks, addSlotToWeek, removeSlotFromWeek } = usePlanStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const slots = weeks[weekIdx] ?? [];

  const handlePick = (workout) => {
    addSlotToWeek(weekIdx, {
      sourceWorkoutId: workout.id,
      name: workout.name,
      exercises: workout.exercises.map((e) => ({
        name: e.name,
        perHand: !!e.per_hand,
      })),
    });
    setPickerOpen(false);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-100 font-semibold">Week {weekIdx + 1}</h3>
        <span className="text-slate-500 text-xs">
          {slots.length} session{slots.length !== 1 ? "s" : ""}
        </span>
      </div>

      {slots.length === 0 && !pickerOpen && (
        <p className="text-slate-600 text-sm italic mb-3">
          No workouts added yet.
        </p>
      )}

      {slots.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {slots.map((slot) => (
            <li
              key={slot.tempId}
              className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/60 rounded-lg px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm font-medium truncate">
                  {slot.name}
                </p>
                <p className="text-slate-500 text-xs">
                  {slot.exercises.length} exercises
                </p>
              </div>
              <button
                onClick={() => removeSlotFromWeek(weekIdx, slot.tempId)}
                className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                aria-label="Remove session"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen ? (
        <HistoryPicker
          history={history}
          loading={historyLoading}
          onPick={handlePick}
          onClose={() => setPickerOpen(false)}
        />
      ) : (
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:border-brand-500 hover:text-brand-400 text-sm font-medium transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add workout
        </button>
      )}
    </div>
  );
}

function Step2() {
  const { durationWeeks } = usePlanStore();
  const userId = useAuthStore((s) => s.user?.id);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setHistoryLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("id, name, date, exercises(id, name, per_hand, order)")
        .order("date", { ascending: false })
        .limit(100);
      if (cancelled) return;
      setHistoryLoading(false);
      if (error) return;
      // De-dupe by name (keep most recent per name)
      const seen = new Map();
      for (const w of data ?? []) {
        const key = w.name.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, {
            ...w,
            exercises: (w.exercises ?? []).sort(
              (a, b) => (a.order ?? 0) - (b.order ?? 0),
            ),
          });
        }
      }
      setHistory([...seen.values()]);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="space-y-4">
      {Array.from({ length: durationWeeks }, (_, i) => (
        <WeekSection
          key={i}
          weekIdx={i}
          history={history}
          historyLoading={historyLoading}
        />
      ))}
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────
function Step3() {
  const { unit } = useUnitStore();
  const userId = useAuthStore((s) => s.user?.id);
  const {
    weeks,
    exerciseBaselines,
    setExerciseBaseline,
    initExerciseBaselines,
  } = usePlanStore();
  const [loading, setLoading] = useState(true);

  const uniqueExercises = useMemo(() => getUniqueExercises(weeks), [weeks]);

  // Auto-fill baselines from the user's exercise history
  useEffect(() => {
    if (!userId || uniqueExercises.length === 0) {
      setLoading(false);
      return;
    }
    const namesToFetch = uniqueExercises
      .filter(({ name }) => !(name in exerciseBaselines))
      .map(({ name }) => name);

    if (namesToFetch.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("name, per_hand, sets(weight, reps), workouts!inner(user_id)")
        .eq("workouts.user_id", userId)
        .in("name", namesToFetch);
      if (cancelled) return;
      setLoading(false);
      if (error) return;

      // Find all-time best set per exercise name
      const bestByName = new Map();
      for (const ex of data ?? []) {
        const current = bestByName.get(ex.name);
        for (const s of ex.sets ?? []) {
          const prev = current;
          if (
            !prev ||
            s.weight > prev.weight ||
            (s.weight === prev.weight && s.reps > prev.reps)
          ) {
            bestByName.set(ex.name, {
              weight: s.weight,
              reps: s.reps,
              perHand: !!ex.per_hand,
            });
          }
        }
      }

      const defaultsToInit = {};
      for (const { name, perHand } of uniqueExercises) {
        if (name in exerciseBaselines) continue;
        const best = bestByName.get(name);
        defaultsToInit[name] = {
          baselineWeightKg: best?.weight ?? "",
          baselineReps: best?.reps ?? 8,
          setsCount: 3,
          weeklyIncrementKg: classifyIncrement(name),
          perHand: best?.perHand ?? perHand,
        };
      }
      if (Object.keys(defaultsToInit).length > 0)
        initExerciseBaselines(defaultsToInit);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, uniqueExercises.map((e) => e.name).join("|")]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-sm">
        These weights apply to each exercise every time it appears in the plan.
        The app will increase weight each week.
      </p>
      {uniqueExercises.map(({ name }) => (
        <ExerciseBaselineRow
          key={name}
          name={name}
          baseline={exerciseBaselines[name]}
          unit={unit}
          onChange={(field, value) => setExerciseBaseline(name, field, value)}
        />
      ))}
    </div>
  );
}

function ExerciseBaselineRow({ name, baseline, unit, onChange }) {
  if (!baseline) return null;

  const displayWeight =
    baseline.baselineWeightKg === ""
      ? ""
      : kgToDisplay(baseline.baselineWeightKg, unit);
  const displayInc =
    baseline.weeklyIncrementKg === ""
      ? ""
      : kgToDisplay(baseline.weeklyIncrementKg, unit);
  const defaultIncKg = classifyIncrement(name);
  const defaultIncDisp = kgToDisplay(defaultIncKg, unit);

  const handleWeight = (v) =>
    onChange("baselineWeightKg", v === "" ? "" : displayToKg(v, unit));
  const handleIncrement = (v) =>
    onChange("weeklyIncrementKg", v === "" ? "" : displayToKg(v, unit));

  const inputBase =
    "bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-right";
  const needsWeight =
    baseline.baselineWeightKg === "" || baseline.baselineWeightKg === null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <p className="text-slate-100 font-semibold text-sm mb-3">{name}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Start weight ({unit})
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            placeholder="required"
            value={displayWeight}
            onChange={(e) => handleWeight(e.target.value)}
            className={`${inputBase} w-full ${needsWeight ? "border-red-500/70 focus:ring-red-500" : ""}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Reps
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={baseline.baselineReps}
            onChange={(e) =>
              onChange(
                "baselineReps",
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className={`${inputBase} w-full`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Sets
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={baseline.setsCount}
            onChange={(e) =>
              onChange(
                "setsCount",
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className={`${inputBase} w-full`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            +/week ({unit})
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.25"
            value={displayInc}
            onChange={(e) => handleIncrement(e.target.value)}
            className={`${inputBase} w-full`}
          />
          {Number(baseline.weeklyIncrementKg) !== defaultIncKg && (
            <span className="text-[10px] text-slate-600">
              default {defaultIncDisp}
            </span>
          )}
        </div>
      </div>

      {/* Preview: how weight progresses over the plan */}
      <WeekPreview baseline={baseline} unit={unit} />
    </div>
  );
}

function WeekPreview({ baseline, unit }) {
  const { durationWeeks } = usePlanStore();
  if (!baseline.baselineWeightKg || durationWeeks <= 1) return null;
  const weeks = Array.from({ length: durationWeeks }, (_, i) => ({
    week: i + 1,
    weight: prescribedWeight(
      baseline.baselineWeightKg,
      baseline.weeklyIncrementKg,
      i + 1,
    ),
    reps: baseline.baselineReps,
  }));
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
      {weeks.map(({ week, weight, reps }) => (
        <div
          key={week}
          className="shrink-0 text-center bg-slate-900/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5"
        >
          <p className="text-[10px] text-slate-500 uppercase font-medium">
            Wk {week}
          </p>
          <p className="text-slate-200 text-sm font-semibold tabular-nums">
            {fmtWeight(weight, unit, false)}
          </p>
          <p className="text-slate-500 text-[10px]">×{reps}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PlanNew() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const {
    name,
    durationWeeks,
    startDate,
    weeks,
    step,
    setStep,
    reset,
    baselinesValid,
    hasAnySlot,
    exerciseBaselines,
  } = usePlanStore();

  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canAdvance = useMemo(() => {
    if (step === 1)
      return name.trim().length > 0 && durationWeeks >= 1 && !!startDate;
    if (step === 2) return hasAnySlot();
    if (step === 3) return baselinesValid();
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    name,
    durationWeeks,
    startDate,
    weeks,
    baselinesValid,
    hasAnySlot,
    exerciseBaselines,
  ]);

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else {
      reset();
      navigate("/plans");
    }
  };
  const handleNext = () => {
    if (!canAdvance) return;
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    handleCreate();
  };

  const handleCreate = async () => {
    if (!userId || submitting) return;
    const { exerciseBaselines } = usePlanStore.getState();
    setSubmitError(null);
    setSubmitting(true);
    try {
      // 1. Insert plan
      const { data: plan, error: planErr } = await supabase
        .from("plans")
        .insert({
          user_id: userId,
          name: name.trim(),
          duration_weeks: durationWeeks,
          start_date: startDate,
          status: "active",
        })
        .select("id")
        .single();
      if (planErr) throw planErr;

      // 2. Insert all plan_workouts (sessions) in order
      const pwRows = [];
      weeks.forEach((weekSlots, weekIdx) => {
        weekSlots.forEach((slot, slotIdx) => {
          pwRows.push({
            plan_id: plan.id,
            source_workout_id: slot.sourceWorkoutId,
            name: slot.name,
            week_number: weekIdx + 1,
            order: slotIdx,
          });
        });
      });
      if (pwRows.length === 0) throw new Error("No sessions defined.");

      const { data: pws, error: pwErr } = await supabase
        .from("plan_workouts")
        .insert(pwRows)
        .select("id, week_number, order");
      if (pwErr) throw pwErr;

      // Build a lookup: (week_number, order) → plan_workout id
      const pwLookup = new Map(
        pws.map((r) => [`${r.week_number}:${r.order}`, r.id]),
      );

      // 3. Insert plan_exercises for every session
      const exRows = [];
      weeks.forEach((weekSlots, weekIdx) => {
        weekSlots.forEach((slot, slotIdx) => {
          const pwId = pwLookup.get(`${weekIdx + 1}:${slotIdx}`);
          if (!pwId) return;
          slot.exercises.forEach((ex, exIdx) => {
            const b = exerciseBaselines[ex.name];
            if (!b) return;
            exRows.push({
              plan_workout_id: pwId,
              name: ex.name,
              per_hand: !!ex.perHand,
              sets_count: Number(b.setsCount) || 3,
              baseline_weight_kg: Number(b.baselineWeightKg) || 0,
              baseline_reps: Number(b.baselineReps) || 8,
              weekly_increment_kg:
                Number(b.weeklyIncrementKg) ?? classifyIncrement(ex.name),
              order: exIdx,
            });
          });
        });
      });
      if (exRows.length > 0) {
        const { error: exErr } = await supabase
          .from("plan_exercises")
          .insert(exRows);
        if (exErr) throw exErr;
      }

      reset();
      navigate(`/plans/${plan.id}`);
    } catch (e) {
      console.error(e);
      setSubmitError(e.message || "Failed to create plan.");
    } finally {
      setSubmitting(false);
    }
  };

  const titles = {
    1: {
      title: "Basics",
      subtitle: "Name your plan and set how long it runs.",
    },
    2: {
      title: "Workouts",
      subtitle: "For each week, add the workout sessions you will do.",
    },
    3: {
      title: "Baselines",
      subtitle:
        "Set your starting weight for each exercise. The app will increase it each week.",
    },
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-2xl">
        <StepHeader
          step={step}
          total={3}
          title={titles[step].title}
          subtitle={titles[step].subtitle}
        />

        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 />}

        {submitError && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            {submitError}
          </div>
        )}

        {step === 2 && !hasAnySlot() && (
          <p className="mt-4 text-amber-400 text-sm">
            Add at least one workout to any week to continue.
          </p>
        )}

        {step === 3 && !baselinesValid() && (
          <p className="mt-4 text-amber-400 text-sm">
            Fill in a starting weight for every exercise to continue.
          </p>
        )}

        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={handleBack}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-slate-100 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button
            onClick={handleNext}
            disabled={!canAdvance || submitting}
            className="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating…" : step < 3 ? "Next" : "Create plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
