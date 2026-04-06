import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

const createSchema = z.object({
  amount: z.number().positive(),
  categoryId: z.string(),
  date: z.string(),
  description: z.string().optional(),
  merchant: z.string().optional(),
  paymentMethod: z.string().optional(),
});

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
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const cat = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId },
  });
  if (!cat) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  const date = new Date(parsed.data.date);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const expense = await prisma.expense.create({
    data: {
      userId,
      categoryId: cat.id,
      amount: parsed.data.amount,
      date,
      description: parsed.data.description ?? "",
      merchant: parsed.data.merchant ?? "",
      paymentMethod: parsed.data.paymentMethod ?? "card",
    },
    include: { category: true },
  });
  return NextResponse.json({ expense });
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const q = searchParams.get("q")?.trim();
  const sort = searchParams.get("sort") ?? "date-desc";
  const paymentMethod = searchParams.get("paymentMethod") ?? undefined;
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

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
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) dateFilter.gte = d;
  }
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    if (!Number.isNaN(d.getTime())) dateFilter.lte = d;
  }
  if (Object.keys(dateFilter).length) where.date = dateFilter;
  if (q) {
    where.OR = [
      { description: { contains: q } },
      { merchant: { contains: q } },
    ];
  }

  let orderBy: Prisma.ExpenseOrderByWithRelationInput = { date: "desc" };
  if (sort === "date-asc") orderBy = { date: "asc" };
  else if (sort === "amount-desc") orderBy = { amount: "desc" };
  else if (sort === "amount-asc") orderBy = { amount: "asc" };
  else if (sort === "category") orderBy = { category: { name: "asc" } };

  const [total, expenses] = await prisma.$transaction([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true },
    }),
  ]);

  return NextResponse.json({
    expenses,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
