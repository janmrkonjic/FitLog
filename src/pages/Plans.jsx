import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-7 h-7 text-slate-500"
        >
          <path d="M16.5 6a4.5 4.5 0 0 1 4.5 4.5v3a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 13.5v-3A4.5 4.5 0 0 1 7.5 6h9Zm-9 1.5A3 3 0 0 0 4.5 10.5v3a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3h-9Z" />
          <path d="M6 11.25a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75Zm3 0a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm6.75-.75a.75.75 0 0 0 0 1.5h.008a.75.75 0 0 0 0-1.5H15.75Z" />
        </svg>
      </div>
      <p className="text-slate-300 font-semibold text-lg mb-1">No plans yet</p>
      <p className="text-slate-500 text-sm mb-6 max-w-xs">
        Build a multi-week progressive overload plan and let the app coach you.
      </p>
      <Link
        to="/plans/new"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Create a plan
      </Link>
    </div>
  );
}

function PlanCard({ plan }) {
  const total = plan.sessionTotal;
  const done = plan.sessionDone;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const currentWeek = computeCurrentWeek(plan.start_date, plan.duration_weeks);
  const statusBadge =
    plan.status === "completed"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : plan.status === "cancelled"
        ? "bg-slate-700 text-slate-400 border-slate-600"
        : "bg-brand-500/15 text-brand-400 border-brand-500/30";

  return (
    <Link
      to={`/plans/${plan.id}`}
      className="block bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 hover:border-brand-500/60 hover:bg-slate-800/80 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-slate-100 font-semibold text-base truncate group-hover:text-brand-400 transition-colors">
          {plan.name}
        </p>
        <span
          className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full border ${statusBadge}`}
        >
          {plan.status}
        </span>
      </div>
      <p className="text-slate-400 text-sm mb-3">
        Week {Math.min(currentWeek, plan.duration_weeks)} of{" "}
        {plan.duration_weeks}
        <span className="text-slate-600 mx-2">·</span>
        {done}/{total} sessions
      </p>
      <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

function computeCurrentWeek(startDateIso, durationWeeks) {
  const start = new Date(startDateIso);
  const now = new Date();
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const wk = Math.floor(days / 7) + 1;
  return Math.max(1, Math.min(wk, durationWeeks));
}

export default function Plans() {
  const [plans, setPlans] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("plans")
        .select(
          `
          id, name, duration_weeks, start_date, status, created_at,
          plan_workouts (id, status)
        `,
        )
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error(error);
        setPlans([]);
        return;
      }

      const enriched = (data ?? []).map((p) => ({
        ...p,
        sessionTotal: p.plan_workouts?.length ?? 0,
        sessionDone:
          p.plan_workouts?.filter((s) => s.status === "completed").length ?? 0,
      }));
      setPlans(enriched);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Plans</h1>
          {plans && plans.length > 0 && (
            <Link
              to="/plans/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              New Plan
            </Link>
          )}
        </div>

        {plans === undefined ? (
          <Spinner />
        ) : plans.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {plans.map((p) => (
              <li key={p.id}>
                <PlanCard plan={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
