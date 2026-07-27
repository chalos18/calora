import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./db.js";
import { getDayCoverageEntries, getDayTotals, logFood } from "./diary.js";
import { createTestDb, resetDb, seedUserAndFood } from "./test-db.js";

const DATE = "2026-07-27";

let db: Db & { close(): Promise<void> };
let userId: string;
let foodId: string;

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  await resetDb(db);
  ({ userId, foodId } = await seedUserAndFood(db));
});

afterAll(async () => {
  await db.close();
});

const logMilk = (grams: number) =>
  logFood(db, {
    userId,
    foodId,
    date: DATE,
    mealSlot: "breakfast",
    quantity: grams,
    unit: "g",
  });

describe("logFood", () => {
  it("scales the food's macros to the grams eaten", async () => {
    await logMilk(200);

    // Whole milk is 61 kcal and 3.2 g protein per 100 g.
    expect(await getDayTotals(db, userId, DATE)).toEqual({
      kcal: 122,
      protein: 6.4,
      carbs: 9.6,
      fat: 6.6,
    });
  });

  it("freezes micronutrients alongside the macros", async () => {
    await logMilk(200);

    const [entry] = await getDayCoverageEntries(db, userId, DATE);

    // 113 mg calcium per 100 g, doubled.
    expect(entry?.nutrients).toEqual({ CA: 226, FE: 0.06 });
  });

  it("rejects a unit it cannot honestly convert", async () => {
    // No sourced cup portion and no density category: better no answer than
    // an invented one.
    const result = await logFood(db, {
      userId,
      foodId,
      date: DATE,
      mealSlot: "lunch",
      quantity: 1,
      unit: "cup",
    });

    expect(result).toEqual({ error: "unresolvable_unit" });
  });
});

describe("history immutability", () => {
  it("does not move a past day when the food's macros are corrected", async () => {
    await logMilk(200);
    const before = await getDayTotals(db, userId, DATE);

    // An upstream correction, of exactly the kind Open Food Facts contributors
    // make routinely.
    await db.query(
      `UPDATE foods SET kcal = 200, protein = 20, carbs = 20, fat = 20
        WHERE id = $1`,
      [foodId],
    );

    expect(await getDayTotals(db, userId, DATE)).toEqual(before);
  });

  it("does not move a past day when the food's micronutrients are corrected", async () => {
    await logMilk(200);

    await db.query(
      `UPDATE food_nutrients SET amount_per_100g = 999
        WHERE food_id = $1 AND nutrient_id = 'CA'`,
      [foodId],
    );

    const [entry] = await getDayCoverageEntries(db, userId, DATE);
    expect(entry?.nutrients.CA).toBe(226);
  });

  it("survives the food being deleted entirely", async () => {
    await logMilk(200);
    const before = await getDayTotals(db, userId, DATE);

    await db.query(`DELETE FROM foods WHERE id = $1`, [foodId]);

    // food_id is ON DELETE SET NULL: the reference is a convenience, and the
    // diary must not depend on it surviving.
    expect(await getDayTotals(db, userId, DATE)).toEqual(before);
  });
});

describe("coverage", () => {
  it("reports a nutrient as absent rather than zero when the food lacks it", async () => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO foods (name, provenance, kcal, protein, carbs, fat)
       VALUES ('Own-brand crisps', 'openfoodfacts', 530, 6, 51, 33)
       RETURNING id`,
    );

    await logFood(db, {
      userId,
      foodId: rows[0]!.id,
      date: DATE,
      mealSlot: "snacks",
      quantity: 30,
      unit: "g",
    });

    const entries = await getDayCoverageEntries(db, userId, DATE);

    // A barcode product with no micronutrient data on its label must yield an
    // empty nutrient map, not a map of zeroes.
    expect(entries).toEqual([{ grams: 30, nutrients: {} }]);
  });
});
