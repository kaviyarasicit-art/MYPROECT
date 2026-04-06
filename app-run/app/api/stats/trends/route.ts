import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const months = Math.min(24, Math.max(1, parseInt(searchParams.get("months") ?? "6", 10) || 6));
  const now = new Date();
  const points: { year: number; month: number; label: string; total: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    const agg = await prisma.expense.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    points.push({
      year: y,
      month: m,
      label: `${y}-${String(m).padStart(2, "0")}`,
      total: agg._sum.amount ?? 0,
    });
  }

  return NextResponse.json({ points });
}
