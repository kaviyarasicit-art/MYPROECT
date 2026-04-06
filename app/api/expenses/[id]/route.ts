import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

const updateSchema = z
  .object({
    amount: z.number().positive().optional(),
    categoryId: z.string().optional(),
    date: z.string().optional(),
    description: z.string().optional(),
    merchant: z.string().optional(),
    paymentMethod: z.string().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
    path: [],
  });

async function ensureAuthenticated() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const userId = await ensureAuthenticated();
  if (userId instanceof NextResponse) return userId;
  const { id } = params;
  const expense = await prisma.expense.findFirst({
    where: { id, userId },
    include: { category: true },
  });
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  return NextResponse.json({ expense });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await ensureAuthenticated();
  if (userId instanceof NextResponse) return userId;
  const { id } = params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const expense = await prisma.expense.findFirst({ where: { id, userId } });
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  const { amount, categoryId, date, description, merchant, paymentMethod } = parsed.data;
  if (amount !== undefined) data.amount = amount;
  if (description !== undefined) data.description = description;
  if (merchant !== undefined) data.merchant = merchant;
  if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
  if (date) {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    data.date = parsedDate;
  }
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    data.categoryId = categoryId;
  }

  const updated = await prisma.expense.update({
    where: { id },
    data,
    include: { category: true },
  });

  return NextResponse.json({ expense: updated });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const userId = await ensureAuthenticated();
  if (userId instanceof NextResponse) return userId;
  const { id } = params;
  const expense = await prisma.expense.findFirst({
    where: { id, userId },
    include: { category: true },
  });
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ expense });
}
