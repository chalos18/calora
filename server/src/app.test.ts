import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import type { Db } from "./db.js";
import { createTestDb, resetDb, seedUserAndFood } from "./test-db.js";

let db: Db & { close(): Promise<void> };
let app: ReturnType<typeof createApp>;
let userId: string;
let foodId: string;

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  await resetDb(db);
  ({ userId, foodId } = await seedUserAndFood(db));
  app = createApp(db);
});

afterAll(async () => {
  await db.close();
});

const post = (path: string, body: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /onboarding", () => {
  it("creates a user and returns their derived goal", async () => {
    const response = await post("/onboarding", {
      email: "new@calora.local",
      sexAtBirth: "male",
      birthDate: "1990-06-01",
      heightCm: 180,
      weightKg: 80,
      activityLevel: "moderate",
      goalType: "build_muscle",
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as {
      userId: string;
      goal: { proteinG: number };
    };

    // 2.0 g/kg x 80 kg
    expect(body.goal.proteinG).toBe(160);
    expect(body.userId).toBeTypeOf("string");
  });

  it("rejects a body missing required fields", async () => {
    const response = await post("/onboarding", { email: "new@calora.local" });

    expect(response.status).toBe(400);
  });
});

describe("GET /foods", () => {
  it("routes /foods/search to search, not to the food-by-id handler", async () => {
    // "search" is a valid-looking :id, so ordering decides which wins.
    const response = await app.request(`/foods/search?userId=${userId}&q=milk`);

    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty("results");
  });

  it("returns a single food with its portions", async () => {
    await db.query(
      `INSERT INTO portions (food_id, label, grams, source)
       VALUES ($1, 'cup', 244, 'usda')`,
      [foodId],
    );

    const response = await app.request(`/foods/${foodId}`);
    const body = (await response.json()) as {
      name: string;
      portions: { label: string }[];
    };

    expect(body.name).toBe("Whole milk");
    expect(body.portions[0]?.label).toBe("cup");
  });

  it("404s for a food that does not exist", async () => {
    const response = await app.request(
      "/foods/00000000-0000-0000-0000-000000000000",
    );
    expect(response.status).toBe(404);
  });
});

describe("GET /users/:userId/days/:date", () => {
  it("returns totals, the goal in force, and the diary", async () => {
    await post("/log-entries", {
      userId,
      foodId,
      date: "2026-07-27",
      mealSlot: "breakfast",
      quantity: 200,
      unit: "g",
    });

    const response = await app.request(`/users/${userId}/days/2026-07-27`);
    const body = (await response.json()) as {
      totals: { kcal: number };
      entries: { foodName: string; grams: number }[];
    };

    expect(body.totals.kcal).toBe(122);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]?.foodName).toBe("Whole milk");
  });

  it("returns an empty day rather than failing when nothing is logged", async () => {
    const response = await app.request(`/users/${userId}/days/2026-01-01`);
    const body = (await response.json()) as { totals: { kcal: number } };

    expect(response.status).toBe(200);
    expect(body.totals.kcal).toBe(0);
  });
});

describe("POST /log-entries", () => {
  it("refuses a unit it cannot honestly convert", async () => {
    const response = await post("/log-entries", {
      userId,
      foodId,
      date: "2026-07-27",
      mealSlot: "lunch",
      quantity: 1,
      unit: "cup",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "unresolvable_unit" });
  });
});

describe("DELETE /log-entries/:id", () => {
  it("removes an entry and leaves the day's total correct", async () => {
    const created = await post("/log-entries", {
      userId,
      foodId,
      date: "2026-07-27",
      mealSlot: "breakfast",
      quantity: 200,
      unit: "g",
    });
    const { id } = (await created.json()) as { id: string };

    const response = await app.request(
      `/log-entries/${id}?userId=${userId}`,
      { method: "DELETE" },
    );
    expect(response.status).toBe(204);

    const day = await app.request(`/users/${userId}/days/2026-07-27`);
    const body = (await day.json()) as { totals: { kcal: number } };
    expect(body.totals.kcal).toBe(0);
  });

  it("will not delete an entry belonging to someone else", async () => {
    const created = await post("/log-entries", {
      userId,
      foodId,
      date: "2026-07-27",
      mealSlot: "breakfast",
      quantity: 200,
      unit: "g",
    });
    const { id } = (await created.json()) as { id: string };

    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO users (email, sex_at_birth, birth_date, height_cm,
                          activity_level, goal_type)
       VALUES ('other@calora.local', 'male', '1990-01-01', 180, 'active', 'gain')
       RETURNING id`,
    );

    const response = await app.request(
      `/log-entries/${id}?userId=${rows[0]!.id}`,
      { method: "DELETE" },
    );

    expect(response.status).toBe(404);
  });
});
