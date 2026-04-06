"use client";

import { useEffect, useState } from "react";
type Cat = { id: string; name: string; slug: string };

export default function BudgetsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [overallAmount, setOverallAmount] = useState("");
  const [catBudget, setCatBudget] = useState<{ categoryId: string; amount: string }>({
    categoryId: "",
    amount: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  async function refreshCategories() {
    const res = await fetch("/api/categories", { credentials: "include" });
    const data = await res.json();
    const cats = (data.categories ?? []) as Cat[];
    setCategories(cats);
    setCatBudget((c) => ({ ...c, categoryId: c.categoryId || cats[0]?.id || "" }));
  }

  useEffect(() => {
    void refreshCategories();
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setNewCatName("");
      setMsg("Category added.");
      await refreshCategories();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function saveOverall(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const n = parseFloat(overallAmount);
    if (Number.isNaN(n) || n <= 0) {
      setMsg("Enter a valid overall budget amount");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          year,
          month,
          kind: "OVERALL",
          amount: n,
          alertAt: 0.9,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMsg("Overall budget saved.");
      setOverallAmount("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const n = parseFloat(catBudget.amount);
    if (!catBudget.categoryId || Number.isNaN(n) || n <= 0) {
      setMsg("Pick a category and valid amount");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          year,
          month,
          kind: "CATEGORY",
          categoryId: catBudget.categoryId,
          amount: n,
          alertAt: 0.85,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMsg("Category budget saved.");
      setCatBudget((c) => ({ ...c, amount: "" }));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Budgets</h1>
        <p className="text-slate-400">Set monthly limits and get alerts in the dashboard and via AI.</p>
      </div>

      <form onSubmit={(e) => void addCategory(e)} className="glass flex flex-wrap items-end gap-3 rounded-xl p-4">
        <label className="text-sm">
          <span className="text-slate-500">New custom category</span>
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="mt-1 w-full min-w-[200px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="e.g. Subscriptions"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !newCatName.trim()}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          Add category
        </button>
      </form>

      <div className="glass flex flex-wrap gap-4 rounded-xl p-4">
        <label className="text-sm">
          <span className="text-slate-500">Year</span>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
            className="mt-1 w-28 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Month</span>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form onSubmit={(e) => void saveOverall(e)} className="glass space-y-4 rounded-xl p-6">
        <h2 className="text-lg font-medium text-white">Overall monthly budget</h2>
        <p className="text-sm text-slate-500">
          Alerts near 90% of this limit (shown on dashboard and in AI budget checks).
        </p>
        <label className="block text-sm">
          <span className="text-slate-400">Amount</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={overallAmount}
            onChange={(e) => setOverallAmount(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="e.g. 3000"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Save overall budget
        </button>
      </form>

      <form onSubmit={(e) => void saveCategory(e)} className="glass space-y-4 rounded-xl p-6">
        <h2 className="text-lg font-medium text-white">Category budget</h2>
        <label className="block text-sm">
          <span className="text-slate-400">Category</span>
          <select
            value={catBudget.categoryId}
            onChange={(e) =>
              setCatBudget((c) => ({ ...c, categoryId: e.target.value }))
            }
            className="mt-1 w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Limit</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={catBudget.amount}
            onChange={(e) =>
              setCatBudget((c) => ({ ...c, amount: e.target.value }))
            }
            className="mt-1 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="e.g. 400 for food"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Save category budget
        </button>
      </form>

      {msg && <p className="text-sm text-slate-400">{msg}</p>}
    </div>
  );
}
