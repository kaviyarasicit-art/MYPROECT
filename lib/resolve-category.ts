import { prisma } from "@/lib/prisma";

export async function resolveCategoryId(
  userId: string,
  hint: string,
): Promise<{ id: string; name: string } | null> {
  const h = hint.trim().toLowerCase();
  if (!h) return null;
  const categories = await prisma.category.findMany({ where: { userId } });
  const exact = categories.find(
    (c) => c.slug === h || c.name.toLowerCase() === h,
  );
  if (exact) return { id: exact.id, name: exact.name };
  const partial = categories.find(
    (c) =>
      c.name.toLowerCase().includes(h) ||
      h.includes(c.slug) ||
      c.slug.includes(h),
  );
  if (partial) return { id: partial.id, name: partial.name };
  const keywords: [string, string[]][] = [
    ["groceries", ["grocery", "whole foods", "supermarket"]],
    ["coffee", ["coffee", "starbucks", "cafe", "espresso"]],
    ["food", ["lunch", "breakfast", "dinner", "restaurant", "meal", "snack"]],
    [
      "bills-utilities",
      [
        "electric",
        "electricity",
        "utility",
        "utilities",
        "water bill",
        "power bill",
        "gas bill",
        "internet",
        "phone bill",
      ],
    ],
    ["transport", ["uber", "lyft", "taxi", "gas", "fuel", "parking", "transit", "gas station"]],
    ["entertainment", ["movie", "netflix", "games", "concert"]],
    ["shopping", ["amazon", "clothes", "apparel"]],
    ["healthcare", ["pharmacy", "doctor", "medical", "hospital"]],
    ["restaurants", ["restaurant", "dining", "takeout"]],
  ];
  for (const [slug, keys] of keywords) {
    if (keys.some((k) => h.includes(k))) {
      const c = categories.find((x) => x.slug === slug);
      if (c) return { id: c.id, name: c.name };
    }
  }
  const other = categories.find((c) => c.slug === "other");
  if (other) return { id: other.id, name: other.name };
  return categories[0] ? { id: categories[0].id, name: categories[0].name } : null;
}
