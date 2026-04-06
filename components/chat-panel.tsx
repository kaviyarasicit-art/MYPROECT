"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! I can add expenses, answer questions about your spending, update or delete entries, and compare months. Try: “I spent $45 on groceries at Whole Foods yesterday.”",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const lastExpenseIdsRef = useRef<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          lastExpenseIds: lastExpenseIdsRef.current,
        }),
      });
      const raw = await res.text();
      let data: { reply?: string; error?: string; lastExpenseIds?: string[] } = {};
      if (raw) {
        try {
          data = JSON.parse(raw) as {
            reply?: string;
            error?: string;
            lastExpenseIds?: string[];
          };
        } catch {
          data = {
            error: "Server returned a non-JSON response. Please try again.",
          };
        }
      }
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.error ?? "Something went wrong." },
        ]);
        return;
      }
      if (data.lastExpenseIds?.length) {
        lastExpenseIdsRef.current = data.lastExpenseIds;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? "" }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [input, loading, messages]);

  return (
    <div className="flex h-full min-h-[420px] flex-col border-slate-800 md:min-h-screen md:w-[22rem] lg:w-[26rem]">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">AI assistant</h2>
        <p className="text-xs text-slate-500">Natural language &amp; tools on your data</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[95%] rounded-xl px-3 py-2 text-sm leading-relaxed",
              m.role === "user"
                ? "ml-auto bg-indigo-600/90 text-white"
                : "mr-auto border border-slate-700/80 bg-slate-900/80 text-slate-200",
            )}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-slate-500">Thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-slate-800 p-3">
        <div className="flex gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Ask or add an expense…"
            className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void send()}
            className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
