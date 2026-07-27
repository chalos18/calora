import { describe, expect, it } from "vitest";
import { computeNutrientCoverage } from "./coverage.js";

const CALCIUM = "CA";

describe("computeNutrientCoverage", () => {
  it("reports full coverage when every entry carries the nutrient", () => {
    const result = computeNutrientCoverage(
      [
        { grams: 100, nutrients: { [CALCIUM]: 120 } },
        { grams: 200, nutrients: { [CALCIUM]: 40 } },
      ],
      CALCIUM,
    );

    expect(result).toEqual({ amount: 160, coverage: 1, isJudgeable: true });
  });

  it("returns a null amount rather than zero when nothing carries it", () => {
    // The distinction the whole feature rests on: Calora does not know, which
    // is not the same as the food containing none. A zero here would read as a
    // deficiency and drive real behaviour.
    const result = computeNutrientCoverage(
      [{ grams: 150, nutrients: {} }],
      CALCIUM,
    );

    expect(result.amount).toBeNull();
    expect(result.coverage).toBe(0);
    expect(result.isJudgeable).toBe(false);
  });

  it("counts an explicit zero as covered", () => {
    // A food that genuinely contains no calcium is data, not a gap.
    const result = computeNutrientCoverage(
      [{ grams: 100, nutrients: { [CALCIUM]: 0 } }],
      CALCIUM,
    );

    expect(result).toEqual({ amount: 0, coverage: 1, isJudgeable: true });
  });

  it("weights coverage by grams eaten, not by number of entries", () => {
    // One small logged item with data does not vouch for a large one without.
    const result = computeNutrientCoverage(
      [
        { grams: 100, nutrients: { [CALCIUM]: 120 } },
        { grams: 200, nutrients: {} },
      ],
      CALCIUM,
    );

    expect(result.amount).toBe(120);
    expect(result.coverage).toBeCloseTo(1 / 3, 5);
    expect(result.isJudgeable).toBe(false);
  });
});
