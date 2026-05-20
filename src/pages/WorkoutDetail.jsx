import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import useUnitStore, { fmtWeight } from "../store/unitStore";
import { formatDuration } from "./History";
import { prescribedWeight } from "../lib/planMath";

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const WEIGHT_TOLERANCE_KG = 1;

function avgPair(a, b) {
  const left = Number(a);
  const right = Number(b);
  if (Number.isFinite(left) && Number.isFinite(right))
    return (left + right) / 2;
  return null;
}

function getSetWeight(set, perHand) {
  if (perHand) {
    const avg = avgPair(set.left_weight, set.right_weight);
    if (avg !== null) return avg;
  }
  const w = Number(set.weight);
  return Number.isFinite(w) ? w : null;
}

function getSetReps(set, perHand) {
  if (perHand) {
    const avg = avgPair(set.left_reps, set.right_reps);
    if (avg !== null) return avg;
  }
  const r = Number(set.reps);
  return Number.isFinite(r) ? r : null;
}

function buildPlanAdherence(planSession, exercises) {
  const planned = (planSession.plan_exercises ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const loggedByName = new Map();
  for (const ex of exercises ?? []) {
    const key = (ex.name || "").trim().toLowerCase();
    if (!key || loggedByName.has(key)) continue;
    loggedByName.set(key, ex);
  }

  const results = planned.map((p) => {
    const key = (p.name || "").trim().toLowerCase();
    const logged = loggedByName.get(key);
    const expectedWeight = prescribedWeight(
      p.baseline_weight_kg,
      p.weekly_increment_kg,
      planSession.week_number,
    );
    const expectedReps = Number(p.baseline_reps);
    const expectedSets = Number(p.sets_count) || 0;

    if (!logged) {
      return { name: p.name, ok: false, badSets: expectedSets, expectedSets };
    }

    const sets = (logged.sets ?? []).slice(0, expectedSets);
    let badSets = Math.max(0, expectedSets - sets.length);

    for (const set of sets) {
      const actualWeight = getSetWeight(set, p.per_hand);
      const actualReps = getSetReps(set, p.per_hand);
      const weightOk =
        actualWeight !== null &&
        Math.abs(actualWeight - expectedWeight) <= WEIGHT_TOLERANCE_KG;
      const repsOk = actualReps !== null && Number(actualReps) === expectedReps;
      if (!weightOk || !repsOk) badSets += 1;
    }

    return { name: p.name, ok: badSets === 0, badSets, expectedSets };
  });

  const okCount = results.filter((r) => r.ok).length;
  return {
    planName: planSession.plans?.name ?? "",
    sessionName: planSession.name,
    weekNumber: planSession.week_number,
    okCount,
    total: results.length,
    results,
  };
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/history"
      className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
          clipRule="evenodd"
        />
      </svg>
      History
    </Link>
  );
}

function ExerciseTable({ exercise, workoutId, unit }) {
  const perHand = exercise.per_hand === true;

  // Pick a single best set: highest weight, then highest reps,
  // then latest set_number (later set wins because the lifter is more fatigued).
  const bestSetId = (() => {
    let best = null;
    for (const s of exercise.sets) {
      const w = perHand
        ? Math.max(s.left_weight || 0, s.right_weight || 0)
        : s.weight || 0;
      const r = perHand
        ? Math.max(s.left_reps || 0, s.right_reps || 0)
        : s.reps || 0;
      if (w <= 0 || r <= 0) continue;
      if (
        !best ||
        w > best.w ||
        (w === best.w && r > best.r) ||
        (w === best.w && r === best.r && s.set_number > best.n)
      ) {
        best = { id: s.id, w, r, n: s.set_number };
      }
    }
    return best?.id ?? null;
  })();

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="mb-3">
        {exercise.name ? (
          <Link
            to={`/exercise/${encodeURIComponent(exercise.name)}`}
            state={{ workoutId }}
            className="text-slate-100 font-semibold text-base hover:text-brand-400 transition-colors inline-flex items-center gap-1.5 group"
          >
            {exercise.name}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-3.5 h-3.5 text-slate-600 group-hover:text-brand-500 transition-colors"
            >
              <path
                fillRule="evenodd"
                d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        ) : (
          <h2 className="text-slate-100 font-semibold text-base">
            Unnamed Exercise
          </h2>
        )}
        {perHand && (
          <span className="ml-2 text-xs text-brand-400/70 border border-brand-500/20 bg-brand-500/10 rounded-full px-2 py-0.5">
            per hand
          </span>
        )}
      </div>

      {exercise.sets.length === 0 ? (
        <p className="text-slate-500 text-sm">No sets recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {perHand ? (
                <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-700">
                  <th className="pb-2 pr-4 text-left font-medium w-10">Set</th>
                  <th className="pb-2 pr-3 text-right font-medium text-brand-500/70">
                    L Weight
                  </th>
                  <th className="pb-2 pr-4 text-right font-medium text-brand-500/70">
                    L Reps
                  </th>
                  <th className="pb-2 pr-3 text-right font-medium">R Weight</th>
                  <th className="pb-2 pr-4 text-right font-medium">R Reps</th>
                  <th className="pb-2 w-16 text-right font-medium">Best</th>
                </tr>
              ) : (
                <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-700">
                  <th className="pb-2 pr-4 text-left font-medium w-10">Set</th>
                  <th className="pb-2 pr-4 text-right font-medium">Weight</th>
                  <th className="pb-2 pr-4 text-right font-medium">Reps</th>
                  <th className="pb-2 w-16 text-right font-medium">Best</th>
                </tr>
              )}
            </thead>
            <tbody>
              {exercise.sets.map((set) => {
                const isBest = set.id === bestSetId;
                const rowCls = isBest ? "text-brand-400" : "text-slate-300";
                const dash = <span className="text-slate-600">—</span>;

                if (perHand) {
                  return (
                    <tr key={set.id} className={rowCls}>
                      <td className="py-1.5 pr-4 font-mono text-slate-400 text-xs">
                        {set.set_number}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">
                        {set.left_weight > 0
                          ? fmtWeight(set.left_weight, unit)
                          : dash}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {set.left_reps > 0 ? set.left_reps : dash}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">
                        {set.right_weight > 0
                          ? fmtWeight(set.right_weight, unit)
                          : dash}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {set.right_reps > 0 ? set.right_reps : dash}
                      </td>
                      <td className="py-1.5 text-right">
                        {isBest && <BestBadge />}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={set.id} className={rowCls}>
                    <td className="py-1.5 pr-4 font-mono text-slate-400 text-xs">
                      {set.set_number}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      {set.weight > 0 ? fmtWeight(set.weight, unit) : dash}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      {set.reps > 0 ? set.reps : dash}
                    </td>
                    <td className="py-1.5 text-right">
                      {isBest && <BestBadge />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BestBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full px-2 py-0.5">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="w-3 h-3"
      >
        <path
          fillRule="evenodd"
          d="M8 1.75a.75.75 0 0 1 .692.462l1.41 3.393 3.664.293a.75.75 0 0 1 .428 1.317l-2.791 2.39.853 3.575a.75.75 0 0 1-1.12.814L8 11.944l-3.136 1.05a.75.75 0 0 1-1.12-.814l.853-3.576-2.79-2.39a.75.75 0 0 1 .427-1.316l3.663-.293 1.41-3.393A.75.75 0 0 1 8 1.75Z"
          clipRule="evenodd"
        />
      </svg>
      Best
    </span>
  );
}

function DeleteButton({ onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleClick = () => {
    if (!confirming) {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
    } else {
      clearTimeout(timerRef.current);
      onDelete();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full py-3 rounded-xl border font-medium text-sm transition-colors ${
        confirming
          ? "border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20"
          : "border-slate-700 text-slate-400 hover:border-red-500/60 hover:text-red-400"
      }`}
    >
      {confirming ? "Tap again to confirm delete" : "Delete Workout"}
    </button>
  );
}

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workoutId = parseInt(id, 10);
  const { unit } = useUnitStore();

  const [data, setData] = useState(undefined);
  const [planAdherence, setPlanAdherence] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: workout } = await supabase
        .from("workouts")
        .select("id, name, date, duration_minutes")
        .eq("id", workoutId)
        .single();

      if (!workout) {
        setData(null);
        setPlanAdherence(null);
        return;
      }

      const { data: exercises } = await supabase
        .from("exercises")
        .select("id, name, order, per_hand")
        .eq("workout_id", workoutId)
        .order("order", { ascending: true });

      const exercisesWithSets = await Promise.all(
        (exercises ?? []).map(async (ex) => {
          const { data: sets } = await supabase
            .from("sets")
            .select(
              "id, set_number, weight, reps, left_weight, left_reps, right_weight, right_reps",
            )
            .eq("exercise_id", ex.id)
            .order("set_number", { ascending: true });
          return { ...ex, sets: sets ?? [] };
        }),
      );

      const { data: planSession } = await supabase
        .from("plan_workouts")
        .select(
          `
          id, name, week_number,
          plan_exercises (
            id, name, per_hand, sets_count,
            baseline_weight_kg, baseline_reps, weekly_increment_kg, order
          ),
          plans ( name )
        `,
        )
        .eq("completed_workout_id", workoutId)
        .maybeSingle();

      setPlanAdherence(
        planSession ? buildPlanAdherence(planSession, exercisesWithSets) : null,
      );

      setData({ workout, exercises: exercisesWithSets });
    }
    load().catch(console.error);
  }, [workoutId]);

  const handleDelete = async () => {
    await supabase.from("workouts").delete().eq("id", workoutId);
    navigate("/history");
  };

  if (data === undefined) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8">
        <BackLink />
        <Spinner />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8">
        <BackLink />
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-slate-300 font-semibold text-lg mb-2">
            Workout not found
          </p>
          <p className="text-slate-500 text-sm mb-6">
            This workout may have been deleted.
          </p>
          <Link
            to="/history"
            className="text-brand-400 hover:text-brand-300 text-sm font-medium"
          >
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  const { workout, exercises } = data;
  const duration = formatDuration(workout.duration_minutes);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-2xl">
        <BackLink />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">{workout.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-slate-400 text-sm">{formatDate(workout.date)}</p>
            {duration && (
              <>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-slate-500 text-sm">{duration}</span>
              </>
            )}
          </div>
        </div>

        {planAdherence && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-slate-100 font-semibold text-sm truncate">
                  Plan adherence
                  {planAdherence.planName ? `: ${planAdherence.planName}` : ""}
                </p>
                <p className="text-slate-500 text-xs">
                  {planAdherence.sessionName} · Week {planAdherence.weekNumber}
                </p>
              </div>
              <span
                className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full border ${
                  planAdherence.okCount === planAdherence.total
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                }`}
              >
                {planAdherence.okCount}/{planAdherence.total} ok
              </span>
            </div>
            <ul className="space-y-1">
              {planAdherence.results.map((ex) => (
                <li
                  key={ex.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span
                    className={`${ex.ok ? "text-slate-300" : "text-amber-300"} truncate`}
                  >
                    {ex.name}
                  </span>
                  <span
                    className={`${ex.ok ? "text-emerald-400" : "text-red-400"} font-semibold`}
                  >
                    {ex.ok ? "OK" : `OFF ${ex.badSets}/${ex.expectedSets}`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-slate-500 text-[11px] mt-3">
              Weight tolerance: +/- {WEIGHT_TOLERANCE_KG} kg. Reps must match
              exactly. Per-hand uses average.
            </p>
          </div>
        )}

        {exercises.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No exercises recorded for this workout.
          </p>
        ) : (
          <div className="space-y-4 mb-8">
            {exercises.map((exercise) => (
              <ExerciseTable
                key={exercise.id}
                exercise={exercise}
                workoutId={workoutId}
                unit={unit}
              />
            ))}
          </div>
        )}

        <DeleteButton onDelete={handleDelete} />
      </div>
    </div>
  );
}
