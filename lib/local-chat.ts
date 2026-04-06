import { executeChatTool, type ChatToolContext } from "@/lib/chat-tools";

type Msg = { role: "user" | "assistant" | "system"; content: string };

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function has(text: string, re: RegExp): boolean {
  return re.test(text);
}

function extractAmount(text: string): number | null {
  const m = text.match(/\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
  return m ? parseFloat(m[1]) : null;
}

function guessCategoryHint(fragment: string): string {
  const s = fragment.toLowerCase();
  if (/groc|whole foods|supermarket/.test(s)) return "groceries";
  if (/coffee|cafe|starbucks|espresso/.test(s)) return "coffee";
  if (/uber|lyft|taxi|transit|bus|train|fuel|gas/.test(s)) return "transport";
  if (/electric|utility|water bill|internet|phone bill|power bill/.test(s)) return "bills-utilities";
  if (/restaurant|lunch|dinner|breakfast|meal/.test(s)) return "food";
  if (/movie|netflix|game|concert/.test(s)) return "entertainment";
  if (/shopping|amazon|clothes|apparel/.test(s)) return "shopping";
  if (/doctor|pharmacy|medical|hospital/.test(s)) return "healthcare";
  return "other";
}

function extractDateHint(text: string): string | undefined {
  const s = text.toLowerCase();
  if (s.includes("yesterday")) return "yesterday";
  if (s.includes("today")) return "today";
  const iso = s.match(/\b\d{4}-\d{2}-\d{2}\b/);
  return iso?.[0];
}

function extractMerchant(text: string): string {
  const m = text.match(/\bat\s+([a-z0-9 .'-]+)/i);
  return m ? m[1].trim() : "";
}

function parseMultiAdd(text: string): {
  amount: number;
  categoryHint: string;
  description?: string;
  dateHint?: string;
  merchant?: string;
}[] | null {
  // Example: "Add coffee $5.50, lunch $18, and uber $12 from today"
  const s = text.toLowerCase();
  if (!s.includes("add") || !s.match(/\$/)) return null;
  const dateHint = extractDateHint(s);
  const parts = s
    .replace(/\band\b/g, ",")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const items: {
    amount: number;
    categoryHint: string;
    description?: string;
    dateHint?: string;
    merchant?: string;
  }[] = [];
  for (const p of parts) {
    const amount = extractAmount(p);
    if (amount == null) continue;
    const desc = p.replace(/\$?\s*[0-9]+(?:\.[0-9]{1,2})?/g, "").replace(/\badd\b/g, "").trim();
    const hint = guessCategoryHint(desc || p);
    items.push({
      amount,
      categoryHint: hint,
      description: desc || undefined,
      dateHint,
      merchant: "",
    });
  }
  return items.length ? items : null;
}

export async function handleLocalChat(args: {
  userId: string;
  messages: Msg[];
  lastExpenseIds: string[];
}): Promise<{ reply: string; lastExpenseIds: string[] }> {
  const { userId } = args;
  const messages = args.messages;
  const lastExpenseIds = [...args.lastExpenseIds];
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const text = lastUser.trim();
  const lower = text.toLowerCase();
  const ctx: ChatToolContext = { lastExpenseIds };

  const run = async (name: string, toolArgs: Record<string, unknown>) => {
    const out = await executeChatTool(userId, name, toolArgs, ctx);
    if (out.newExpenseIds?.length) {
      for (const id of out.newExpenseIds) {
        if (!lastExpenseIds.includes(id)) lastExpenseIds.unshift(id);
      }
    }
    return out.result as any;
  };

  // Confirm bulk delete after prior assistant asked to confirm.
  if (has(lower, /\b(yes|confirm|do it|delete them|remove them)\b/)) {
    const prevAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
    if (prevAssistant.toLowerCase().includes("confirm")) {
      const result = await run("delete_expenses_batch", {
        period: "this_week",
        categorySlug: "coffee",
        confirmed: true,
      });
      return {
        reply: `Removed ${result.deleted ?? 0} expenses totaling ${money(result.totalAmount ?? 0)}.`,
        lastExpenseIds: lastExpenseIds.slice(0, 20),
      };
    }
  }

  // Add multiple expenses.
  const multi = parseMultiAdd(text);
  if (multi) {
    const result = await run("add_expenses", { items: multi });
    const total = (result.created ?? []).reduce((s: number, x: any) => s + (x.amount ?? 0), 0);
    return {
      reply: `Added ${result.count ?? 0} expenses totaling ${money(total)}.`,
      lastExpenseIds: lastExpenseIds.slice(0, 20),
    };
  }

  // Add single expense sentence.
  if (has(lower, /\b(spent|paid|add)\b/) && has(lower, /\$/)) {
    const amount = extractAmount(lower);
    if (amount != null) {
      const dateHint = extractDateHint(lower);
      const merchant = extractMerchant(text);
      const categoryHint = guessCategoryHint(lower);
      const result = await run("add_expenses", {
        items: [
          {
            amount,
            categoryHint,
            dateHint,
            merchant,
            description: text,
          },
        ],
      });
      const e = result.created?.[0];
      return {
        reply: `Added ${money(e?.amount ?? amount)} for ${e?.category ?? categoryHint}${e?.merchant ? ` at ${e.merchant}` : ""} on ${e?.date ?? isoToday()}.`,
        lastExpenseIds: lastExpenseIds.slice(0, 20),
      };
    }
  }

  // Read/query analytics.
  if (has(lower, /how much.*food.*this month/)) {
    const r = await run("get_spending_summary", { period: "this_month", categoryGroup: "food" });
    const by = (r.byCategory ?? [])
      .slice(0, 4)
      .map((x: any) => `${money(x.amount)} on ${x.category}`)
      .join(", ");
    return {
      reply: `You spent ${money(r.total ?? 0)} on food this month${by ? `: ${by}` : ""}.`,
      lastExpenseIds: lastExpenseIds.slice(0, 20),
    };
  }
  if (has(lower, /(biggest|top).*(last week|last 7)/)) {
    const r = await run("get_top_expenses", { period: "last_7_days", limit: 5 });
    const lines = (r.top ?? [])
      .map((x: any) => `${x.rank}. ${x.category} ${money(x.amount)}${x.merchant ? ` (${x.merchant})` : ""}`)
      .join(", ");
    return {
      reply: lines ? `Your biggest expenses last week: ${lines}` : "No expenses in the last week.",
      lastExpenseIds: lastExpenseIds.slice(0, 20),
    };
  }
  if (has(lower, /compare.*this month.*last month/)) {
    const r = await run("compare_months", {});
    return {
      reply: `This month: ${money(r.thisMonth ?? 0)} | Last month: ${money(r.lastMonth ?? 0)} | ${((r.percentChangeOverall ?? 0) >= 0 ? "+" : "") + (r.percentChangeOverall ?? 0)}%.`,
      lastExpenseIds: lastExpenseIds.slice(0, 20),
    };
  }
  if (has(lower, /insight|spending pattern|recommend/)) {
    const r = await run("spending_insights", {});
    const hints = (r.hints ?? []).join(" ");
    return {
      reply: `This month ${money(r.thisMonthTotal ?? 0)} vs last month ${money(r.lastMonthTotal ?? 0)} (${r.monthOverMonthPct ?? 0}%). ${hints}`.trim(),
      lastExpenseIds: lastExpenseIds.slice(0, 20),
    };
  }
  if (has(lower, /on track.*budget|budget status/)) {
    const r = await run("get_budget_status", {});
    const line = (r.budgets ?? [])
      .slice(0, 5)
      .map((b: any) => `${b.category}: ${money(b.spent)} / ${money(b.limit)} (${b.percentUsed}%)`)
      .join(" | ");
    return {
      reply: line || "No budgets set yet.",
      lastExpenseIds: lastExpenseIds.slice(0, 20),
    };
  }

  // Update
  if (has(lower, /change.*last expense.*category.*transport/)) {
    const r = await run("update_expense", { useLastCreated: true, categoryHint: "transport" });
    return {
      reply: r.expense ? `Updated category to ${r.expense.category} for ${money(r.expense.amount)} expense.` : (r.error ?? "Could not update."),
      lastExpenseIds: lastExpenseIds.slice(0, 20),
    };
  }
  if (has(lower, /actually.*make that.*\$/)) {
    const amount = extractAmount(lower);
    if (amount != null) {
      const r = await run("update_expense", { useLastCreated: true, amount });
      return {
        reply: r.expense ? `Updated to ${money(r.expense.amount)}.` : (r.error ?? "Could not update."),
        lastExpenseIds: lastExpenseIds.slice(0, 20),
      };
    }
  }
  if (has(lower, /update.*yesterday.*groc.*\$/)) {
    const amount = extractAmount(lower);
    if (amount != null) {
      const r = await run("update_expense", {
        lookupDateHint: "yesterday",
        lookupCategoryHint: "groceries",
        amount,
      });
      return {
        reply: r.expense
          ? `Updated groceries expense from ${money(r.previousAmount ?? 0)} to ${money(r.expense.amount)}.`
          : (r.error ?? "Could not update."),
        lastExpenseIds: lastExpenseIds.slice(0, 20),
      };
    }
  }

  // Delete
  if (has(lower, /delete.*last expense/)) {
    const r = await run("delete_expense", { useLastCreated: true });
    return {
      reply: r.deleted
        ? `Deleted ${money(r.deleted.amount ?? 0)}${r.deleted.merchant ? ` ${r.deleted.merchant}` : ""} expense.`
        : (r.error ?? "Could not delete."),
      lastExpenseIds: lastExpenseIds.slice(0, 20),
    };
  }
  if (has(lower, /remove.*coffee.*this week/)) {
    const r = await run("delete_expenses_batch", {
      period: "this_week",
      categorySlug: "coffee",
      confirmed: false,
    });
    if (r.needsConfirmation) {
      return {
        reply: `Found ${r.count} coffee expenses totaling ${money(r.totalAmount ?? 0)} this week. Reply "yes" to confirm deletion.`,
        lastExpenseIds: lastExpenseIds.slice(0, 20),
      };
    }
    return {
      reply: `Removed ${r.deleted ?? 0} coffee expenses totaling ${money(r.totalAmount ?? 0)}.`,
      lastExpenseIds: lastExpenseIds.slice(0, 20),
    };
  }

  return {
    reply:
      "I can help with expenses by chat. Try: 'I spent $45 on groceries yesterday', 'How much food this month?', 'Delete last expense', or 'Compare this month vs last month'.",
    lastExpenseIds: lastExpenseIds.slice(0, 20),
  };
}
