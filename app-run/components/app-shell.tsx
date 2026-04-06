"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChatPanel } from "@/components/chat-panel";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 flex-col border-r border-slate-800 bg-slate-950/80 p-4 md:flex">
        <div className="mb-8 text-lg font-semibold tracking-tight text-white">
          Expense<span className="text-indigo-400">IQ</span>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition",
                pathname === n.href
                  ? "bg-indigo-500/15 text-indigo-200"
                  : "text-slate-400 hover:bg-slate-800/80 hover:text-white",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
              window.location.href = "/login";
            }}
            className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/50 px-4 py-3 md:hidden">
          <div className="flex flex-wrap gap-2 text-xs">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-md px-2 py-1",
                  pathname === n.href ? "bg-indigo-500/20 text-indigo-200" : "text-slate-400",
                )}
              >
                {n.label}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white"
          >
            {chatOpen ? "Hide" : "AI"}
          </button>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
          <div
            className={cn(
              "border-l border-slate-800 bg-slate-950/90 transition-all",
              chatOpen ? "w-full max-w-md flex-shrink-0" : "w-0 overflow-hidden p-0",
            )}
          >
            {chatOpen && <ChatPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
