import { describe, expect, it } from "vitest";
import {
  offerableUnits,
  resolveGrams,
  type FoodMeasures,
} from "./portions.js";

const noPortions = { portions: [] };

describe("resolveGrams", () => {
  it("passes grams through untouched and unestimated", () => {
    expect(resolveGrams({ quantity: 57, unit: "g", ...noPortions })).toEqual({
      grams: 57,
      isEstimated: false,
    });
  });

  it("multiplies a sourced portion by the number of servings", () => {
    const result = resolveGrams({
      quantity: 2,
      unit: "1 cup",
      portions: [{ label: "1 cup", grams: 172, source: "usda" }],
    });

    expect(result).toEqual({ grams: 344, isEstimated: false });
  });

  it("prefers a sourced portion over the density table", () => {
    // A real measured weight beats an inferred one, so this must not be
    // flagged estimated even though the food has a density category.
    const result = resolveGrams({
      quantity: 1,
      unit: "cup",
      densityCategory: "legume_cooked",
      portions: [{ label: "cup", grams: 165, source: "usda" }],
    });

    expect(result).toEqual({ grams: 165, isEstimated: false });
  });

  describe("falling back to density", () => {
    it("converts a cup to grams and flags it as estimated", () => {
      expect(
        resolveGrams({
          quantity: 1,
          unit: "cup",
          densityCategory: "legume_cooked",
          ...noPortions,
        }),
      ).toEqual({ grams: 172, isEstimated: true });
    });

    it("gives wildly different weights to the same measure", () => {
      const cupOf = (densityCategory: "oil" | "cereal_flake") =>
        resolveGrams({
          quantity: 1,
          unit: "cup",
          densityCategory,
          ...noPortions,
        })?.grams;

      // The reason a volume unit is meaningless without a per-food weight:
      // one cup spans roughly an eightfold range across ordinary foods.
      expect(cupOf("oil")).toBe(218);
      expect(cupOf("cereal_flake")).toBe(28);
    });

    it("handles tablespoons and teaspoons", () => {
      // 15 ml and 5 ml of oil at 0.9083 g/ml
      expect(
        resolveGrams({
          quantity: 1,
          unit: "tbsp",
          densityCategory: "oil",
          ...noPortions,
        }),
      ).toEqual({ grams: 14, isEstimated: true });
    });

    it("refuses to guess when the food has no density category", () => {
      expect(
        resolveGrams({ quantity: 1, unit: "cup", ...noPortions }),
      ).toBeNull();
    });
  });
});

describe("offerableUnits", () => {
  it("always offers grams", () => {
    expect(offerableUnits(noPortions)).toEqual(["g"]);
  });

  it("offers every sourced portion, in the order they were given", () => {
    expect(
      offerableUnits({
        portions: [
          { label: "cup", grams: 172, source: "usda" },
          { label: "serving", grams: 130, source: "usda" },
        ],
      }),
    ).toEqual(["g", "cup", "serving"]);
  });

  it("offers volume units when the food has a density category", () => {
    expect(offerableUnits({ ...noPortions, densityCategory: "oil" })).toEqual([
      "g",
      "ml",
      "tsp",
      "tbsp",
      "cup",
    ]);
  });

  it("does not offer a volume unit twice when it is also a sourced portion", () => {
    const units = offerableUnits({
      portions: [{ label: "cup", grams: 165, source: "usda" }],
      densityCategory: "legume_cooked",
    });

    expect(units.filter((unit) => unit === "cup")).toHaveLength(1);
  });

  it("offers no volume units without a density category, because none convert", () => {
    expect(offerableUnits({ portions: [] })).not.toContain("cup");
  });

  /**
   * The invariant the two functions exist to keep together: the screen offers a
   * Unit only when Calora can turn it into grams. Previously the offer list and
   * the conversion were written separately and disagreed - a volume unit was
   * offered for any food with a density category, then resolved to nothing.
   */
  it("offers only Units that resolveGrams can actually convert", () => {
    const cases: FoodMeasures[] = [
      { portions: [], densityCategory: "oil" },
      { portions: [] },
      {
        portions: [{ label: "cup", grams: 165, source: "usda" }],
        densityCategory: "legume_cooked",
      },
      { portions: [{ label: "slice", grams: 28, source: "off" }] },
    ];

    for (const food of cases) {
      for (const unit of offerableUnits(food)) {
        expect(resolveGrams({ quantity: 1, unit, ...food })).not.toBeNull();
      }
    }
  });
});
