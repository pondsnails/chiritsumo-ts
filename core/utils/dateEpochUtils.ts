/** Epoch-based date helpers (Unix seconds at local midnight) */
export function getUnixMidnight(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export function getTodayUnixMidnight(): number {
  return getUnixMidnight(new Date());
}

export function addDaysUnixMidnight(baseUnixMidnight: number, days: number): number {
  return baseUnixMidnight + days * 24 * 60 * 60;
}
