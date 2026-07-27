import {
  calculateTdee,
  deriveMacroTargets,
  type ActivityLevel,
  type GoalType,
  type MacroTargets,
  type SexAtBirth,
} from "@calora/core";
import type { Db } from "./db.js";

export interface OnboardingInput {
  email: string;
  sexAtBirth: SexAtBirth;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  today?: Date;
}

export const ageInYears = (birthDate: string, on: Date): number => {
  const born = new Date(birthDate);
  let age = on.getUTCFullYear() - born.getUTCFullYear();

  const monthDiff = on.getUTCMonth() - born.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < born.getUTCDate())) {
    age -= 1;
  }

  return age;
};

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Create a user, record their starting weight, and derive their first Goal.
 *
 * Goals are dated rather than overwritten: a day viewed months later should be
 * shown against the target that applied then, for the same reason a Log Entry
 * freezes its nutrition.
 */
export const onboardUser = async (
  db: Db,
  input: OnboardingInput,
): Promise<{ userId: string; goal: MacroTargets }> => {
  const today = input.today ?? new Date();

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO users (email, sex_at_birth, birth_date, height_cm,
                        activity_level, goal_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      input.email,
      input.sexAtBirth,
      input.birthDate,
      input.heightCm,
      input.activityLevel,
      input.goalType,
    ],
  );

  const userId = rows[0]!.id;

  await db.query(
    `INSERT INTO weight_entries (user_id, date, kg) VALUES ($1, $2, $3)`,
    [userId, isoDate(today), input.weightKg],
  );

  const goal = deriveGoalFor({ ...input, today });

  await db.query(
    `INSERT INTO goals (user_id, effective_from, kcal, protein_g, fat_g,
                        carbs_g, is_feasible)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      isoDate(today),
      goal.kcal,
      goal.proteinG,
      goal.fatG,
      goal.carbsG,
      goal.isFeasible,
    ],
  );

  return { userId, goal };
};

export const deriveGoalFor = (
  input: Omit<OnboardingInput, "email"> & { today: Date },
): MacroTargets => {
  const tdee = calculateTdee({
    sexAtBirth: input.sexAtBirth,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    ageYears: ageInYears(input.birthDate, input.today),
    activityLevel: input.activityLevel,
  });

  return deriveMacroTargets({
    tdee,
    weightKg: input.weightKg,
    goalType: input.goalType,
  });
};

/** The Goal in force on a given date, which may not be the current one. */
export const getGoalOn = async (
  db: Db,
  userId: string,
  date: string,
): Promise<MacroTargets | null> => {
  const { rows } = await db.query<{
    kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    is_feasible: boolean;
  }>(
    `SELECT kcal, protein_g, fat_g, carbs_g, is_feasible
       FROM goals
      WHERE user_id = $1 AND effective_from <= $2
      ORDER BY effective_from DESC
      LIMIT 1`,
    [userId, date],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    kcal: Number(row.kcal),
    proteinG: Number(row.protein_g),
    fatG: Number(row.fat_g),
    carbsG: Number(row.carbs_g),
    isFeasible: row.is_feasible,
  };
};
