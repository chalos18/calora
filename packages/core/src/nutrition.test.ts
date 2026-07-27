import { describe, expect, it } from "vitest";
import { scaleMacrosToGrams, scaleNutrientsToGrams } from "./nutrition.js";

// A slice of homemade bread, per 100 g.
const bread = { kcal: 265, protein: 9, carbs: 49, fat: 3.2 };

describe("scaleMacrosToGrams", () => {
  it("scales a per-100g basis to the grams actually eaten", () => {
    // 57 g is 0.57 of the basis: 265 x 0.57 = 151.05
    expect(scaleMacrosToGrams(bread, 57)).toEqual({
      kcal: 151,
      protein: 5.1,
      carbs: 27.9,
      fat: 1.8,
    });
  });

  it("returns the basis unchanged at exactly 100 g", () => {
    expect(scaleMacrosToGrams(bread, 100)).toEqual(bread);
  });

  it("returns zeroes for a zero-gram serving", () => {
    expect(scaleMacrosToGrams(bread, 0)).toEqual({
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});

describe("scaleNutrientsToGrams", () => {
  it("scales every reported nutrient and omits the rest", () => {
    // Absent nutrients must stay absent rather than becoming zero - the
    // coverage calculation depends on being able to tell them apart.
    expect(scaleNutrientsToGrams({ CA: 120, FE: 2.1 }, 50)).toEqual({
      CA: 60,
      FE: 1.05,
    });
  });

  it("preserves an explicit zero", () => {
    expect(scaleNutrientsToGrams({ CA: 0 }, 50)).toEqual({ CA: 0 });
  });
});
