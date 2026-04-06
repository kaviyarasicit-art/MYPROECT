import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { budgetScopeKey } from "@/lib/budget-scope";

const upsertSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  kind: z.enum(["OVERALL", "CATEGORY"]),
  categoryId: z.string().nullable().optional(),
  amount: z.number().positive(),
  alertAt: z.number().positive().nullable().optional(),
});

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? "", 10);
  const month = parseInt(searchParams.get("month") ?? "", 10);
  if (Number.isNaN(year) || Number.isNaN(month)) {
    return NextResponse.json({ error: "year and month required" }, { status: 400 });
  }
  const budgets = await prisma.budget.findMany({
    where: { userId, year, month },
    include: { category: true },
  });
  return NextResponse.json({ budgets });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { year, month, kind, amount, alertAt } = parsed.data;
  let categoryId: string | null = parsed.data.categoryId ?? null;
  if (kind === "CATEGORY") {
    if (!categoryId) {
      return NextResponse.json({ error: "categoryId required for category budget" }, { status: 400 });
    }
    const cat = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  } else {
    categoryId = null;
  }
  const scopeKey = budgetScopeKey(
    userId,
    year,
    month,
    kind,
    categoryId,
  );
  const budget = await prisma.budget.upsert({
    where: { scopeKey },
    create: {
      userId,
      year,
      month,
      kind,
      categoryId,
      amount,
      alertAt: alertAt ?? null,
      scopeKey,
    },
    update: { amount, alertAt: alertAt ?? undefined },
    include: { category: true },
  });
  return NextResponse.json({ budget });
}
