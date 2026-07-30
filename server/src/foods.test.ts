import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./db.js";
import { getFood } from "./foods.js";
import { createTestDb, resetDb, seedUserAndFood } from "./test-db.js";

let db: Db & { close(): Promise<void> };
let foodId: string;

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  await resetDb(db);
  ({ foodId } = await seedUserAndFood(db));
});

afterAll(async () => {
  await db.close();
});

describe("getFood", () => {
  it("returns the food with its macros and provenance", async () => {
    const food = await getFood(db, foodId);

    expect(food).toMatchObject({
      name: "Whole milk",
      provenance: "usda",
      kcal: 61,
      protein: 3.2,
    });
  });

  it("returns the food's own portions, so the picker offers real weights", async () => {
    await db.query(
      `INSERT INTO portions (food_id, label, grams, source)
       VALUES ($1, 'cup', 244, 'usda')`,
      [foodId],
    );

    const food = await getFood(db, foodId);

    expect(food?.portions).toEqual([
      { label: "cup", grams: 244, source: "usda" },
    ]);
  });

  it("returns a density category the density table recognises", async () => {
    await db.query(`UPDATE foods SET density_category = 'milk' WHERE id = $1`, [
      foodId,
    ]);

    expect((await getFood(db, foodId))?.densityCategory).toBe("milk");
  });

  it("drops a density category the table does not know, rather than passing it on", async () => {
    // The column is free text. Handing an unrecognised value to a caller means
    // it multiplies by undefined downstream - logFood has always guarded this,
    // and the read path now guards it too.
    await db.query(
      `UPDATE foods SET density_category = 'antimatter' WHERE id = $1`,
      [foodId],
    );

    expect((await getFood(db, foodId))?.densityCategory).toBeNull();
  });

  it("reports whether the food has a recipe, so ingredients can be shown", async () => {
    expect((await getFood(db, foodId))?.hasRecipe).toBe(false);

    await db.query(
      `INSERT INTO recipes (food_id, input_kind, yield_servings)
       VALUES ($1, 'text', 4)`,
      [foodId],
    );

    expect((await getFood(db, foodId))?.hasRecipe).toBe(true);
  });

  it("returns the recipe's ingredients in order when it has one", async () => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO recipes (food_id, input_kind, yield_servings)
       VALUES ($1, 'text', 4) RETURNING id`,
      [foodId],
    );

    await db.query(
      `INSERT INTO recipe_ingredients (recipe_id, raw_text, position)
       VALUES ($1, '2 cups black beans', 1), ($1, '1 onion, diced', 0)`,
      [rows[0]!.id],
    );

    const food = await getFood(db, foodId);

    expect(food?.ingredients).toEqual(["1 onion, diced", "2 cups black beans"]);
  });

  it("returns null for a food that does not exist", async () => {
    expect(
      await getFood(db, "00000000-0000-0000-0000-000000000000"),
    ).toBeNull();
  });
});
