"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatMoney } from "@/lib/utils";
import { ExpenseForm } from "@/components/expense-form";

type Stats = {
  currentMonthTotal: number;
  previousMonthTotal: number;
  allTimeTotal: number;
  byCategory: { name: string; color: string; amount: number }[];
  topMerchants: { merchant: string; amount: number }[];
  budgetProgress: {
    kind: string;
    category?: { name: string } | null;
    amount: number;
    spent: number;
    percentUsed: number;
    alert: boolean;
  }[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<{ label: string; total: number }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRes, tRes] = await Promise.all([
          fetch("/api/stats", { credentials: "include" }),
          fetch("/api/stats/trends?months=6", { credentials: "include" }),
        ]);
        const s = await sRes.json();
        const t = await tRes.json();
        if (cancelled) return;
        if (!sRes.ok) throw new Error(s.error ?? "Failed to load stats");
        setStats({
          currentMonthTotal: s.currentMonthTotal,
          previousMonthTotal: s.previousMonthTotal,
          allTimeTotal: s.allTimeTotal,
          byCategory: (s.byCategory ?? []).map(
            (x: { name: string; color: string; amount: number }) => ({
              name: x.name,
              color: x.color,
              amount: x.amount,
            }),
          ),
          topMerchants: s.topMerchants ?? [],
          budgetProgress: s.budgetProgress ?? [],
        });
        setTrends((t.points ?? []).map((p: { label: string; total: number }) => ({ label: p.label, total: p.total })));
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pieData = (stats?.byCategory ?? []).map((c) => ({
    name: c.name,
    value: c.amount,
    color: c.color,
  }));

  const mom =
    stats && stats.previousMonthTotal > 0
      ? ((stats.currentMonthTotal - stats.previousMonthTotal) / stats.previousMonthTotal) * 100
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-slate-400">Overview and quick add</p>
      </div>

      {err && <p className="text-rose-400">{err}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">This month</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {stats ? formatMoney(stats.currentMonthTotal) : "—"}
          </p>
          {stats && (
            <p className="mt-1 text-xs text-slate-500">
              vs last month: {mom >= 0 ? "+" : ""}
              {mom.toFixed(1)}%
            </p>
          )}
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Last month</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {stats ? formatMoney(stats.previousMonthTotal) : "—"}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">All time</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {stats ? formatMoney(stats.allTimeTotal) : "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-xl p-4">
          <h2 className="mb-4 text-sm font-medium text-slate-300">Category breakdown</h2>
          <div className="h-64">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-slate-500">
                No expenses this month yet
              </p>
            )}
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <h2 className="mb-4 text-sm font-medium text-slate-300">Spending trend</h2>
          <div className="h-64">
            {trends.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Line type="monotone" dataKey="total" stroke="#818cf8" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500">Loading chart…</p>
            )}
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <h2 className="mb-4 text-sm font-medium text-slate-300">Budget progress</h2>
        {stats?.budgetProgress?.length ? (
          <ul className="space-y-3">
            {stats.budgetProgress.map((b, i) => (
              <li key={i} className="text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>
                    {b.kind === "OVERALL" ? "Overall" : b.category?.name ?? "Category"}
                  </span>
                  <span>
                    {formatMoney(b.spent)} / {formatMoney(b.amount)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      b.spent > b.amount ? "bg-rose-500" : b.alert ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, b.percentUsed)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            No budgets set. Go to Budgets to add monthly limits.
          </p>
        )}
      </div>

      <ExpenseForm
        onSaved={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
