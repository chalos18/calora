import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEMO_ACCOUNT, ensureDemoAccount, findAccountByEmail } from "./accounts.js";
import type { Db } from "./db.js";
import { onboardUser } from "./onboarding.js";
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

const onboard = (email: string) =>
  onboardUser(db, {
    email,
    sexAtBirth: "female",
    birthDate: "1990-06-01",
    heightCm: 165,
    weightKg: 60,
    activityLevel: "moderate",
    goalType: "maintain",
    today: new Date("2026-07-28T00:00:00Z"),
  });

describe("findAccountByEmail", () => {
  it("returns the user and the goal in force today", async () => {
    const { userId, goal } = await onboard("ana@calora.local");

    const found = await findAccountByEmail(db, "ana@calora.local");

    expect(found).toEqual({ userId, goal });
  });

  it("ignores case and surrounding whitespace, because keyboards add both", async () => {
    const { userId } = await onboard("ana@calora.local");

    const found = await findAccountByEmail(db, "  Ana@Calora.Local ");

    expect(found?.userId).toBe(userId);
  });

  it("returns null for an email nobody has onboarded", async () => {
    expect(await findAccountByEmail(db, "nobody@calora.local")).toBeNull();
  });

  it("cannot be made ambiguous by onboarding the same address in another case", async () => {
    // Sign-in matches case-insensitively. If onboarding stored the address
    // verbatim, these would be two rows under the UNIQUE constraint and
    // sign-in would return whichever came back first.
    await onboard("ana@calora.local");

    await expect(onboard("ANA@Calora.Local")).rejects.toThrow();
  });
});

describe("ensureDemoAccount", () => {
  it("creates the demo account with its fixed id, weight and goal", async () => {
    const userId = await ensureDemoAccount(db);

    expect(userId).toBe(DEMO_ACCOUNT.userId);

    const found = await findAccountByEmail(db, DEMO_ACCOUNT.email);
    expect(found?.userId).toBe(DEMO_ACCOUNT.userId);
    // A goal only exists if the weight entry and derivation ran too.
    expect(found?.goal?.kcal).toBeGreaterThan(0);
  });

  it("is idempotent, so restarting the dev server does not duplicate or reset it", async () => {
    const first = await ensureDemoAccount(db);
    const second = await ensureDemoAccount(db);

    expect(second).toBe(first);

    const { rows } = await db.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM users",
    );
    expect(Number(rows[0]!.count)).toBe(1);
  });

  it("leaves an existing demo account's logged data alone", async () => {
    const userId = await ensureDemoAccount(db);

    await db.query(
      `INSERT INTO weight_entries (user_id, date, kg) VALUES ($1, '2026-01-01', 71)`,
      [userId],
    );

    await ensureDemoAccount(db);

    const { rows } = await db.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM weight_entries WHERE user_id = $1",
      [userId],
    );
    expect(Number(rows[0]!.count)).toBe(2);
  });
});
