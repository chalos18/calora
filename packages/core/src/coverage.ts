/**
 * The share of a day's intake that must carry a nutrient before Calora will
 * comment on it. Below this it reports "not enough data to judge" rather than
 * a shortfall.
 */
export const JUDGEABLE_COVERAGE_THRESHOLD = 0.8;

export interface CoverageEntry {
  grams: number;
  /** Absent key means the food's data does not report this nutrient at all. */
  nutrients: Readonly<Record<string, number>>;
}

export interface NutrientCoverage {
  /**
   * Total of the reported amounts, or null when nothing reported it.
   *
   * Null rather than zero is deliberate and load-bearing: absent data must not
   * be summable into a total that reads as a deficiency. Callers are forced to
   * handle the unknown case.
   */
  amount: number | null;
  /** Share of grams eaten whose food data reports this nutrient, 0..1. */
  coverage: number;
  isJudgeable: boolean;
}

export const computeNutrientCoverage = (
  entries: readonly CoverageEntry[],
  nutrientId: string,
  threshold = JUDGEABLE_COVERAGE_THRESHOLD,
): NutrientCoverage => {
  let totalGrams = 0;
  let coveredGrams = 0;
  let amount = 0;
  let anyReported = false;

  for (const entry of entries) {
    totalGrams += entry.grams;

    const reported = entry.nutrients[nutrientId];
    if (reported === undefined) continue;

    coveredGrams += entry.grams;
    amount += reported;
    anyReported = true;
  }

  const coverage = totalGrams === 0 ? 0 : coveredGrams / totalGrams;

  return {
    amount: anyReported ? amount : null,
    coverage,
    isJudgeable: anyReported && coverage >= threshold,
  };
};
