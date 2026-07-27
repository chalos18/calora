export type SexAtBirth = "male" | "female";

export interface BmrInput {
  sexAtBirth: SexAtBirth;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}

/**
 * Mifflin-St Jeor basal metabolic rate, in kcal/day.
 *
 * See docs/adr — the formula is implemented locally rather than fetched from a
 * calculator API. It is arithmetic, and a network call would only add latency,
 * a key, a rate limit and an offline failure mode.
 */
export const calculateBmr = ({
  sexAtBirth,
  weightKg,
  heightCm,
  ageYears,
}: BmrInput): number =>
  10 * weightKg +
  6.25 * heightCm -
  5 * ageYears +
  (sexAtBirth === "male" ? 5 : -161);

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

/**
 * Standard Mifflin-St Jeor activity multipliers. The spread between the
 * extremes is ~58%, which is why Activity Level is a required onboarding
 * input: without it a calorie target is guesswork.
 */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface TdeeInput extends BmrInput {
  activityLevel: ActivityLevel;
}

/** Total daily energy expenditure, in whole kcal/day. */
export const calculateTdee = (input: TdeeInput): number =>
  Math.round(calculateBmr(input) * ACTIVITY_FACTORS[input.activityLevel]);
