import { describe, expect, it } from "vitest";
import { parseCsv, toSeedFoods } from "./transform.js";

describe("parseCsv", () => {
  it("reads quoted fields containing commas", () => {
    const csv = 'id,description\n1,"Beans, black, boiled"\n';

    expect(parseCsv(csv)).toEqual([
      { id: "1", description: "Beans, black, boiled" },
    ]);
  });

  it("reads escaped quotes inside a field", () => {
    const csv = 'id,description\n1,"Bob\'s ""special"" beans"\n';

    expect(parseCsv(csv)[0]?.description).toBe('Bob\'s "special" beans');
  });

  it("ignores a trailing newline rather than emitting an empty row", () => {
    expect(parseCsv("id\n1\n\n")).toHaveLength(1);
  });
});

const foodRows = [
  { fdc_id: "100", data_type: "sr_legacy_food", description: "Beans, black, boiled" },
  { fdc_id: "200", data_type: "foundation_food", description: "Broccoli, raw" },
  { fdc_id: "300", data_type: "branded_food", description: "Some cereal" },
];

const nutrientRows = [
  // Black beans
  { fdc_id: "100", nutrient_id: "1008", amount: "132" },
  { fdc_id: "100", nutrient_id: "1003", amount: "8.86" },
  { fdc_id: "100", nutrient_id: "1005", amount: "23.71" },
  { fdc_id: "100", nutrient_id: "1004", amount: "0.54" },
  { fdc_id: "100", nutrient_id: "1087", amount: "27" },
  { fdc_id: "100", nutrient_id: "9999", amount: "1" }, // not tracked
  // Broccoli
  { fdc_id: "200", nutrient_id: "1008", amount: "34" },
  { fdc_id: "200", nutrient_id: "1003", amount: "2.82" },
  { fdc_id: "200", nutrient_id: "1005", amount: "6.64" },
  { fdc_id: "200", nutrient_id: "1004", amount: "0.37" },
  { fdc_id: "200", nutrient_id: "1162", amount: "89.2" },
];

const portionRows = [
  { fdc_id: "100", gram_weight: "172", modifier: "cup", portion_description: "" },
  { fdc_id: "200", gram_weight: "91", modifier: "", portion_description: "1 cup chopped" },
];

describe("toSeedFoods", () => {
  const foods = toSeedFoods({
    foodRows,
    nutrientRows,
    portionRows,
  });

  it("keeps only Foundation and SR Legacy foods", () => {
    // Branded foods come from Open Food Facts at scan time, not from the seed.
    expect(foods.map((f) => f.name)).toEqual([
      "Beans, black, boiled",
      "Broccoli, raw",
    ]);
  });

  it("lifts the four macros onto the food itself", () => {
    const beans = foods.find((f) => f.name === "Beans, black, boiled");

    expect(beans).toMatchObject({
      kcal: 132,
      protein: 8.86,
      carbs: 23.71,
      fat: 0.54,
    });
  });

  it("keeps tracked micronutrients and drops the rest", () => {
    const beans = foods.find((f) => f.name === "Beans, black, boiled");

    // Calcium is tracked; USDA 9999 is not; and macros must not be duplicated
    // into the nutrient rows.
    expect(beans?.nutrients).toEqual([{ nutrientId: "CA", amount: 27 }]);
  });

  it("omits a nutrient entirely rather than recording it as zero", () => {
    const broccoli = foods.find((f) => f.name === "Broccoli, raw");

    // Broccoli has no calcium row in this fixture. It must be absent, so the
    // coverage calculation can tell "no data" from "contains none".
    expect(broccoli?.nutrients.map((n) => n.nutrientId)).toEqual(["VITC"]);
  });

  it("carries portions across with their gram weights", () => {
    const beans = foods.find((f) => f.name === "Beans, black, boiled");

    expect(beans?.portions).toEqual([
      { label: "cup", grams: 172, source: "usda" },
    ]);
  });

  it("falls back to the portion description when there is no modifier", () => {
    const broccoli = foods.find((f) => f.name === "Broccoli, raw");

    expect(broccoli?.portions[0]?.label).toBe("1 cup chopped");
  });

  it("infers a density category so volume units resolve", () => {
    // Without this the density table is unreachable for every seeded food and
    // asking for a cup of anything without a sourced portion just fails.
    const beans = foods.find((f) => f.name === "Beans, black, boiled");
    expect(beans?.densityCategory).toBe("legume_cooked");
  });

  it("leaves the density category unset when it cannot tell", () => {
    const [mystery] = toSeedFoods({
      foodRows: [
        {
          fdc_id: "500",
          data_type: "sr_legacy_food",
          description: "Unidentifiable substance",
        },
      ],
      nutrientRows: [
        { fdc_id: "500", nutrient_id: "1008", amount: "100" },
        { fdc_id: "500", nutrient_id: "1003", amount: "5" },
        { fdc_id: "500", nutrient_id: "1005", amount: "10" },
        { fdc_id: "500", nutrient_id: "1004", amount: "1" },
      ],
      portionRows: [],
    });

    // Guessing a density would put an invented weight into a daily total.
    expect(mystery?.densityCategory).toBeNull();
  });

  it("skips foods with no energy value", () => {
    const result = toSeedFoods({
      foodRows: [
        { fdc_id: "400", data_type: "sr_legacy_food", description: "Mystery" },
      ],
      nutrientRows: [],
      portionRows: [],
    });

    expect(result).toEqual([]);
  });

  it("skips a food missing any macro rather than seeding it as zero", () => {
    // A fabricated zero would freeze onto Log Entries looking measured, and
    // would be indistinguishable from a food that genuinely contains none.
    const result = toSeedFoods({
      foodRows: [
        { fdc_id: "600", data_type: "sr_legacy_food", description: "Half known" },
      ],
      nutrientRows: [
        { fdc_id: "600", nutrient_id: "1008", amount: "100" },
        { fdc_id: "600", nutrient_id: "1003", amount: "5" },
        // carbohydrate and fat are not reported
      ],
      portionRows: [],
    });

    expect(result).toEqual([]);
  });
});
