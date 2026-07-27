import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./db.js";
import { logFood } from "./diary.js";
import { searchFoods } from "./search.js";
import { createTestDb, resetDb, seedUserAndFood } from "./test-db.js";

let db: Db & { close(): Promise<void> };
let userId: string;

const addFood = async (
  name: string,
  provenance: "usda" | "openfoodfacts" | "recipe" | "user",
): Promise<string> => {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO foods (name, provenance, kcal, protein, carbs, fat)
     VALUES ($1, $2, 100, 5, 15, 2) RETURNING id`,
    [name, provenance],
  );
  return rows[0]!.id;
};

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  await resetDb(db);
  ({ userId } = await seedUserAndFood(db));
});

afterAll(async () => {
  await db.close();
});

describe("searchFoods", () => {
  it("ranks a food you eat weekly above a better-sourced one you never log", async () => {
    // History has to beat provenance AND text: the USDA entry is sourced and
    // matches the query just as well, but the homemade one is what was meant.
    await addFood("Black beans, boiled", "usda");
    const homemade = await addFood("Black beans my way", "user");

    for (let i = 0; i < 12; i++) {
      await logFood(db, {
        userId,
        foodId: homemade,
        date: `2026-07-${String(i + 1).padStart(2, "0")}`,
        mealSlot: "dinner",
        quantity: 200,
        unit: "g",
      });
    }

    const results = await searchFoods(db, userId, "black beans");

    expect(results[0]?.name).toBe("Black beans my way");
  });

  it("cannot retrieve a food whose name shares no words with the query", async () => {
    // A real limit of lexical retrieval, recorded rather than papered over:
    // "brazilian beans" does not reach "Feijoada", however often it is logged,
    // because ranking only ever reorders what the candidate query returned.
    // Closing this would need semantic search, which D12 rejected for putting
    // a network round trip on every keystroke.
    const feijoada = await addFood("Feijoada", "recipe");

    for (let i = 0; i < 12; i++) {
      await logFood(db, {
        userId,
        foodId: feijoada,
        date: `2026-07-${String(i + 1).padStart(2, "0")}`,
        mealSlot: "dinner",
        quantity: 200,
        unit: "g",
      });
    }

    expect(await searchFoods(db, userId, "brazilian beans")).toEqual([]);
  });

  it("prefers sourced data when nothing has been logged", async () => {
    await addFood("Black beans homemade", "user");
    await addFood("Black beans, boiled", "usda");

    const results = await searchFoods(db, userId, "black beans");

    expect(results[0]?.provenance).toBe("usda");
  });

  it("excludes foods awaiting approval", async () => {
    const pending = await addFood("Farofa", "user");
    await db.query(`UPDATE foods SET status = 'pending' WHERE id = $1`, [
      pending,
    ]);

    expect(await searchFoods(db, userId, "farofa")).toEqual([]);
  });

  it("does not surface another user's history as ranking signal", async () => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO users (email, sex_at_birth, birth_date, height_cm,
                          activity_level, goal_type)
       VALUES ('other@calora.local', 'male', '1990-01-01', 180,
               'active', 'gain')
       RETURNING id`,
    );
    const otherUserId = rows[0]!.id;

    await addFood("Black beans, boiled", "usda");
    const obscure = await addFood("Zzz obscure beans", "user");

    for (let i = 0; i < 20; i++) {
      await logFood(db, {
        userId: otherUserId,
        foodId: obscure,
        date: `2026-06-${String(i + 1).padStart(2, "0")}`,
        mealSlot: "lunch",
        quantity: 100,
        unit: "g",
      });
    }

    const results = await searchFoods(db, userId, "beans");

    // The other user's 20 logs must not lift it for this user.
    expect(results[0]?.name).toBe("Black beans, boiled");
  });
});
