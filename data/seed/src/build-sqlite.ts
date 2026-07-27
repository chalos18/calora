import Database from "better-sqlite3";
import { KEPT_NUTRIENTS } from "./nutrient-map.js";
import type { SeedFood } from "./transform.js";

/**
 * The device-side reference database: read-only, bundled with the app, and the
 * reason staple search works with no network.
 *
 * Only the columns the app actually reads survive the trim. USDA's export
 * carries sampling metadata, analytical methods and provenance detail that
 * would multiply the size for no benefit on a phone.
 */
const SCHEMA = `
CREATE TABLE nutrients (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL
);

CREATE TABLE foods (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  kcal    REAL NOT NULL,
  protein REAL NOT NULL,
  carbs   REAL NOT NULL,
  fat     REAL NOT NULL
);

-- No row means the nutrient is not reported. Absence is data.
CREATE TABLE food_nutrients (
  food_id     TEXT NOT NULL REFERENCES foods(id),
  nutrient_id TEXT NOT NULL REFERENCES nutrients(id),
  amount      REAL NOT NULL,
  PRIMARY KEY (food_id, nutrient_id)
);

CREATE TABLE portions (
  food_id TEXT NOT NULL REFERENCES foods(id),
  label   TEXT NOT NULL,
  grams   REAL NOT NULL,
  PRIMARY KEY (food_id, label)
);

CREATE VIRTUAL TABLE foods_fts USING fts5(food_id UNINDEXED, name);
`;

export const buildReferenceDb = (path: string, foods: SeedFood[]): void => {
  const db = new Database(path);

  db.pragma("journal_mode = OFF");
  db.exec(SCHEMA);

  const insertNutrient = db.prepare(
    `INSERT INTO nutrients (id, name, unit) VALUES (?, ?, ?)`,
  );
  const insertFood = db.prepare(
    `INSERT INTO foods (id, name, kcal, protein, carbs, fat)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insertFoodNutrient = db.prepare(
    `INSERT OR IGNORE INTO food_nutrients (food_id, nutrient_id, amount)
     VALUES (?, ?, ?)`,
  );
  const insertPortion = db.prepare(
    `INSERT OR IGNORE INTO portions (food_id, label, grams) VALUES (?, ?, ?)`,
  );
  const insertFts = db.prepare(
    `INSERT INTO foods_fts (food_id, name) VALUES (?, ?)`,
  );

  db.transaction(() => {
    for (const nutrient of KEPT_NUTRIENTS) {
      insertNutrient.run(nutrient.id, nutrient.name, nutrient.unit);
    }

    for (const food of foods) {
      insertFood.run(
        food.fdcId,
        food.name,
        food.kcal,
        food.protein,
        food.carbs,
        food.fat,
      );
      insertFts.run(food.fdcId, food.name);

      for (const nutrient of food.nutrients) {
        insertFoodNutrient.run(food.fdcId, nutrient.nutrientId, nutrient.amount);
      }
      for (const portion of food.portions) {
        insertPortion.run(food.fdcId, portion.label, portion.grams);
      }
    }
  })();

  db.exec("VACUUM");
  db.close();
};
