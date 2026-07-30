import type { DensityCategory } from "./density-table.js";
import {
  DENSITY_G_PER_ML,
  isVolumeUnit,
  VOLUME_UNIT_ML,
} from "./density-table.js";

/**
 * A Unit is how a person expresses an amount when logging - grams, a volume, or
 * the label of one of that Food's Portions. See CONTEXT.md; a Unit is not a
 * Portion, because "tbsp" may convert via density for a Food that has no tbsp
 * Portion.
 */
export type Unit = string;

export type PortionSource = "usda" | "off" | "density" | "user";

export interface Portion {
  label: string;
  grams: number;
  source: PortionSource;
}

export interface FoodMeasures {
  portions: readonly Portion[];
  densityCategory?: DensityCategory;
}

export interface ResolveGramsInput extends FoodMeasures {
  quantity: number;
  /** Either a mass/volume Unit ("g", "ml", "cup") or a Portion label. */
  unit: Unit;
}

export interface ResolvedGrams {
  grams: number;
  /**
   * True when the gram weight was inferred rather than sourced. Surfaced in the
   * UI as an approximation, and carried onto the Log Entry, because these
   * figures roll up into daily totals that are then frozen.
   */
  isEstimated: boolean;
}

export const resolveGrams = ({
  quantity,
  unit,
  portions,
  densityCategory,
}: ResolveGramsInput): ResolvedGrams | null => {
  if (unit === "g") {
    return { grams: quantity, isEstimated: false };
  }

  // A measured weight always beats an inferred one.
  const portion = portions.find((candidate) => candidate.label === unit);
  if (portion) {
    return {
      grams: portion.grams * quantity,
      isEstimated: portion.source === "density",
    };
  }

  if (isVolumeUnit(unit) && densityCategory) {
    const millilitres = VOLUME_UNIT_ML[unit] * quantity;
    return {
      grams: Math.round(millilitres * DENSITY_G_PER_ML[densityCategory]),
      isEstimated: true,
    };
  }

  // Better to offer no answer than an invented one: the caller shows grams
  // only, rather than a cup measure Calora cannot honestly convert.
  return null;
};

/**
 * Every Unit this Food can be logged in.
 *
 * The counterpart to `resolveGrams`, and deliberately its neighbour: a Unit
 * must be offered only when it can be converted. Written separately, the two
 * drifted - the offer list said a volume Unit was available for any Food with a
 * density category, while the conversion beside it had no density branch at
 * all, so half the registry offered "tbsp" and then reported no weight for it.
 * `portions.test.ts` asserts the invariant directly.
 */
export const offerableUnits = ({
  portions,
  densityCategory,
}: FoodMeasures): Unit[] => {
  const portionLabels = portions.map((portion) => portion.label);

  // Volume Units only convert via the density table, so they are meaningless
  // without a category - and redundant where a measured Portion already exists.
  const volumeUnits = densityCategory
    ? Object.keys(VOLUME_UNIT_ML).filter(
        (unit) => !portionLabels.includes(unit),
      )
    : [];

  return ["g", ...portionLabels, ...volumeUnits];
};
