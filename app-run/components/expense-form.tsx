"use client";

import { useEffect, useState } from "react";

type Cat = { id: string; name: string };

export function ExpenseForm({ onSaved }: { onSaved?: () => void }) {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/categories", { credentials: "include" });
      const data = await res.json();
      const cats = (data.categories ?? []) as Cat[];
      setCategories(cats);
      setCategoryId((prev) => prev || cats[0]?.id || "");
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const n = parseFloat(amount);
    if (Number.isNaN(n) || n <= 0) {
      setMsg("Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: n,
          categoryId,
          date,
          description,
          merchant,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMsg("Expense saved.");
      setAmount("");
      setDescription("");
      setMerchant("");
      onSaved?.();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-xl p-6">
      <h2 className="text-lg font-medium text-white">Add expense</h2>
      <form onSubmit={(e) => void submit(e)} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-400">Amount</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            required
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400">Category</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-400">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            required
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400">Payment</span>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-slate-400">Merchant</span>
          <input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-slate-400">Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save expense"}
          </button>
          {msg && <span className="text-sm text-slate-400">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
