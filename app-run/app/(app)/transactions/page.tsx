"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";

type Expense = {
  id: string;
  amount: number;
  date: string;
  description: string;
  merchant: string;
  paymentMethod: string;
  category: { name: string };
};

type Cat = { id: string; name: string };

export default function TransactionsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [totals, setTotals] = useState({ totalPages: 1, total: 0 });
  const [sort, setSort] = useState("date-desc");
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmountDraft, setMinAmountDraft] = useState("");
  const [maxAmountDraft, setMaxAmountDraft] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("sort", sort);
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (minAmount) params.set("minAmount", minAmount);
    if (maxAmount) params.set("maxAmount", maxAmount);
    const res = await fetch(`/api/expenses?${params}`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) {
      setExpenses(data.expenses ?? []);
      setTotals({
        totalPages: data.pagination?.totalPages ?? 1,
        total: data.pagination?.total ?? 0,
      });
    }
    setLoading(false);
  }, [page, sort, q, categoryId, paymentMethod, from, to, minAmount, maxAmount]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/categories", { credentials: "include" });
      const data = await res.json();
      setCategories(data.categories ?? []);
    })();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const exportHref = `/api/expenses/export?${new URLSearchParams({
    ...(q ? { q } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(minAmount ? { minAmount } : {}),
    ...(maxAmount ? { maxAmount } : {}),
  }).toString()}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Transactions</h1>
          <p className="text-slate-400">
            {totals.total} expenses
            {loading ? " · Loading…" : ""}
          </p>
        </div>
        <a
          href={exportHref}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Export CSV
        </a>
      </div>

      <div className="glass grid gap-3 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="text-slate-500">Search</span>
          <input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Merchant or description"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Payment</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            <option value="">All</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            <option value="date-desc">Date ↓</option>
            <option value="date-asc">Date ↑</option>
            <option value="amount-desc">Amount ↓</option>
            <option value="amount-asc">Amount ↑</option>
            <option value="category">Category</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Min amount</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={minAmountDraft}
            onChange={(e) => setMinAmountDraft(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Max amount</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={maxAmountDraft}
            onChange={(e) => setMaxAmountDraft(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setQ(qDraft);
              setMinAmount(minAmountDraft.trim());
              setMaxAmount(maxAmountDraft.trim());
              setPage(1);
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Merchant</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-slate-800/80">
                <td className="px-4 py-3 text-slate-300">
                  {new Date(e.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-medium text-white">{formatMoney(e.amount)}</td>
                <td className="px-4 py-3 text-slate-400">{e.category.name}</td>
                <td className="px-4 py-3 text-slate-400">{e.merchant || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{e.paymentMethod}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-rose-400 hover:underline"
                    onClick={async () => {
                      if (!confirm("Delete this expense?")) return;
                      await fetch(`/api/expenses/${e.id}`, {
                        method: "DELETE",
                        credentials: "include",
                      });
                      void load();
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!expenses.length && !loading && (
          <p className="p-8 text-center text-slate-500">No transactions match.</p>
        )}
      </div>

      <div className="flex justify-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <span className="py-2 text-sm text-slate-500">
          Page {page} / {totals.totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totals.totalPages}
          onClick={() => setPage((p) => Math.min(totals.totalPages, p + 1))}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <p className="text-center text-sm text-slate-500">
        Tip: use the AI panel to add or query expenses in plain English.{" "}
        <Link href="/dashboard" className="text-indigo-400 hover:underline">
          Dashboard
        </Link>
      </p>
    </div>
  );
}
