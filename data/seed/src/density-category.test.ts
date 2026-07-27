import { describe, expect, it } from "vitest";
import { inferDensityCategory } from "./density-category.js";

describe("inferDensityCategory", () => {
  it("classifies by the food itself, not by its qualifiers", () => {
    // USDA descriptions are "Food, qualifier, qualifier, ...". Matching the
    // whole string lets a qualifier win: "without salt" made cooked beans
    // classify as salt, converting a cup at 1.217 g/ml instead of 0.717 -
    // 292 g where 172 g was right, frozen straight into the diary.
    expect(
      inferDensityCategory("Beans, black, mature seeds, cooked, boiled, without salt"),
    ).toBe("legume_cooked");
  });

  it("does not read 'mature seeds' as the food being seeds", () => {
    expect(inferDensityCategory("Beans, black, mature seeds, raw")).toBe(
      "legume_dry",
    );
  });

  it("still classifies salt when salt is actually the food", () => {
    expect(inferDensityCategory("Salt, table")).toBe("salt");
  });

  it("distinguishes cooked from dry", () => {
    expect(
      inferDensityCategory("Rice, white, long-grain, regular, cooked"),
    ).toBe("rice_cooked");
    expect(inferDensityCategory("Rice, white, long-grain, regular, raw")).toBe(
      "rice_dry",
    );
  });

  it("classifies ordinary single-word foods", () => {
    expect(inferDensityCategory("Oil, olive, salad or cooking")).toBe("oil");
    expect(inferDensityCategory("Broccoli, raw")).toBe("vegetable_chopped");
    expect(inferDensityCategory("Milk, whole, 3.25% milkfat")).toBe("milk");
    expect(inferDensityCategory("Spinach, raw")).toBe("leafy_raw");
  });

  it("is not fooled by a qualifier naming another food", () => {
    // "Chicken, ... with broth" is meat, not broth.
    expect(
      inferDensityCategory("Chicken, canned, meat only, with broth"),
    ).toBe("meat_diced");
  });

  it("returns null rather than guessing when it cannot tell", () => {
    expect(inferDensityCategory("Unidentifiable substance")).toBeNull();
    expect(inferDensityCategory("")).toBeNull();
  });
});
