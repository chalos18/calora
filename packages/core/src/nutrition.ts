export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Nutrition data is always held per 100 g; this is the only basis. */
const BASIS_GRAMS = 100;

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Scale a per-100g macro basis to the grams actually eaten.
 *
 * The result is what gets frozen onto a Log Entry, so it is rounded here rather
 * than at display time - the stored number and the shown number must agree.
 */
export const scaleMacrosToGrams = (macros: Macros, grams: number): Macros => {
  const factor = grams / BASIS_GRAMS;

  return {
    kcal: Math.round(macros.kcal * factor),
    protein: round(macros.protein * factor, 1),
    carbs: round(macros.carbs * factor, 1),
    fat: round(macros.fat * factor, 1),
  };
};

/**
 * Scale the long tail of nutrients. Nutrients absent from the input stay absent
 * from the output: a missing nutrient is unknown, not zero, and the coverage
 * calculation relies on telling those apart.
 */
export const scaleNutrientsToGrams = (
  nutrients: Readonly<Record<string, number>>,
  grams: number,
): Record<string, number> => {
  const factor = grams / BASIS_GRAMS;

  return Object.fromEntries(
    Object.entries(nutrients).map(([id, amount]) => [
      id,
      round(amount * factor, 4),
    ]),
  );
};
