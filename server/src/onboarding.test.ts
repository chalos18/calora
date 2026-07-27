import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./db.js";
import { ageInYears, getGoalOn, onboardUser } from "./onboarding.js";
import { createTestDb, resetDb } from "./test-db.js";

let db: Db & { close(): Promise<void> };

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  await resetDb(db);
});

afterAll(async () => {
  await db.close();
});

const TODAY = new Date("2026-07-27T12:00:00Z");

const baseInput = {
  email: "ana@calora.local",
  sexAtBirth: "female",
  birthDate: "1996-01-15",
  heightCm: 165,
  weightKg: 60,
  activityLevel: "moderate",
  goalType: "maintain",
  today: TODAY,
} as const;

describe("ageInYears", () => {
  it("counts a birthday that has already passed this year", () => {
    expect(ageInYears("1996-01-15", TODAY)).toBe(30);
  });

  it("does not count a birthday still to come this year", () => {
    expect(ageInYears("1996-12-15", TODAY)).toBe(29);
  });
});

describe("onboardUser", () => {
  it("derives a goal from the answers given", async () => {
    const { goal } = await onboardUser(db, baseInput);

    // BMR = 10(60) + 6.25(165) - 5(30) - 161 = 1320.25
    // TDEE = 1320.25 x 1.55 = 2046.4 -> 2046, maintain adds nothing
    expect(goal.kcal).toBe(2046);
    // 1.6 g/kg x 60 kg
    expect(goal.proteinG).toBe(96);
  });

  it("records the starting weight", async () => {
    const { userId } = await onboardUser(db, baseInput);

    const { rows } = await db.query<{ kg: string }>(
      `SELECT kg FROM weight_entries WHERE user_id = $1`,
      [userId],
    );

    expect(Number(rows[0]?.kg)).toBe(60);
  });

  it("stores the goal so it can be read back for that day", async () => {
    const { userId, goal } = await onboardUser(db, baseInput);

    expect(await getGoalOn(db, userId, "2026-07-27")).toEqual(goal);
  });
});

describe("getGoalOn", () => {
  it("returns the goal that applied on a past day, not the current one", async () => {
    const { userId } = await onboardUser(db, baseInput);

    // The user changes their mind and starts cutting in August.
    await db.query(
      `INSERT INTO goals (user_id, effective_from, kcal, protein_g, fat_g, carbs_g)
       VALUES ($1, '2026-08-01', 1546, 132, 54, 121)`,
      [userId],
    );

    // A July day must still be judged against July's target.
    expect((await getGoalOn(db, userId, "2026-07-27"))?.kcal).toBe(2046);
    expect((await getGoalOn(db, userId, "2026-08-15"))?.kcal).toBe(1546);
  });

  it("returns null before any goal was set", async () => {
    const { userId } = await onboardUser(db, baseInput);

    expect(await getGoalOn(db, userId, "2020-01-01")).toBeNull();
  });
});
