import { describe, expect, it } from "vitest";
import type { GoalType } from "./macro-targets.js";
import { deriveMacroTargets, KCAL_PER_G } from "./macro-targets.js";

const reconstructKcal = ({
  proteinG,
  fatG,
  carbsG,
}: {
  proteinG: number;
  fatG: number;
  carbsG: number;
}) =>
  proteinG * KCAL_PER_G.protein +
  fatG * KCAL_PER_G.fat +
  carbsG * KCAL_PER_G.carbs;

const ALL_GOALS: GoalType[] = ["lose", "maintain", "gain", "build_muscle"];

describe("deriveMacroTargets", () => {
  it("keeps the calorie target at TDEE when maintaining", () => {
    const targets = deriveMacroTargets({
      tdee: 2000,
      weightKg: 60,
      goalType: "maintain",
    });

    expect(targets.kcal).toBe(2000);
    // 1.6 g/kg x 60 kg
    expect(targets.proteinG).toBe(96);
  });

  it("sets fat from bodyweight and lets carbohydrate absorb the remainder", () => {
    const targets = deriveMacroTargets({
      tdee: 2000,
      weightKg: 60,
      goalType: "maintain",
    });

    // 0.9 g/kg x 60 kg
    expect(targets.fatG).toBe(54);
    // (2000 - 96x4 - 54x9) / 4 = (2000 - 384 - 486) / 4 = 282.5
    expect(targets.carbsG).toBe(283);
  });

  it("applies a 500 kcal deficit and raises protein when cutting", () => {
    const targets = deriveMacroTargets({
      tdee: 2000,
      weightKg: 60,
      goalType: "lose",
    });

    expect(targets.kcal).toBe(1500);
    // 2.2 g/kg x 60 kg - the cutting target is the highest, because a
    // deficit is exactly when lean mass needs protecting.
    expect(targets.proteinG).toBe(132);
  });

  it.each(ALL_GOALS)("reconciles back to the calorie goal for %s", (goalType) => {
    const targets = deriveMacroTargets({ tdee: 2200, weightKg: 70, goalType });

    // Whole-gram rounding across three macros can drift a few kcal; anything
    // larger means the split is not actually spending the calorie budget.
    expect(reconstructKcal(targets)).toBeCloseTo(targets.kcal, -1);
  });

  describe("when the deficit cannot fit protein and fat", () => {
    // 90 kg cutting from a low TDEE: 2.2 g/kg protein (792 kcal) plus
    // 0.9 g/kg fat (729 kcal) is 1521 kcal against a 1300 kcal target.
    const severe = {
      tdee: 1800,
      weightKg: 90,
      goalType: "lose",
    } as const;

    it("never returns negative carbohydrate", () => {
      expect(deriveMacroTargets(severe).carbsG).toBeGreaterThanOrEqual(0);
    });

    it("never drops protein below the 1.6 g/kg floor", () => {
      // The whole point of D11: squeezing calories must not squeeze protein.
      expect(deriveMacroTargets(severe).proteinG).toBeGreaterThanOrEqual(144);
    });

    it("does not overspend the calorie goal", () => {
      const targets = deriveMacroTargets(severe);
      expect(reconstructKcal(targets)).toBeLessThanOrEqual(targets.kcal);
    });

    it("is still reported as feasible", () => {
      expect(deriveMacroTargets(severe).isFeasible).toBe(true);
    });
  });

  describe("when even the floors exceed the calorie goal", () => {
    // 90 kg at a 1000 kcal target. The floors alone - 1.6 g/kg protein
    // (576 kcal) and 0.8 g/kg fat (648 kcal) - come to 1224 kcal.
    const impossible = {
      tdee: 1500,
      weightKg: 90,
      goalType: "lose",
    } as const;

    it("holds both floors rather than honouring the calorie goal", () => {
      const targets = deriveMacroTargets(impossible);

      expect(targets.proteinG).toBe(144);
      expect(targets.fatG).toBe(72);
      expect(targets.carbsG).toBe(0);
    });

    it("reports the goal as infeasible so the UI can say so", () => {
      expect(deriveMacroTargets(impossible).isFeasible).toBe(false);
    });
  });
});
