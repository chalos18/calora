type DatePart = "day" | "month" | "year";

/**
 * The order this locale writes dates in, e.g. day-month-year in New Zealand
 * and month-day-year in the United States.
 *
 * Derived from Intl rather than hardcoded: "01-02-1996" is 1 February to one
 * person and 2 January to another, and reading it wrongly shifts their age,
 * which shifts their calorie target.
 */
const dateInputOrder = (locale?: string): DatePart[] => {
  const parts = new Intl.DateTimeFormat(locale).formatToParts(
    new Date(2026, 10, 5),
  );

  const order = parts
    .map((part) => part.type)
    .filter((type): type is DatePart =>
      type === "day" || type === "month" || type === "year",
    );

  // Intl should always yield all three; fall back to ISO order if it does not.
  return order.length === 3 ? order : ["year", "month", "day"];
};

const PLACEHOLDER: Record<DatePart, string> = {
  day: "DD",
  month: "MM",
  year: "YYYY",
};

export const dateInputPlaceholder = (locale?: string): string =>
  dateInputOrder(locale).map((part) => PLACEHOLDER[part]).join("-");

const isRealDate = (year: number, month: number, day: number): boolean => {
  const date = new Date(year, month - 1, day);
  // Rejects 31 February, which Date would otherwise roll into March.
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

/**
 * Parse a date typed in the local order into an ISO `YYYY-MM-DD` string, or
 * null when it is not a real date. Accepts `-`, `/` and `.` as separators.
 */
export const parseDateInput = (
  input: string,
  locale?: string,
): string | null => {
  const pieces = input.trim().split(/[-/.]/).filter(Boolean);
  if (pieces.length !== 3) return null;
  if (pieces.some((piece) => !/^\d+$/.test(piece))) return null;

  const order = dateInputOrder(locale);
  const values: Partial<Record<DatePart, string>> = {};
  order.forEach((part, index) => {
    values[part] = pieces[index];
  });

  // A two-digit year is ambiguous: '96 could be 1996 or 2096, and for a date
  // of birth that is a 100-year error. Ask rather than guess.
  if (values.year?.length !== 4) return null;

  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);

  if (!isRealDate(year, month, day)) return null;

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
};
