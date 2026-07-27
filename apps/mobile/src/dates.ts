/** Local calendar date as YYYY-MM-DD. Diary days are local, never UTC. */
export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const fromIsoDate = (iso: string): Date => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
};

export const addDays = (iso: string, days: number): string => {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

export const today = (): string => toIsoDate(new Date());

export const formatDayHeading = (iso: string): string => {
  if (iso === today()) return "Today";
  if (iso === addDays(today(), -1)) return "Yesterday";
  if (iso === addDays(today(), 1)) return "Tomorrow";

  return fromIsoDate(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};
