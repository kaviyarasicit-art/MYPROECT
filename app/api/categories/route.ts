import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
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
  const name = parsed.data.name.trim();
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "custom";
  const baseSlug = slug;
  let n = 0;
  let uniqueSlug = baseSlug;
  while (
    await prisma.category.findUnique({
      where: { userId_slug: { userId, slug: uniqueSlug } },
    })
  ) {
    n += 1;
    uniqueSlug = `${baseSlug}-${n}`;
  }
  const cat = await prisma.category.create({
    data: {
      userId,
      name,
      slug: uniqueSlug,
      color: parsed.data.color ?? "#6366f1",
      isCustom: true,
    },
  });
  return NextResponse.json({ category: cat });
}
