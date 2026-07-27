import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildReferenceDb } from "./build-sqlite.js";
import type { SeedFood } from "./transform.js";

const foods: SeedFood[] = [
  {
    fdcId: "100",
    name: "Beans, black, boiled",
    densityCategory: "legume_cooked",
    kcal: 132,
    protein: 8.86,
    carbs: 23.71,
    fat: 0.54,
    nutrients: [{ nutrientId: "CA", amount: 27 }],
    portions: [{ label: "cup", grams: 172, source: "usda" }],
  },
  {
    fdcId: "200",
    name: "Broccoli, raw",
    densityCategory: "vegetable_chopped",
    kcal: 34,
    protein: 2.82,
    carbs: 6.64,
    fat: 0.37,
    nutrients: [{ nutrientId: "VITC", amount: 89.2 }],
    portions: [],
  },
];

let dir: string;
let dbPath: string;
let db: Database.Database;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "calora-seed-"));
  dbPath = join(dir, "reference.sqlite");
  buildReferenceDb(dbPath, foods);
  db = new Database(dbPath, { readonly: true });
});

afterAll(async () => {
  db.close();
  await rm(dir, { recursive: true, force: true });
});

describe("buildReferenceDb", () => {
  it("writes every food with its macros and density category", () => {
    const row = db
      .prepare(
        `SELECT name, density_category, kcal, protein FROM foods WHERE id = '100'`,
      )
      .get() as {
      name: string;
      density_category: string;
      kcal: number;
      protein: number;
    };

    expect(row).toEqual({
      name: "Beans, black, boiled",
      // Carried through so volume units can resolve on the device.
      density_category: "legume_cooked",
      kcal: 132,
      protein: 8.86,
    });
  });

  it("supports full-text search, which is what makes offline search work", () => {
    const rows = db
      .prepare(`SELECT food_id FROM foods_fts WHERE foods_fts MATCH 'beans'`)
      .all() as { food_id: string }[];

    expect(rows).toEqual([{ food_id: "100" }]);
  });

  it("matches on a prefix so partial typing finds things", () => {
    const rows = db
      .prepare(`SELECT food_id FROM foods_fts WHERE foods_fts MATCH 'brocc*'`)
      .all() as { food_id: string }[];

    expect(rows).toEqual([{ food_id: "200" }]);
  });

  it("stores portions with their gram weights", () => {
    const row = db
      .prepare(`SELECT label, grams FROM portions WHERE food_id = '100'`)
      .get() as { label: string; grams: number };

    expect(row).toEqual({ label: "cup", grams: 172 });
  });

  it("records no nutrient row for a food that does not report one", () => {
    // Broccoli has no calcium here. Absence must survive into the bundle,
    // because coverage depends on telling "no data" from "contains none".
    const rows = db
      .prepare(
        `SELECT nutrient_id FROM food_nutrients WHERE food_id = '200'`,
      )
      .all() as { nutrient_id: string }[];

    expect(rows).toEqual([{ nutrient_id: "VITC" }]);
  });

  it("carries the nutrient reference table so units can be displayed", () => {
    const row = db
      .prepare(`SELECT name, unit FROM nutrients WHERE id = 'CA'`)
      .get() as { name: string; unit: string };

    expect(row).toEqual({ name: "Calcium", unit: "mg" });
  });
});
