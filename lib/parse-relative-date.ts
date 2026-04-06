/** Monday 00:00:00 local (week containing `d`). */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Resolve natural-language hints to a Date (local midnight) */
export function resolveExpenseDate(hint: string | undefined, now: Date = new Date()): Date {
  if (!hint || hint === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const h = hint.toLowerCase().trim();
  if (h === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (h === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(hint)) {
    const [y, m, day] = hint.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  const parsed = new Date(hint);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
