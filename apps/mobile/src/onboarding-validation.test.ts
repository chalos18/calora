import { describe, expect, it } from "vitest";
import { validateOnboarding } from "./onboarding-validation";

const valid = {
  email: "ana@example.com",
  birthDate: "15-01-1996",
  heightCm: "165",
  weightKg: "60",
};

const on = new Date(2026, 6, 27);

describe("validateOnboarding", () => {
  it("passes a complete, sensible form", () => {
    expect(validateOnboarding(valid, "en-NZ", on)).toEqual({});
  });

  it("names the field an error belongs to, so it can be shown against it", () => {
    const errors = validateOnboarding({ ...valid, email: "" }, "en-NZ", on);

    expect(Object.keys(errors)).toEqual(["email"]);
    expect(errors.email).toBe("Enter your email address.");
  });

  it("reports every bad field at once rather than one at a time", () => {
    // Fixing one field only to be told about the next is the worst version
    // of this form.
    const errors = validateOnboarding(
      { email: "nope", birthDate: "", heightCm: "", weightKg: "abc" },
      "en-NZ",
      on,
    );

    expect(Object.keys(errors).sort()).toEqual([
      "birthDate",
      "email",
      "heightCm",
      "weightKg",
    ]);
  });

  it("says what a malformed date should look like in the local order", () => {
    const errors = validateOnboarding(
      { ...valid, birthDate: "1996-01-15" },
      "en-NZ",
      on,
    );

    // Telling someone "invalid date" without the expected shape is useless.
    expect(errors.birthDate).toBe("Use DD-MM-YYYY, for example 15-01-1996.");
  });

  it("rejects a date in the future", () => {
    const errors = validateOnboarding(
      { ...valid, birthDate: "15-01-2030" },
      "en-NZ",
      on,
    );

    expect(errors.birthDate).toBe("That date is in the future.");
  });

  it("rejects an implausible age rather than computing a nonsense target", () => {
    const errors = validateOnboarding(
      { ...valid, birthDate: "15-01-1890" },
      "en-NZ",
      on,
    );

    expect(errors.birthDate).toContain("age");
  });

  it("requires an age the energy equation was validated for", () => {
    const errors = validateOnboarding(
      { ...valid, birthDate: "15-01-2020" },
      "en-NZ",
      on,
    );

    // Mifflin-St Jeor is an adult equation; applying it to a six-year-old
    // would produce a confident, wrong calorie goal.
    expect(errors.birthDate).toContain("18");
  });

  it("rejects a height outside anything a person could be", () => {
    expect(validateOnboarding({ ...valid, heightCm: "30" }, "en-NZ", on).heightCm)
      .toBe("Enter a height between 100 and 250 cm.");
    expect(validateOnboarding({ ...valid, heightCm: "300" }, "en-NZ", on).heightCm)
      .toBe("Enter a height between 100 and 250 cm.");
  });

  it("rejects a weight outside anything a person could be", () => {
    expect(validateOnboarding({ ...valid, weightKg: "5" }, "en-NZ", on).weightKg)
      .toBe("Enter a weight between 25 and 400 kg.");
  });

  it("rejects an email without an address shape", () => {
    expect(validateOnboarding({ ...valid, email: "ana@" }, "en-NZ", on).email)
      .toBe("That does not look like an email address.");
  });

  it("accepts a decimal weight", () => {
    expect(validateOnboarding({ ...valid, weightKg: "60.5" }, "en-NZ", on)).toEqual({});
  });
});
