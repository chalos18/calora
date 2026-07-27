import { describe, expect, it } from "vitest";
import { dateInputPlaceholder, parseDateInput } from "./date-input";

describe("dateInputPlaceholder", () => {
  it("puts day first for New Zealand", () => {
    expect(dateInputPlaceholder("en-NZ")).toBe("DD-MM-YYYY");
  });

  it("puts month first for the United States", () => {
    // The same code must not hardcode one country's habit as "correct".
    expect(dateInputPlaceholder("en-US")).toBe("MM-DD-YYYY");
  });

  it("puts year first where that is the convention", () => {
    expect(dateInputPlaceholder("ja-JP")).toBe("YYYY-MM-DD");
  });
});

describe("parseDateInput", () => {
  it("reads a New Zealand date as day first", () => {
    expect(parseDateInput("15-01-1996", "en-NZ")).toBe("1996-01-15");
  });

  it("reads the same digits as month first in the United States", () => {
    // 01-02 is 1 February in NZ and 2 January in the US. Guessing wrongly
    // shifts someone's age and therefore their calorie target.
    expect(parseDateInput("01-02-1996", "en-NZ")).toBe("1996-02-01");
    expect(parseDateInput("01-02-1996", "en-US")).toBe("1996-01-02");
  });

  it("accepts slashes and dots as well as dashes", () => {
    expect(parseDateInput("15/01/1996", "en-NZ")).toBe("1996-01-15");
    expect(parseDateInput("15.01.1996", "en-NZ")).toBe("1996-01-15");
  });

  it("accepts single-digit day and month", () => {
    expect(parseDateInput("5-1-1996", "en-NZ")).toBe("1996-01-05");
  });

  it("rejects a day that does not exist in that month", () => {
    // 31 February would otherwise roll over to 2 or 3 March silently.
    expect(parseDateInput("31-02-1996", "en-NZ")).toBeNull();
  });

  it("accepts a real leap day and rejects a fake one", () => {
    expect(parseDateInput("29-02-1996", "en-NZ")).toBe("1996-02-29");
    expect(parseDateInput("29-02-1997", "en-NZ")).toBeNull();
  });

  it("rejects incomplete or malformed input", () => {
    expect(parseDateInput("", "en-NZ")).toBeNull();
    expect(parseDateInput("15-01", "en-NZ")).toBeNull();
    expect(parseDateInput("not a date", "en-NZ")).toBeNull();
    expect(parseDateInput("15-13-1996", "en-NZ")).toBeNull();
  });

  it("rejects a two-digit year rather than guessing the century", () => {
    expect(parseDateInput("15-01-96", "en-NZ")).toBeNull();
  });
});
