import { rankFoods, textMatchScore, type Provenance } from "@calora/core";
import type { Db } from "./db.js";

export interface FoodSearchResult {
  id: string;
  name: string;
  brandName: string | null;
  provenance: Provenance;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  hasRecipe: boolean;
  textScore: number;
  logCount: number;
  lastLoggedAt: Date | null;
}

interface CandidateRow {
  id: string;
  name: string;
  brand_name: string | null;
  provenance: Provenance;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  has_recipe: boolean;
  log_count: string;
  last_logged_at: string | null;
}

/**
 * Registry search, ranked by history first.
 *
 * The candidate set is narrowed in SQL and scored in TypeScript so that the
 * ranking rule lives in one place and stays identical on the device's bundled
 * reference database, which has no Postgres to lean on.
 *
 * Log counts are scoped to the requesting user: another person's habits are
 * not evidence about this one.
 */
export const searchFoods = async (
  db: Db,
  userId: string,
  query: string,
  limit = 25,
): Promise<FoodSearchResult[]> => {
  const trimmed = query.trim();
  if (trimmed === "") return [];

  // Match any query word rather than the whole phrase: "brazilian beans" must
  // still reach "Brazilian Style Black Beans", where the words are not
  // adjacent. Ranking then decides the order.
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const tokenClauses = tokens
    .map((_, index) => `f.name ILIKE '%' || $${index + 2} || '%'`)
    .join(" OR ");

  const { rows } = await db.query<CandidateRow>(
    `SELECT f.id, f.name, f.brand_name, f.provenance,
            f.kcal, f.protein, f.carbs, f.fat,
            (r.id IS NOT NULL)          AS has_recipe,
            COALESCE(h.log_count, 0)    AS log_count,
            h.last_logged_at
       FROM foods f
       LEFT JOIN recipes r ON r.food_id = f.id
       LEFT JOIN (
         SELECT food_id,
                COUNT(*)         AS log_count,
                MAX(created_at)  AS last_logged_at
           FROM log_entries
          WHERE user_id = $1 AND food_id IS NOT NULL
          GROUP BY food_id
       ) h ON h.food_id = f.id
      WHERE f.status = 'approved'
        AND (${tokenClauses})
      LIMIT 200`,
    [userId, ...tokens],
  );

  const candidates = rows.map((row) => ({
    id: row.id,
    name: row.name,
    brandName: row.brand_name,
    provenance: row.provenance,
    kcal: Number(row.kcal),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    hasRecipe: row.has_recipe,
    textScore: textMatchScore(row.name, trimmed),
    logCount: Number(row.log_count),
    lastLoggedAt: row.last_logged_at ? new Date(row.last_logged_at) : null,
  }));

  return rankFoods(candidates, new Date()).slice(0, limit);
};
