import type { MacroTargets } from "@calora/core";
import type { Db } from "./db.js";
import { getGoalOn, isoDate, normaliseEmail, onboardUser } from "./onboarding.js";

/**
 * Signing back in.
 *
 * Calora has no passwords yet: an email is enough to say which account you
 * are. That is not a security decision so much as the absence of one - see
 * `docs/adr/0010`. It is isolated here so that when credentials do arrive,
 * they arrive in one file rather than everywhere a user id is read.
 */
export interface Account {
  userId: string;
  /** Null only if the account somehow has no dated Goal on or before today. */
  goal: MacroTargets | null;
}

/**
 * A pre-onboarded account for development, so the app can be opened without
 * filling the form in again. Its id is fixed rather than generated, so a URL,
 * a screenshot or a driving script that mentions it stays valid across resets.
 */
export const DEMO_ACCOUNT = {
  userId: "00000000-0000-4000-9000-000000000001",
  email: "demo@calora.local",
  sexAtBirth: "female",
  birthDate: "1990-06-01",
  heightCm: 165,
  weightKg: 60,
  activityLevel: "moderate",
  goalType: "maintain",
} as const;

export const findAccountByEmail = async (
  db: Db,
  email: string,
  on: Date = new Date(),
): Promise<Account | null> => {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = $1`,
    [normaliseEmail(email)],
  );

  const userId = rows[0]?.id;
  if (!userId) return null;

  return { userId, goal: await getGoalOn(db, userId, isoDate(on)) };
};

/**
 * Create the demo account if it is not already there, and return its id.
 *
 * Idempotent on purpose: the dev server calls this on every boot, and the
 * point of the account is that yesterday's diary is still in it.
 */
export const ensureDemoAccount = async (
  db: Db,
  today: Date = new Date(),
): Promise<string> => {
  const existing = await findAccountByEmail(db, DEMO_ACCOUNT.email, today);
  if (existing) return existing.userId;

  const { userId } = await onboardUser(db, { ...DEMO_ACCOUNT, today });
  return userId;
};
