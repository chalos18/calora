import {
  isDensityCategory,
  type DensityCategory,
  type Portion,
  type Provenance,
} from "@calora/core";
import type { Db } from "./db.js";

export interface FoodDetail {
  id: string;
  name: string;
  brandName: string | null;
  provenance: Provenance;
  /**
   * Narrowed here rather than passed through, so every reader gets a category
   * the density table actually knows. `logFood` has always validated this on
   * the way in; the read path handing out the raw column meant the app could
   * not use it without repeating the check.
   */
  densityCategory: DensityCategory | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  portions: Portion[];
  hasRecipe: boolean;
  /**
   * Present when the food came from a Recipe. Shown so someone can check that
   * the feijoada they searched for resembles the one they actually cooked.
   */
  ingredients: string[];
}

/** Everything the food detail sheet needs, in one round trip. */
export const getFood = async (
  db: Db,
  foodId: string,
): Promise<FoodDetail | null> => {
  const { rows } = await db.query<Record<string, string | null>>(
    `SELECT f.id, f.name, f.brand_name, f.provenance, f.density_category,
            f.kcal, f.protein, f.carbs, f.fat,
            r.id AS recipe_id
       FROM foods f
       LEFT JOIN recipes r ON r.food_id = f.id
      WHERE f.id = $1`,
    [foodId],
  );

  const row = rows[0];
  if (!row) return null;

  const { rows: portionRows } = await db.query<{
    label: string;
    grams: string;
    source: Portion["source"];
  }>(
    `SELECT label, grams, source FROM portions WHERE food_id = $1
      ORDER BY grams`,
    [foodId],
  );

  const ingredients: string[] = [];
  if (row.recipe_id) {
    const { rows: ingredientRows } = await db.query<{ raw_text: string }>(
      `SELECT raw_text FROM recipe_ingredients WHERE recipe_id = $1
        ORDER BY position`,
      [row.recipe_id],
    );
    ingredients.push(...ingredientRows.map((ingredient) => ingredient.raw_text));
  }

  return {
    id: row.id as string,
    name: row.name as string,
    brandName: row.brand_name ?? null,
    provenance: row.provenance as Provenance,
    densityCategory: isDensityCategory(row.density_category)
      ? row.density_category
      : null,
    kcal: Number(row.kcal),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    portions: portionRows.map((portion) => ({
      label: portion.label,
      grams: Number(portion.grams),
      source: portion.source,
    })),
    hasRecipe: row.recipe_id !== null,
    ingredients,
  };
};
