import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const prevStart = new Date(year, month - 2, 1);
  const prevEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);

  const [currentMonthExpenses, prevMonthExpenses, allTimeAgg, categoryMonth, topMerchants] =
    await prisma.$transaction([
      prisma.expense.aggregate({
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: prevStart, lte: prevEnd } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
        orderBy: { categoryId: "asc" },
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
        take: 8,
      }),
    ]);

  const catIds = categoryMonth.map((c) => c.categoryId);
  const cats = await prisma.category.findMany({
    where: { id: { in: catIds } },
  });
  const catMap = new Map(cats.map((c) => [c.id, c]));

  const byCategory = categoryMonth.map((row) => ({
    categoryId: row.categoryId,
    name: catMap.get(row.categoryId)?.name ?? "Unknown",
    color: catMap.get(row.categoryId)?.color ?? "#888",
    amount: row._sum?.amount ?? 0,
  }));

  const budgets = await prisma.budget.findMany({
    where: { userId, year, month },
    include: { category: true },
  });

  const spentByCategoryId = new Map(
    categoryMonth.map((c) => [c.categoryId, c._sum?.amount ?? 0]),
  );

  const budgetProgress = await Promise.all(
    budgets.map(async (b) => {
      let spent = 0;
      if (b.kind === "OVERALL") {
        spent = currentMonthExpenses._sum.amount ?? 0;
      } else if (b.categoryId) {
        spent = spentByCategoryId.get(b.categoryId) ?? 0;
      }
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      const alert =
        b.alertAt != null && spent >= b.alertAt * b.amount
          ? true
          : pct >= 90;
      return {
        ...b,
        spent,
        percentUsed: Math.round(pct * 10) / 10,
        alert,
      };
    }),
  );

  return NextResponse.json({
    month: { year, month },
    currentMonthTotal: currentMonthExpenses._sum.amount ?? 0,
    currentMonthCount: currentMonthExpenses._count,
    previousMonthTotal: prevMonthExpenses._sum.amount ?? 0,
    allTimeTotal: allTimeAgg._sum.amount ?? 0,
    byCategory,
    topMerchants: topMerchants.map((m) => ({
      merchant: m.merchant || "—",
      amount: m._sum?.amount ?? 0,
    })),
    budgetProgress,
  });
}
