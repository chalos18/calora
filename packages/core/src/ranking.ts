export type Provenance = "usda" | "openfoodfacts" | "recipe" | "user";

export interface RankableFood {
  id: string;
  name: string;
  provenance: Provenance;
  /** 0..1 relevance from the search engine (SQLite FTS5 or Postgres trigram). */
  textScore: number;
  /** How many times this person has logged this food. */
  logCount: number;
  lastLoggedAt: Date | null;
}

/**
 * How much a Food's origin vouches for its data. Mirrors the tiering that
 * MyFitnessPal gets from staff dietitians, computed instead of curated.
 */
const PROVENANCE_SCORE: Record<Provenance, number> = {
  usda: 1,
  openfoodfacts: 0.9,
  recipe: 0.8,
  user: 0.5,
};

const HISTORY_WEIGHT = 10;
const PROVENANCE_WEIGHT = 2;
const TEXT_WEIGHT = 1;

/** Days after which a food's history counts for half as much. */
const RECENCY_HALF_LIFE_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const historyScore = (food: RankableFood, now: Date): number => {
  if (food.logCount === 0 || food.lastLoggedAt === null) return 0;

  const daysSince = (now.getTime() - food.lastLoggedAt.getTime()) / MS_PER_DAY;
  const recency = 0.5 ** (daysSince / RECENCY_HALF_LIFE_DAYS);

  // log1p so a food logged 100 times does not bury everything else.
  return Math.log1p(food.logCount) * recency;
};

export const scoreFood = (food: RankableFood, now: Date): number =>
  HISTORY_WEIGHT * historyScore(food, now) +
  PROVENANCE_WEIGHT * PROVENANCE_SCORE[food.provenance] +
  TEXT_WEIGHT * food.textScore;

/**
 * Best Match, computed. History dominates because for one person the strongest
 * predictor of what they are typing is what they have already eaten.
 *
 * Deliberately local and deterministic: search is the app's hottest path, so it
 * must not depend on a network round trip.
 */
export const rankFoods = <T extends RankableFood>(
  foods: readonly T[],
  now: Date,
): T[] =>
  [...foods].sort((a, b) => scoreFood(b, now) - scoreFood(a, now));
