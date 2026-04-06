import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

function esc(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const q = searchParams.get("q")?.trim();
  const paymentMethod = searchParams.get("paymentMethod") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");

  const where: Prisma.ExpenseWhereInput = { userId };
  if (categoryId) where.categoryId = categoryId;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  const amountFilter: Prisma.FloatFilter = {};
  if (minAmount) {
    const v = parseFloat(minAmount);
    if (!Number.isNaN(v)) amountFilter.gte = v;
  }
  if (maxAmount) {
    const v = parseFloat(maxAmount);
    if (!Number.isNaN(v)) amountFilter.lte = v;
  }
  if (Object.keys(amountFilter).length) where.amount = amountFilter;
  const dateFilter: Prisma.DateTimeFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    dateFilter.lte = d;
  }
  if (Object.keys(dateFilter).length) where.date = dateFilter;
  if (q) {
    where.OR = [
      { description: { contains: q } },
      { merchant: { contains: q } },
    ];
  }

  const rows = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    include: { category: true },
  });

  const header = ["date", "amount", "category", "merchant", "description", "payment_method"];
  const lines = [
    header.join(","),
    ...rows.map((e) =>
      [
        e.date.toISOString().slice(0, 10),
        e.amount,
        esc(e.category.name),
        esc(e.merchant),
        esc(e.description),
        esc(e.paymentMethod),
      ].join(","),
    ),
  ];
  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="expenses.csv"',
    },
  });
}
