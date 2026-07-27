/**
 * Local dev server. No Postgres to install, no connection string.
 *
 * Runs the real schema and the real routes against PGlite - Postgres compiled
 * to WASM, running in this process - persisted to ./.dev-data so anything
 * logged survives a restart. The registry is loaded from the built
 * reference.sqlite, so search returns genuine USDA foods.
 *
 * Production uses `index.ts` and a real Postgres; only the driver differs.
 */
import { PGlite } from "@electric-sql/pglite";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import type { Db } from "./db.js";

const schemaPath = fileURLToPath(new URL("../db/schema.sql", import.meta.url));
const referencePath = fileURLToPath(
  new URL("../../data/seed/reference.sqlite", import.meta.url),
);
const dataDir = fileURLToPath(new URL("../.dev-data", import.meta.url));

const pglite = new PGlite(dataDir);

const alreadySeeded = async (): Promise<boolean> => {
  try {
    const result = await pglite.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM foods",
    );
    return Number(result.rows[0]?.count ?? 0) > 0;
  } catch {
    return false;
  }
};

const loadRegistry = async (): Promise<void> => {
  if (!existsSync(referencePath)) {
    console.error(
      `\nNo reference database at ${referencePath}.\n` +
        `Build it first:  cd data/seed && pnpm seed\n`,
    );
    process.exit(1);
  }

  const schema = await readFile(schemaPath, "utf8");
  // pg_trgm is not bundled with PGlite; the index it backs is a search
  // optimisation the dev server does not need.
  await pglite.exec(schema.replace(/CREATE INDEX foods_name_trgm[^;]+;/, ""));

  const reference = new Database(referencePath, { readonly: true });

  const nutrients = reference
    .prepare("SELECT id, name, unit FROM nutrients")
    .all() as { id: string; name: string; unit: string }[];

  const foods = reference
    .prepare(
      "SELECT id, name, density_category, kcal, protein, carbs, fat FROM foods",
    )
    .all() as {
    id: string;
    name: string;
    density_category: string | null;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];

  const foodNutrients = reference
    .prepare("SELECT food_id, nutrient_id, amount FROM food_nutrients")
    .all() as { food_id: string; nutrient_id: string; amount: number }[];

  const portions = reference
    .prepare("SELECT food_id, label, grams FROM portions")
    .all() as { food_id: string; label: string; grams: number }[];

  reference.close();

  console.log(
    `seeding ${foods.length} foods, ${foodNutrients.length} nutrient rows, ` +
      `${portions.length} portions...`,
  );

  const started = Date.now();
  await pglite.exec("BEGIN");

  for (const nutrient of nutrients) {
    await pglite.query(
      "INSERT INTO nutrients (id, name, unit) VALUES ($1,$2,$3)",
      [nutrient.id, nutrient.name, nutrient.unit],
    );
  }

  // The reference DB keys on numeric FDC ids while the schema uses uuid.
  // Deriving the uuid deterministically means the child tables can be bulk
  // inserted without a lookup per row, and without touching the schema.
  const fdcToUuid = (fdcId: string): string =>
    `00000000-0000-4000-8000-${fdcId.replace(/\D/g, "").padStart(12, "0")}`;

  const chunk = <T>(rows: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
    return out;
  };

  const quote = (value: string | number | null): string =>
    value === null ? "NULL" : `'${String(value).replace(/'/g, "''")}'`;

  for (const batch of chunk(foods, 500)) {
    await pglite.exec(
      `INSERT INTO foods (id, name, provenance, external_id, density_category,
                          kcal, protein, carbs, fat) VALUES ` +
        batch
          .map(
            (f) =>
              `(${quote(fdcToUuid(f.id))},${quote(f.name)},'usda',${quote(f.id)},` +
              `${quote(f.density_category)},${f.kcal},${f.protein},` +
              `${f.carbs},${f.fat})`,
          )
          .join(",") +
        ";",
    );
  }

  for (const batch of chunk(foodNutrients, 1000)) {
    await pglite.exec(
      `INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g, source)
       VALUES ` +
        batch
          .map(
            (n) =>
              `(${quote(fdcToUuid(n.food_id))},${quote(n.nutrient_id)},${n.amount},'usda')`,
          )
          .join(",") +
        " ON CONFLICT DO NOTHING;",
    );
  }

  for (const batch of chunk(portions, 1000)) {
    await pglite.exec(
      `INSERT INTO portions (food_id, label, grams, source) VALUES ` +
        batch
          .map(
            (p) =>
              `(${quote(fdcToUuid(p.food_id))},${quote(p.label)},${p.grams},'usda')`,
          )
          .join(",") +
        " ON CONFLICT DO NOTHING;",
    );
  }

  await pglite.exec("COMMIT");
  console.log(`seeded in ${((Date.now() - started) / 1000).toFixed(1)}s`);
};

if (await alreadySeeded()) {
  console.log("registry already seeded (delete server/.dev-data to reset)");
} else {
  await loadRegistry();
}

const db: Db = {
  query: async (sql, params) => pglite.query(sql, params as unknown[]) as never,
};

const app = createApp(db);
// The Expo web client runs on a different port in development.
app.use("*", cors());

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`\nCalora dev API on http://localhost:${port}`);
  console.log("Now run the app:  cd apps/mobile && pnpm web\n");
});
