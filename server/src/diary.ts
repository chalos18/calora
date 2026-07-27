import {
  isDensityCategory,
  resolveGrams,
  scaleMacrosToGrams,
  scaleNutrientsToGrams,
  type Portion,
} from "@calora/core";
import type { Db } from "./db.js";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snacks";

export interface LogFoodInput {
  userId: string;
  foodId: string;
  date: string;
  mealSlot: MealSlot;
  quantity: number;
  unit: string;
}

interface FoodRow {
  id: string;
  name: string;
  density_category: string | null;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
}

const num = (value: string | number): number => Number(value);

/**
 * Write a Log Entry, freezing the food's nutrition onto it.
 *
 * The snapshot is the whole point: `food_id` is retained for provenance and
 * re-logging, but totals are never recomputed from it. A correction upstream,
 * or an edit to a recipe, must not rewrite a day the user has already seen.
 */
export const logFood = async (
  db: Db,
  input: LogFoodInput,
): Promise<{ id: string } | { error: "food_not_found" | "unresolvable_unit" }> => {
  const { rows } = await db.query<FoodRow>(
    `SELECT id, name, density_category, kcal, protein, carbs, fat
       FROM foods WHERE id = $1`,
    [input.foodId],
  );

  const food = rows[0];
  if (!food) return { error: "food_not_found" };

  const { rows: portionRows } = await db.query<{
    label: string;
    grams: string;
    source: Portion["source"];
  }>(`SELECT label, grams, source FROM portions WHERE food_id = $1`, [food.id]);

  const portions: Portion[] = portionRows.map((row) => ({
    label: row.label,
    grams: num(row.grams),
    source: row.source,
  }));

  // density_category is free text in the schema, so it is validated against the
  // table rather than cast. An unrecognised value would otherwise multiply by
  // undefined and store NaN grams and NaN calories.
  const densityCategory = isDensityCategory(food.density_category)
    ? food.density_category
    : undefined;

  const resolved = resolveGrams({
    quantity: input.quantity,
    unit: input.unit,
    portions,
    ...(densityCategory ? { densityCategory } : {}),
  });

  if (!resolved) return { error: "unresolvable_unit" };

  const macros = scaleMacrosToGrams(
    {
      kcal: num(food.kcal),
      protein: num(food.protein),
      carbs: num(food.carbs),
      fat: num(food.fat),
    },
    resolved.grams,
  );

  const { rows: nutrientRows } = await db.query<{
    nutrient_id: string;
    amount_per_100g: string;
  }>(
    `SELECT nutrient_id, amount_per_100g FROM food_nutrients WHERE food_id = $1`,
    [food.id],
  );

  const scaledNutrients = scaleNutrientsToGrams(
    Object.fromEntries(
      nutrientRows.map((row) => [row.nutrient_id, num(row.amount_per_100g)]),
    ),
    resolved.grams,
  );

  // The entry and its nutrients are one unit. A half-written entry would carry
  // only some of its frozen nutrients, and coverage - computed from exactly
  // that - would under-report forever, indistinguishable from a food whose
  // data genuinely lacks them.
  await db.query("BEGIN");

  try {
    const { rows: inserted } = await db.query<{ id: string }>(
      `INSERT INTO log_entries
         (user_id, date, meal_slot, food_id, food_name, portion_label,
          quantity, grams, is_estimated, kcal, protein, carbs, fat)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        input.userId,
        input.date,
        input.mealSlot,
        food.id,
        food.name,
        input.unit,
        input.quantity,
        resolved.grams,
        resolved.isEstimated,
        macros.kcal,
        macros.protein,
        macros.carbs,
        macros.fat,
      ],
    );

    const logEntryId = inserted[0]!.id;

    // Frozen under the same rule as the macro columns.
    for (const [nutrientId, amount] of Object.entries(scaledNutrients)) {
      await db.query(
        `INSERT INTO log_entry_nutrients (log_entry_id, nutrient_id, amount)
         VALUES ($1, $2, $3)`,
        [logEntryId, nutrientId, amount],
      );
    }

    await db.query("COMMIT");
    return { id: logEntryId };
  } catch (cause) {
    await db.query("ROLLBACK");
    throw cause;
  }
};

export interface DayTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Daily macro totals, read straight from the frozen columns on each entry.
 *
 * Note the absence of any join to `foods`: that absence is the immutability
 * guarantee, not an oversight.
 */
export const getDayTotals = async (
  db: Db,
  userId: string,
  date: string,
): Promise<DayTotals> => {
  const { rows } = await db.query<{
    kcal: string | null;
    protein: string | null;
    carbs: string | null;
    fat: string | null;
  }>(
    `SELECT COALESCE(SUM(kcal), 0)    AS kcal,
            COALESCE(SUM(protein), 0) AS protein,
            COALESCE(SUM(carbs), 0)   AS carbs,
            COALESCE(SUM(fat), 0)     AS fat
       FROM log_entries
      WHERE user_id = $1 AND date = $2`,
    [userId, date],
  );

  const row = rows[0]!;
  return {
    kcal: num(row.kcal ?? 0),
    protein: num(row.protein ?? 0),
    carbs: num(row.carbs ?? 0),
    fat: num(row.fat ?? 0),
  };
};

export interface DiaryEntry {
  id: string;
  mealSlot: MealSlot;
  foodId: string | null;
  foodName: string;
  portionLabel: string;
  quantity: number;
  grams: number;
  isEstimated: boolean;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** A day's entries, read entirely from the frozen snapshot columns. */
export const getDayEntries = async (
  db: Db,
  userId: string,
  date: string,
): Promise<DiaryEntry[]> => {
  const { rows } = await db.query<Record<string, string | boolean | null>>(
    `SELECT id, meal_slot, food_id, food_name, portion_label,
            quantity, grams, is_estimated, kcal, protein, carbs, fat
       FROM log_entries
      WHERE user_id = $1 AND date = $2
      ORDER BY created_at`,
    [userId, date],
  );

  return rows.map((row) => ({
    id: row.id as string,
    mealSlot: row.meal_slot as MealSlot,
    foodId: row.food_id as string | null,
    foodName: row.food_name as string,
    portionLabel: row.portion_label as string,
    quantity: num(row.quantity as string),
    grams: num(row.grams as string),
    isEstimated: row.is_estimated as boolean,
    kcal: num(row.kcal as string),
    protein: num(row.protein as string),
    carbs: num(row.carbs as string),
    fat: num(row.fat as string),
  }));
};

export const deleteLogEntry = async (
  db: Db,
  userId: string,
  id: string,
): Promise<boolean> => {
  const { rows } = await db.query<{ id: string }>(
    `DELETE FROM log_entries WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId],
  );
  return rows.length > 0;
};

/** Recently logged foods, newest first - the History tab. */
export const getRecentFoods = async (
  db: Db,
  userId: string,
  limit = 50,
): Promise<{ foodId: string; foodName: string; lastLoggedAt: string }[]> => {
  const { rows } = await db.query<{
    food_id: string;
    food_name: string;
    last_logged_at: string;
  }>(
    `SELECT food_id, food_name, MAX(created_at) AS last_logged_at
       FROM log_entries
      WHERE user_id = $1 AND food_id IS NOT NULL
      GROUP BY food_id, food_name
      ORDER BY last_logged_at DESC
      LIMIT $2`,
    [userId, limit],
  );

  return rows.map((row) => ({
    foodId: row.food_id,
    foodName: row.food_name,
    lastLoggedAt: row.last_logged_at,
  }));
};

/** A day's entries in the shape the coverage calculation expects. */
export const getDayCoverageEntries = async (
  db: Db,
  userId: string,
  date: string,
): Promise<{ grams: number; nutrients: Record<string, number> }[]> => {
  const { rows } = await db.query<{
    id: string;
    grams: string;
    nutrient_id: string | null;
    amount: string | null;
  }>(
    `SELECT e.id, e.grams, n.nutrient_id, n.amount
       FROM log_entries e
       LEFT JOIN log_entry_nutrients n ON n.log_entry_id = e.id
      WHERE e.user_id = $1 AND e.date = $2`,
    [userId, date],
  );

  const byEntry = new Map<
    string,
    { grams: number; nutrients: Record<string, number> }
  >();

  for (const row of rows) {
    let entry = byEntry.get(row.id);
    if (!entry) {
      entry = { grams: num(row.grams), nutrients: {} };
      byEntry.set(row.id, entry);
    }
    if (row.nutrient_id !== null && row.amount !== null) {
      entry.nutrients[row.nutrient_id] = num(row.amount);
    }
  }

  return [...byEntry.values()];
};
