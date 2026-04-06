"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = (await res.json()) as { user: unknown | null };
      if (cancelled) return;
      if (data.user) router.replace("/dashboard");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="glass max-w-lg rounded-2xl p-10 text-center">
        <h1 className="text-3xl font-bold text-white">
          Expense<span className="text-indigo-400">IQ</span>
        </h1>
        <p className="mt-3 text-slate-400">
          Expense tracking with an AI that understands natural language — add, query, and fix
          transactions without forms.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl border border-slate-600 px-6 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
