/**
 * End-to-end smoke test: real server, real schema, real seeded USDA data.
 * Exercises the API exactly as the Expo app does.
 */
import Database from "better-sqlite3";
import { createApp } from "../server/src/app.ts";
import { createTestDb } from "../server/src/test-db.ts";

const db = await createTestDb();
const app = createApp(db);

/**
 * The two days this script logs into.
 *
 * Derived from the clock rather than written down: a Goal is dated from the day
 * it is created, and `getGoalOn` only returns one whose `effective_from` is on
 * or before the day being read. Hardcoded dates worked until the calendar
 * passed them, and then every day came back with a null goal.
 */
const isoDay = (offset: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const DAY_ONE = isoDay(0);
const DAY_TWO = isoDay(1);

// ---- load a handful of genuine USDA foods out of the built reference DB ----
const reference = new Database(
  "/home/anaoliveira/workspace/calora/data/seed/reference.sqlite",
  { readonly: true },
);

const nutrients = reference
  .prepare("SELECT id, name, unit FROM nutrients")
  .all() as { id: string; name: string; unit: string }[];

for (const n of nutrients) {
  await db.query(`INSERT INTO nutrients (id, name, unit) VALUES ($1,$2,$3)`, [
    n.id,
    n.name,
    n.unit,
  ]);
}

const foods = reference
  .prepare(
    `SELECT id, name, density_category, kcal, protein, carbs, fat FROM foods
      WHERE name LIKE 'Beans, black%' OR name LIKE 'Broccoli, raw%'
         OR name LIKE 'Rice, white, long-grain, regular, cooked%'
      LIMIT 6`,
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

const idMap = new Map<string, string>();

for (const food of foods) {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO foods (name, provenance, external_id, density_category,
                        kcal, protein, carbs, fat)
     VALUES ($1,'usda',$2,$3,$4,$5,$6,$7) RETURNING id`,
    [
      food.name,
      food.id,
      food.density_category,
      food.kcal,
      food.protein,
      food.carbs,
      food.fat,
    ],
  );
  const newId = rows[0]!.id;
  idMap.set(food.id, newId);

  const fns = reference
    .prepare(
      `SELECT nutrient_id, amount FROM food_nutrients WHERE food_id = ?`,
    )
    .all(food.id) as { nutrient_id: string; amount: number }[];

  for (const fn of fns) {
    await db.query(
      `INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g, source)
       VALUES ($1,$2,$3,'usda')`,
      [newId, fn.nutrient_id, fn.amount],
    );
  }

  const portions = reference
    .prepare(`SELECT label, grams FROM portions WHERE food_id = ?`)
    .all(food.id) as { label: string; grams: number }[];

  for (const p of portions) {
    await db.query(
      `INSERT INTO portions (food_id, label, grams, source) VALUES ($1,$2,$3,'usda')`,
      [newId, p.label, p.grams],
    );
  }
}

console.log(`seeded ${foods.length} real USDA foods\n`);

const json = async (res: Response) => res.json() as Promise<any>;
const post = (path: string, body: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

// ---- 1. onboarding ----
const onboarded = await json(
  await post("/onboarding", {
    email: "ana@calora.local",
    sexAtBirth: "female",
    birthDate: "1996-01-15",
    heightCm: 165,
    weightKg: 60,
    activityLevel: "moderate",
    goalType: "lose",
  }),
);
const userId = onboarded.userId as string;
console.log("1. onboarding →", onboarded.goal);

// Signing back in has to return the same account and the same goal, or a
// returning user quietly gets a second, empty diary.
const loggedIn = await json(await post("/login", { email: "ANA@calora.local" }));
console.log(
  loggedIn.userId === userId && loggedIn.goal.kcal === onboarded.goal.kcal
    ? "   sign back in (different case) → same account, same goal ✓"
    : "   SIGN-IN RETURNED A DIFFERENT ACCOUNT OR GOAL ✗",
);

// ---- 2. search ----
const search = await json(
  await app.request(`/foods/search?userId=${userId}&q=black%20beans`),
);
console.log("\n2. search 'black beans' →");
for (const r of search.results.slice(0, 3)) {
  console.log(`   ${r.name}  (${Math.round(r.kcal)} kcal/100g, ${r.provenance})`);
}

const beans = search.results[0];

// ---- 3. log by a real USDA portion ----
const logged = await json(
  await post("/log-entries", {
    userId,
    foodId: beans.id,
    date: DAY_ONE,
    mealSlot: "dinner",
    quantity: 1,
    unit: "cup",
  }),
);
console.log(`\n3. logged 1 cup of "${beans.name}" → entry ${logged.id.slice(0, 8)}`);

// ---- 4. read the day back ----
const day = await json(await app.request(`/users/${userId}/days/${DAY_ONE}`));
console.log("\n4. day view →");
console.log("   totals   ", day.totals);
console.log("   goal     ", day.goal.kcal, "kcal");
console.log("   remaining", Math.round(day.remaining), "kcal");
console.log("   entry    ", day.entries[0].foodName, `${day.entries[0].grams} g`);

// ---- 5. immutability under a correction ----
await db.query(`UPDATE foods SET kcal = 9999 WHERE id = $1`, [beans.id]);
const after = await json(await app.request(`/users/${userId}/days/${DAY_ONE}`));
console.log(
  `\n5. after corrupting the food to 9999 kcal/100g → day still reads ${after.totals.kcal} kcal`,
);
console.log(
  after.totals.kcal === day.totals.kcal
    ? "   history held ✓"
    : "   HISTORY MOVED ✗",
);

// ---- 6. density fallback, for a unit the food has no sourced portion for ----
const broccoliId = (
  await json(await app.request(`/foods/search?userId=${userId}&q=broccoli`))
).results[0].id;

await post("/log-entries", {
  userId,
  foodId: broccoliId,
  date: DAY_TWO,
  mealSlot: "lunch",
  quantity: 1,
  unit: "tbsp",
});

const estimated = await json(
  await app.request(`/users/${userId}/days/${DAY_TWO}`),
);
const entry = estimated.entries[0];
console.log(
  `\n6. 1 tbsp of broccoli via the density table → ${entry.grams} g` +
    `, isEstimated=${entry.isEstimated}`,
);

// ---- 7. a food with no density category is refused, not guessed ----
const { rows: plain } = await db.query<{ id: string }>(
  `INSERT INTO foods (name, provenance, kcal, protein, carbs, fat)
   VALUES ('Mystery paste', 'user', 200, 5, 10, 15) RETURNING id`,
);
const refused = await post("/log-entries", {
  userId,
  foodId: plain[0]!.id,
  date: DAY_TWO,
  mealSlot: "lunch",
  quantity: 1,
  unit: "cup",
});
console.log(
  `\n7. 1 cup of a food with no density category → ${refused.status}`,
  await json(refused),
);

await db.close();
