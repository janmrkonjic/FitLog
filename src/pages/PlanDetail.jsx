import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePlan } from "../hooks/usePlan";
import useUnitStore, { fmtWeight } from "../store/unitStore";
import { supabase } from "../lib/supabase";
import { prescribedWeight } from "../lib/planMath";

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

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
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${danger ? "bg-red-600 hover:bg-red-500" : "bg-brand-500 hover:bg-brand-600"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtDate(isoDate) {
  if (!isoDate) return null;
  return new Date(isoDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isToday(isoDate) {
  if (!isoDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return isoDate === today;
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

// ─── Inline date editor on each session card ─────────────────────────────────
function DateBadge({ sessionId, dateValue, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = async (e) => {
    const val = e.target.value || null;
    setSaving(true);
    await supabase
      .from("plan_workouts")
      .update({ session_date: val })
      .eq("id", sessionId);
    setSaving(false);
    setEditing(false);
    onUpdated();
  };

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={dateValue ?? ""}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        autoFocus
        disabled={saving}
        className="bg-slate-700 border border-brand-500 rounded-lg px-2 py-1 text-slate-100 text-xs focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
        dateValue
          ? isToday(dateValue)
            ? "bg-brand-500/15 border-brand-500/50 text-brand-300"
            : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
          : "bg-slate-800 border-dashed border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-400"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-3 h-3"
      >
        <path
          fillRule="evenodd"
          d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
          clipRule="evenodd"
        />
      </svg>
      {dateValue
        ? isToday(dateValue)
          ? "Today"
          : fmtDate(dateValue)
        : "Set date"}
    </button>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────
function SessionCard({ session, unit, onStart, onRefresh }) {
  const completed = session.status === "completed";

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        completed
          ? "bg-emerald-500/5 border-emerald-500/30"
          : isToday(session.session_date)
            ? "bg-brand-500/10 border-brand-500/60 shadow-lg shadow-brand-500/10"
            : "bg-slate-800 border-slate-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-slate-100 font-semibold truncate">
            {session.name}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <DateBadge
              sessionId={session.id}
              dateValue={session.session_date}
              onUpdated={onRefresh}
            />
          </div>
        </div>
        {completed && (
          <span className="text-emerald-400 shrink-0" title="Completed">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </div>

      {/* Prescribed exercises */}
      <ul className="space-y-1 mb-3">
        {session.plan_exercises.map((ex) => {
          const w = prescribedWeight(
            ex.baseline_weight_kg,
            ex.weekly_increment_kg,
            session.week_number,
          );
          return (
            <li
              key={ex.id}
              className="flex items-baseline justify-between gap-2 text-sm"
            >
              <span className="text-slate-300 truncate">{ex.name}</span>
              <span className="text-slate-400 font-mono tabular-nums shrink-0">
                {ex.sets_count} × {ex.baseline_reps} @ {fmtWeight(w, unit)}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Action */}
      {completed ? (
        <Link
          to={`/workout/${session.completed_workout_id}`}
          className="block text-center w-full text-sm text-emerald-300 hover:text-emerald-200 font-medium py-2 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/5 transition-colors"
        >
          View logged workout →
        </Link>
      ) : (
        <button
          onClick={() => onStart(session)}
          className={`w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-colors ${
            isToday(session.session_date)
              ? "bg-brand-500 hover:bg-brand-600"
              : "bg-slate-700 hover:bg-slate-600"
          }`}
        >
          Start session
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { unit } = useUnitStore();
  const { plan, isLoading, error, refresh } = usePlan(id);

  const [activeWeek, setActiveWeek] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adherenceBySession, setAdherenceBySession] = useState({});
  const [adherenceLoading, setAdherenceLoading] = useState(false);

  const stats = useMemo(() => {
    if (!plan) return { done: 0, total: 0 };
    return {
      done: plan.plan_workouts.filter((s) => s.status === "completed").length,
      total: plan.plan_workouts.length,
    };
  }, [plan]);

  useEffect(() => {
    if (!plan) {
      setAdherenceBySession({});
      return;
    }

    const completedSessions = plan.plan_workouts.filter(
      (s) => s.status === "completed" && s.completed_workout_id,
    );

    if (completedSessions.length === 0) {
      setAdherenceBySession({});
      return;
    }

    const workoutIds = [
      ...new Set(completedSessions.map((s) => s.completed_workout_id)),
    ];
    let cancelled = false;
    setAdherenceLoading(true);
    (async () => {
      const { data: exerciseRows, error: exErr } = await supabase
        .from("exercises")
        .select(
          "id, workout_id, name, per_hand, order, sets (id, set_number, weight, reps, left_weight, left_reps, right_weight, right_reps)",
        )
        .in("workout_id", workoutIds);

      if (cancelled) return;
      if (exErr) {
        console.error(exErr);
        setAdherenceBySession({});
        setAdherenceLoading(false);
        return;
      }

      const exercisesByWorkout = new Map();
      for (const ex of exerciseRows ?? []) {
        const list = exercisesByWorkout.get(ex.workout_id) ?? [];
        const setsSorted = (ex.sets ?? [])
          .slice()
          .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));
        list.push({ ...ex, sets: setsSorted });
        exercisesByWorkout.set(ex.workout_id, list);
      }

      const next = {};
      for (const session of completedSessions) {
        const planned = (session.plan_exercises ?? [])
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const logged =
          exercisesByWorkout.get(session.completed_workout_id) ?? [];
        const loggedByName = new Map();

        for (const ex of logged) {
          const key = (ex.name || "").trim().toLowerCase();
          if (!key || loggedByName.has(key)) continue;
          loggedByName.set(key, ex);
        }

        const exercises = planned.map((p) => {
          const key = (p.name || "").trim().toLowerCase();
          const loggedEx = loggedByName.get(key);
          const expectedWeight = prescribedWeight(
            p.baseline_weight_kg,
            p.weekly_increment_kg,
            session.week_number,
          );
          const expectedReps = Number(p.baseline_reps);
          const expectedSets = Number(p.sets_count) || 0;

          if (!loggedEx) {
            return {
              name: p.name,
              ok: false,
              badSets: expectedSets,
              expectedSets,
            };
          }

          const sets = (loggedEx.sets ?? []).slice(0, expectedSets);
          let badSets = Math.max(0, expectedSets - sets.length);

          for (const set of sets) {
            const actualWeight = getSetWeight(set, p.per_hand);
            const actualReps = getSetReps(set, p.per_hand);
            const weightOk =
              actualWeight !== null &&
              Math.abs(actualWeight - expectedWeight) <= WEIGHT_TOLERANCE_KG;
            const repsOk =
              actualReps !== null && Number(actualReps) === expectedReps;
            if (!weightOk || !repsOk) badSets += 1;
          }

          return { name: p.name, ok: badSets === 0, badSets, expectedSets };
        });

        const okCount = exercises.filter((e) => e.ok).length;
        next[session.id] = { okCount, total: exercises.length, exercises };
      }

      setAdherenceBySession(next);
      setAdherenceLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [plan]);

  if (isLoading) return <Spinner />;
  if (error || !plan) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8">
        <p className="text-red-400 mb-2">Plan not found.</p>
        <Link to="/plans" className="text-brand-400 hover:underline text-sm">
          ← Back to plans
        </Link>
      </div>
    );
  }

  const handleStart = (session) => {
    navigate("/new", {
      state: {
        planSessionId: session.id,
        planMeta: { planName: plan.name, weekNumber: session.week_number },
      },
    });
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    await supabase.from("plans").delete().eq("id", plan.id);
    navigate("/plans");
  };

  // Sessions for the active week (already sorted by usePlan: date → order)
  const weekSessions = plan.plan_workouts.filter(
    (s) => s.week_number === activeWeek,
  );
  const completedWeekSessions = weekSessions.filter(
    (s) => s.status === "completed" && s.completed_workout_id,
  );
  const pct =
    stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <>
      <div className="px-4 py-6 md:px-8 md:py-8">
        <div className="max-w-2xl">
          <Link
            to="/plans"
            className="text-brand-400 hover:text-brand-300 text-sm font-medium inline-flex items-center gap-1 mb-3"
          >
            ← All plans
          </Link>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-100 truncate">
                {plan.name}
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                {plan.duration_weeks} week{plan.duration_weeks > 1 ? "s" : ""}
                <span className="text-slate-600 mx-2">·</span>
                starts{" "}
                {new Date(plan.start_date + "T12:00:00").toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-slate-500 hover:text-red-400 transition-colors shrink-0 p-1"
              aria-label="Delete plan"
            >
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
            </button>
          </div>

          {/* Progress bar */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-slate-300 text-sm">
                <span className="font-semibold text-slate-100">
                  {stats.done}
                </span>
                <span className="text-slate-500">
                  {" "}
                  / {stats.total} sessions done
                </span>
              </p>
              <p className="text-brand-400 text-sm font-semibold">{pct}%</p>
            </div>
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {completedWeekSessions.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-100 font-semibold text-sm">
                  Plan adherence
                </h3>
                {adherenceLoading && (
                  <span className="text-slate-500 text-xs">Calculating...</span>
                )}
              </div>
              <div className="space-y-3">
                {completedWeekSessions.map((session) => {
                  const report = adherenceBySession[session.id];
                  return (
                    <div
                      key={session.id}
                      className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-slate-200 text-sm font-medium truncate">
                          {session.name}
                        </p>
                        {report ? (
                          <span
                            className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full border ${
                              report.okCount === report.total
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {report.okCount}/{report.total} ok
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">
                            Pending
                          </span>
                        )}
                      </div>
                      {report && (
                        <ul className="mt-2 space-y-1">
                          {report.exercises.map((ex) => (
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
                                {ex.ok
                                  ? "OK"
                                  : `OFF ${ex.badSets}/${ex.expectedSets}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-slate-500 text-[11px] mt-3">
                Weight tolerance: +/- {WEIGHT_TOLERANCE_KG} kg. Reps must match
                exactly. Per-hand uses average.
              </p>
            </div>
          )}

          {/* Week tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from({ length: plan.duration_weeks }, (_, i) => {
              const wk = i + 1;
              const wkSessions = plan.plan_workouts.filter(
                (s) => s.week_number === wk,
              );
              const wkDone = wkSessions.filter(
                (s) => s.status === "completed",
              ).length;
              return (
                <button
                  key={wk}
                  onClick={() => setActiveWeek(wk)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    activeWeek === wk
                      ? "bg-brand-500/15 border-brand-500/60 text-brand-300"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-100"
                  }`}
                >
                  Week {wk}
                  <span className="text-slate-500 ml-1.5">
                    ({wkDone}/{wkSessions.length})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Session tip */}
          {weekSessions.some((s) => !s.session_date) && (
            <p className="text-slate-500 text-xs mb-3">
              Tap <span className="text-slate-400 font-medium">Set date</span>{" "}
              on each session to schedule it in your week.
            </p>
          )}

          {/* Sessions */}
          {weekSessions.length === 0 ? (
            <p className="text-slate-500 text-sm italic">
              No sessions planned for this week.
            </p>
          ) : (
            <ul className="space-y-3">
              {weekSessions.map((s) => (
                <li key={s.id}>
                  <SessionCard
                    session={s}
                    unit={unit}
                    onStart={handleStart}
                    onRefresh={refresh}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete plan?"
          message="The plan and all its sessions will be removed. Logged workouts you completed will stay in your history."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
