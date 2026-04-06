export function budgetScopeKey(
  userId: string,
  year: number,
  month: number,
  kind: "OVERALL" | "CATEGORY",
  categoryId: string | null,
): string {
  if (kind === "OVERALL") {
    return `${userId}:${year}:${month}:OVERALL`;
  }
  return `${userId}:${year}:${month}:CAT:${categoryId}`;
}
