import { describe, expect, it } from "vitest";
import { calculateBmr, calculateTdee } from "./tdee.js";

const male30 = {
  sexAtBirth: "male",
  weightKg: 80,
  heightCm: 180,
  ageYears: 30,
} as const;

const female30 = {
  sexAtBirth: "female",
  weightKg: 60,
  heightCm: 165,
  ageYears: 30,
} as const;

describe("calculateBmr", () => {
  it("adds the male constant of +5", () => {
    // Mifflin-St Jeor, worked by hand:
    // 10(80) + 6.25(180) - 5(30) + 5 = 800 + 1125 - 150 + 5
    expect(
      calculateBmr({
        sexAtBirth: "male",
        weightKg: 80,
        heightCm: 180,
        ageYears: 30,
      }),
    ).toBe(1780);
  });

  it("subtracts the female constant of 161", () => {
    // 10(60) + 6.25(165) - 5(30) - 161 = 600 + 1031.25 - 150 - 161
    expect(
      calculateBmr({
        sexAtBirth: "female",
        weightKg: 60,
        heightCm: 165,
        ageYears: 30,
      }),
    ).toBe(1320.25);
  });
});

describe("calculateTdee", () => {
  it("scales BMR by the sedentary factor of 1.2", () => {
    // BMR 1780 x 1.2
    expect(calculateTdee({ ...male30, activityLevel: "sedentary" })).toBe(2136);
  });

  it("rounds to whole calories", () => {
    // BMR 1320.25 x 1.375 = 1815.34375
    expect(calculateTdee({ ...female30, activityLevel: "light" })).toBe(1815);
  });

  it("spans a 58% range from sedentary to very active", () => {
    const sedentary = calculateTdee({ ...male30, activityLevel: "sedentary" });
    const veryActive = calculateTdee({
      ...male30,
      activityLevel: "very_active",
    });

    // 1.9 / 1.2 - 1 = 0.5833..., the swing that makes activity level a
    // required onboarding input rather than an optional one.
    expect(veryActive / sedentary).toBeCloseTo(1.5833, 4);
  });
});
