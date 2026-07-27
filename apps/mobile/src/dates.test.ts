import { describe, expect, it } from "vitest";
import { addDays, fromIsoDate, toIsoDate } from "./dates";

describe("toIsoDate", () => {
  it("uses the local calendar date, not the UTC one", () => {
    // Late evening in a timezone behind UTC is already the next day in UTC.
    // A diary day is the day the person was living in, so toISOString() would
    // silently file dinner under tomorrow.
    const lateEvening = new Date(2026, 6, 27, 23, 30);

    expect(toIsoDate(lateEvening)).toBe("2026-07-27");
  });

  it("zero-pads single-digit months and days", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("moves forward across a month boundary", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("moves backward across a year boundary", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("round-trips", () => {
    expect(addDays(addDays("2026-07-27", 5), -5)).toBe("2026-07-27");
  });
});

describe("fromIsoDate", () => {
  it("parses to local midnight rather than UTC midnight", () => {
    const parsed = fromIsoDate("2026-07-27");

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(27);
    expect(parsed.getHours()).toBe(0);
  });
});
