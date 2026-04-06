import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCategoryId } from "@/lib/resolve-category";
import { resolveExpenseDate, startOfWeekMonday } from "@/lib/parse-relative-date";
import { CATEGORY_GROUPS } from "@/lib/category-groups";

export type ChatToolContext = {
  lastExpenseIds: string[];
  now?: Date;
};

function periodBounds(
  period: string,
  now: Date,
): { start: Date; end: Date; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === "this_month") {
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return { start, end, label: "this month" };
  }
  if (period === "last_month") {
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    return { start, end, label: "last month" };
  }
  if (period === "last_7_days") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: "last 7 days" };
  }
  if (period === "last_30_days") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: "last 30 days" };
  }
  if (period === "this_week") {
    const start = startOfWeekMonday(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "this week" };
  }
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { start, end, label: "this month" };
}

export async function executeChatTool(
  userId: string,
  name: string,
  args: Record<string, unknown>,
  ctx: ChatToolContext,
): Promise<{ result: unknown; newExpenseIds?: string[] }> {
  const now = ctx.now ?? new Date();
  const lastId = ctx.lastExpenseIds[0];

  switch (name) {
    case "add_expenses": {
      const items = args.items as {
        amount: number;
        categoryHint: string;
        dateHint?: string;
        merchant?: string;
        description?: string;
        paymentMethod?: string;
      }[];
      const created: string[] = [];
      const details: object[] = [];
      for (const item of items) {
        const cat = await resolveCategoryId(userId, item.categoryHint);
        if (!cat) {
          details.push({ error: "Could not resolve category", item });
          continue;
        }
        const date = resolveExpenseDate(item.dateHint, now);
        const exp = await prisma.expense.create({
          data: {
            userId,
            categoryId: cat.id,
            amount: item.amount,
            date,
            merchant: item.merchant ?? "",
            description: item.description ?? "",
            paymentMethod: item.paymentMethod ?? "card",
          },
          include: { category: true },
        });
        created.push(exp.id);
        details.push({
          id: exp.id,
          amount: exp.amount,
          category: exp.category.name,
          date: exp.date.toISOString().slice(0, 10),
          merchant: exp.merchant,
        });
      }
      return { result: { created: details, count: created.length }, newExpenseIds: created };
    }

    case "query_expenses": {
      const from = args.from as string | undefined;
      const to = args.to as string | undefined;
      const categorySlug = args.categorySlug as string | undefined;
      const q = args.q as string | undefined;
      const limit = Math.min(50, Math.max(1, (args.limit as number) ?? 20));
      const sort = (args.sort as string) ?? "date-desc";

      const where: Prisma.ExpenseWhereInput = { userId };
      const qDate: Prisma.DateTimeFilter = {};
      if (from) qDate.gte = new Date(from);
      if (to) {
        const t = new Date(to);
        t.setHours(23, 59, 59, 999);
        qDate.lte = t;
      }
      if (Object.keys(qDate).length) where.date = qDate;
      if (categorySlug) {
        const cat = await prisma.category.findFirst({
          where: { userId, slug: categorySlug },
        });
        if (cat) where.categoryId = cat.id;
      }
      if (q) {
        where.OR = [
          { description: { contains: q } },
          { merchant: { contains: q } },
        ];
      }
      let orderBy:
        | { date: "asc" | "desc" }
        | { amount: "asc" | "desc" } = { date: "desc" };
      if (sort === "amount-desc") orderBy = { amount: "desc" };
      if (sort === "amount-asc") orderBy = { amount: "asc" };
      if (sort === "date-asc") orderBy = { date: "asc" };

      const rows = await prisma.expense.findMany({
        where,
        orderBy,
        take: limit,
        include: { category: true },
      });
      return {
        result: {
          expenses: rows.map((e) => ({
            id: e.id,
            amount: e.amount,
            category: e.category.name,
            date: e.date.toISOString().slice(0, 10),
            merchant: e.merchant,
            description: e.description,
            paymentMethod: e.paymentMethod,
          })),
        },
      };
    }

    case "get_spending_summary": {
      const period = (args.period as string) ?? "this_month";
      const categorySlug = args.categorySlug as string | undefined;
      const categoryGroup = (args.categoryGroup as string | undefined)?.toLowerCase();
      const categorySlugs = args.categorySlugs as string[] | undefined;
      const { start, end, label } = periodBounds(period, now);
      const where: Prisma.ExpenseWhereInput = {
        userId,
        date: { gte: start, lte: end },
      };
      if (categoryGroup && CATEGORY_GROUPS[categoryGroup]) {
        const slugs = CATEGORY_GROUPS[categoryGroup];
        const cats = await prisma.category.findMany({
          where: { userId, slug: { in: slugs } },
        });
        if (cats.length) where.categoryId = { in: cats.map((c) => c.id) };
      } else if (categorySlugs?.length) {
        const cats = await prisma.category.findMany({
          where: { userId, slug: { in: categorySlugs } },
        });
        if (cats.length) where.categoryId = { in: cats.map((c) => c.id) };
      } else if (categorySlug) {
        const cat = await prisma.category.findFirst({
          where: { userId, slug: categorySlug },
        });
        if (cat) where.categoryId = cat.id;
      }
      const agg = await prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      });
      const byCat = await prisma.expense.groupBy({
        by: ["categoryId"],
        where,
        _sum: { amount: true },
        orderBy: { categoryId: "asc" },
      });
      const cats = await prisma.category.findMany({
        where: { userId, id: { in: byCat.map((b) => b.categoryId) } },
      });
      const cmap = new Map(cats.map((c) => [c.id, c.name]));
      return {
        result: {
          period: label,
          total: agg._sum?.amount ?? 0,
          transactionCount: agg._count,
          byCategory: byCat.map((b) => ({
            category: cmap.get(b.categoryId) ?? "?",
            amount: b._sum?.amount ?? 0,
          })),
        },
      };
    }

    case "compare_months": {
      const y = now.getFullYear();
      const m = now.getMonth();
      const thisStart = new Date(y, m, 1);
      const thisEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
      const prevStart = new Date(y, m - 1, 1);
      const prevEnd = new Date(y, m, 0, 23, 59, 59, 999);

      const [thisMonth, lastMonth, thisByCat, lastByCat] = await prisma.$transaction([
        prisma.expense.aggregate({
          where: { userId, date: { gte: thisStart, lte: thisEnd } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { userId, date: { gte: prevStart, lte: prevEnd } },
          _sum: { amount: true },
        }),
        prisma.expense.groupBy({
          by: ["categoryId"],
          where: { userId, date: { gte: thisStart, lte: thisEnd } },
          _sum: { amount: true },
          orderBy: { categoryId: "asc" },
        }),
        prisma.expense.groupBy({
          by: ["categoryId"],
          where: { userId, date: { gte: prevStart, lte: prevEnd } },
          _sum: { amount: true },
          orderBy: { categoryId: "asc" },
        }),
      ]);
      const t = thisMonth._sum?.amount ?? 0;
      const p = lastMonth._sum?.amount ?? 0;
      const pct = p > 0 ? ((t - p) / p) * 100 : t > 0 ? 100 : 0;
      const catList = await prisma.category.findMany({ where: { userId } });
      const names = new Map(catList.map((c) => [c.id, c.name]));
      const catIds = new Set([
        ...thisByCat.map((c) => c.categoryId),
        ...lastByCat.map((c) => c.categoryId),
      ]);
      const deltas: { category: string; thisMonth: number; lastMonth: number; changePct: number }[] =
        [];
      for (const id of Array.from(catIds)) {
        const a = thisByCat.find((x) => x.categoryId === id)?._sum?.amount ?? 0;
        const b = lastByCat.find((x) => x.categoryId === id)?._sum?.amount ?? 0;
        const cp = b > 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0;
        deltas.push({
          category: names.get(id) ?? "?",
          thisMonth: a,
          lastMonth: b,
          changePct: Math.round(cp * 10) / 10,
        });
      }
      return {
        result: {
          thisMonth: t,
          lastMonth: p,
          percentChangeOverall: Math.round(pct * 10) / 10,
          byCategoryChange: deltas.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)),
        },
      };
    }

    case "update_expense": {
      let expenseId =
        (args.expenseId as string) || (args.useLastCreated ? lastId : undefined);

      if (
        !expenseId &&
        args.lookupDateHint &&
        args.lookupCategoryHint
      ) {
        const day = resolveExpenseDate(String(args.lookupDateHint), now);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        const cat = await resolveCategoryId(userId, String(args.lookupCategoryHint));
        if (cat) {
          const rows = await prisma.expense.findMany({
            where: {
              userId,
              categoryId: cat.id,
              date: { gte: day, lte: dayEnd },
            },
            orderBy: [{ date: "desc" }, { amount: "desc" }],
          });
          const merchantHint = (args.lookupMerchantHint as string | undefined)
            ?.toLowerCase()
            .trim();
          let pick = rows[0];
          if (merchantHint && rows.length) {
            const byMerch = rows.find((r) =>
              r.merchant.toLowerCase().includes(merchantHint),
            );
            if (byMerch) pick = byMerch;
          }
          expenseId = pick?.id;
        }
      }

      if (!expenseId) {
        return {
          result: {
            error:
              "No expense found — use useLastCreated, expenseId, or lookupDateHint + lookupCategoryHint (e.g. yesterday + groceries)",
          },
        };
      }
      const existing = await prisma.expense.findFirst({
        where: { id: expenseId, userId },
        include: { category: true },
      });
      if (!existing) {
        return { result: { error: "Expense not found" } };
      }
      const prevAmount = existing.amount;
      const prevCategoryName = existing.category.name;
      const data: Record<string, unknown> = {};
      if (args.amount !== undefined) data.amount = args.amount as number;
      if (args.merchant !== undefined) data.merchant = args.merchant as string;
      if (args.description !== undefined) data.description = args.description as string;
      if (args.paymentMethod !== undefined) data.paymentMethod = args.paymentMethod as string;
      if (args.dateHint !== undefined) {
        data.date = resolveExpenseDate(args.dateHint as string, now);
      }
      if (args.categoryHint !== undefined) {
        const cat = await resolveCategoryId(userId, args.categoryHint as string);
        if (!cat) return { result: { error: "Category not found" } };
        data.categoryId = cat.id;
      }
      const updated = await prisma.expense.update({
        where: { id: expenseId },
        data,
        include: { category: true },
      });
      return {
        result: {
          ok: true,
          previousAmount: prevAmount,
          previousCategory: prevCategoryName,
          expense: {
            id: updated.id,
            amount: updated.amount,
            category: updated.category.name,
            date: updated.date.toISOString().slice(0, 10),
            merchant: updated.merchant,
          },
        },
      };
    }

    case "delete_expense": {
      const expenseId = (args.expenseId as string) || (args.useLastCreated ? lastId : undefined);
      if (!expenseId) {
        return { result: { error: "No expense to delete" } };
      }
      const existing = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
      if (!existing) return { result: { error: "Not found" } };
      await prisma.expense.delete({ where: { id: expenseId } });
      return {
        result: {
          ok: true,
          deleted: {
            id: expenseId,
            amount: existing.amount,
            merchant: existing.merchant,
          },
        },
      };
    }

    case "delete_expenses_batch": {
      const confirmed = args.confirmed === true;
      let from = args.from as string | undefined;
      let to = args.to as string | undefined;
      const periodPreset = args.period as string | undefined;
      if (periodPreset === "this_week" || periodPreset === "last_7_days") {
        const b = periodBounds(
          periodPreset === "this_week" ? "this_week" : "last_7_days",
          now,
        );
        from = b.start.toISOString().slice(0, 10);
        to = b.end.toISOString().slice(0, 10);
      }
      const categorySlug = args.categorySlug as string | undefined;
      const q = args.q as string | undefined;

      const where: Prisma.ExpenseWhereInput = { userId };
      const df: Prisma.DateTimeFilter = {};
      if (from) df.gte = new Date(from);
      if (to) {
        const t = new Date(to);
        t.setHours(23, 59, 59, 999);
        df.lte = t;
      }
      if (Object.keys(df).length) where.date = df;
      if (categorySlug) {
        const cat = await prisma.category.findFirst({
          where: { userId, slug: categorySlug },
        });
        if (cat) where.categoryId = cat.id;
      }
      if (q) {
        where.OR = [
          { description: { contains: q } },
          { merchant: { contains: q } },
        ];
      }

      const matches = await prisma.expense.findMany({ where });
      const totalAmount = matches.reduce((s, e) => s + e.amount, 0);
      if (matches.length === 0) {
        return { result: { ok: true, deleted: 0, message: "No matching expenses" } };
      }
      if (!confirmed && matches.length > 1) {
        return {
          result: {
            needsConfirmation: true,
            count: matches.length,
            totalAmount,
            preview: matches.slice(0, 5).map((e) => ({
              id: e.id,
              amount: e.amount,
              date: e.date.toISOString().slice(0, 10),
            })),
          },
        };
      }
      await prisma.expense.deleteMany({ where: { id: { in: matches.map((m) => m.id) } } });
      return {
        result: {
          ok: true,
          deleted: matches.length,
          totalAmount,
        },
      };
    }

    case "get_budget_status": {
      const y = (args.year as number) ?? now.getFullYear();
      const mo = (args.month as number) ?? now.getMonth() + 1;
      const budgets = await prisma.budget.findMany({
        where: { userId, year: y, month: mo },
        include: { category: true },
      });
      const start = new Date(y, mo - 1, 1);
      const end = new Date(y, mo, 0, 23, 59, 59, 999);
      const monthSpend = await prisma.expense.aggregate({
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      });
      const byCat = await prisma.expense.groupBy({
        by: ["categoryId"],
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
        orderBy: { categoryId: "asc" },
      });
      const spentMap = new Map(byCat.map((b) => [b.categoryId, b._sum?.amount ?? 0]));
      const totalSpent = monthSpend._sum?.amount ?? 0;

      const lines = budgets.map((b) => {
        let spent = 0;
        if (b.kind === "OVERALL") spent = totalSpent;
        else if (b.categoryId) spent = spentMap.get(b.categoryId) ?? 0;
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        return {
          kind: b.kind,
          category: b.category?.name ?? "Overall",
          limit: b.amount,
          spent,
          percentUsed: Math.round(pct * 10) / 10,
          over: spent > b.amount,
          nearLimit: pct >= 90,
        };
      });

      return { result: { year: y, month: mo, budgets: lines } };
    }

    case "get_top_expenses": {
      const period = (args.period as string) ?? "last_7_days";
      const limit = Math.min(20, Math.max(1, (args.limit as number) ?? 5));
      const { start, end } = periodBounds(period, now);
      const rows = await prisma.expense.findMany({
        where: { userId, date: { gte: start, lte: end } },
        orderBy: { amount: "desc" },
        take: limit,
        include: { category: true },
      });
      return {
        result: {
          period,
          top: rows.map((e, i) => ({
            rank: i + 1,
            amount: e.amount,
            category: e.category.name,
            merchant: e.merchant,
            date: e.date.toISOString().slice(0, 10),
          })),
        },
      };
    }

    case "spending_insights": {
      const y = now.getFullYear();
      const m = now.getMonth();
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      const prevStart = new Date(y, m - 1, 1);
      const prevEnd = new Date(y, m, 0, 23, 59, 59, 999);

      const [cur, prev, groups, topMerch] = await prisma.$transaction([
        prisma.expense.aggregate({
          where: { userId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { userId, date: { gte: prevStart, lte: prevEnd } },
          _sum: { amount: true },
        }),
        prisma.expense.groupBy({
          by: ["categoryId"],
          where: { userId, date: { gte: start, lte: end } },
          _sum: { amount: true },
          orderBy: { _sum: { amount: "desc" } },
        }),
        prisma.expense.groupBy({
          by: ["merchant"],
          where: {
            userId,
            date: { gte: start, lte: end },
            merchant: { not: "" },
          },
          _sum: { amount: true },
          orderBy: { _sum: { amount: "desc" } },
          take: 5,
        }),
      ]);
      const cats = await prisma.category.findMany({
        where: { userId, id: { in: groups.map((g) => g.categoryId) } },
      });
      const cmap = new Map(cats.map((c) => [c.id, c.name]));
      const ct = cur._sum?.amount ?? 0;
      const pt = prev._sum?.amount ?? 0;
      const mom = pt > 0 ? ((ct - pt) / pt) * 100 : 0;
      return {
        result: {
          thisMonthTotal: ct,
          lastMonthTotal: pt,
          monthOverMonthPct: Math.round(mom * 10) / 10,
          topCategories: groups.map((g) => ({
            category: cmap.get(g.categoryId) ?? "?",
            amount: g._sum?.amount ?? 0,
          })),
          topMerchants: topMerch.map((t) => ({
            merchant: t.merchant,
            amount: t._sum?.amount ?? 0,
          })),
          hints: [
            ct > pt * 1.1 ? "Spending is up vs last month — review discretionary categories." : null,
            groups[0] ? `Largest category: ${cmap.get(groups[0].categoryId)}` : null,
          ].filter(Boolean),
        },
      };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}
