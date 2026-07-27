import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Db } from "./db.js";

const schemaPath = fileURLToPath(new URL("../db/schema.sql", import.meta.url));

/**
 * An in-process Postgres loaded with the real schema.
 *
 * Deliberately not a mock: the guarantee under test is that a corrected food
 * leaves past days alone, which lives in the SQL. A mocked repository would
 * happily "pass" while the real query recomputed totals from `foods`.
 */
export const createTestDb = async (): Promise<Db & { close(): Promise<void> }> => {
  const pglite = new PGlite();
  const schema = await readFile(schemaPath, "utf8");

  // pg_trgm is not bundled with PGlite; the index it backs is a search
  // optimisation and irrelevant to the behaviour these tests cover.
  await pglite.exec(
    schema.replace(/CREATE INDEX foods_name_trgm[^;]+;/, ""),
  );

  return {
    query: async (sql, params) =>
      pglite.query(sql, params as unknown[]) as never,
    close: () => pglite.close(),
  };
};

/**
 * Empty every table, so one database can be shared across a file's tests.
 * Standing up a fresh PGlite per test costs over a second each and starves the
 * hook timeout once files run in parallel.
 */
export const resetDb = async (db: Db): Promise<void> => {
  await db.query(`TRUNCATE users, nutrients, foods RESTART IDENTITY CASCADE`);
};

export interface SeededFood {
  userId: string;
  foodId: string;
}

/** A user plus one food with both macro columns and micronutrient rows. */
export const seedUserAndFood = async (db: Db): Promise<SeededFood> => {
  const { rows: users } = await db.query<{ id: string }>(
    `INSERT INTO users (email, sex_at_birth, birth_date, height_cm,
                        activity_level, goal_type)
     VALUES ('test@calora.local', 'female', '1960-01-01', 165,
             'moderate', 'maintain')
     RETURNING id`,
  );

  await db.query(
    `INSERT INTO nutrients (id, name, unit) VALUES
       ('CA', 'Calcium', 'mg'),
       ('FE', 'Iron', 'mg')`,
  );

  const { rows: foods } = await db.query<{ id: string }>(
    `INSERT INTO foods (name, provenance, kcal, protein, carbs, fat)
     VALUES ('Whole milk', 'usda', 61, 3.2, 4.8, 3.3)
     RETURNING id`,
  );

  const foodId = foods[0]!.id;

  await db.query(
    `INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g, source)
     VALUES ($1, 'CA', 113, 'usda'), ($1, 'FE', 0.03, 'usda')`,
    [foodId],
  );

  return { userId: users[0]!.id, foodId };
};
