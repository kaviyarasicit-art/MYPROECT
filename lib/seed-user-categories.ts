import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORY_DEFS } from "@/lib/default-categories";

export async function createDefaultCategoriesForUser(userId: string) {
  await prisma.$transaction(
    DEFAULT_CATEGORY_DEFS.map((c) =>
      prisma.category.create({
        data: {
          userId,
          name: c.name,
          slug: c.slug,
          color: c.color,
          isCustom: false,
        },
      }),
    ),
  );
}
