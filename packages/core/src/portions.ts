import type { DensityCategory } from "./density-table.js";
import {
  DENSITY_G_PER_ML,
  isVolumeUnit,
  VOLUME_UNIT_ML,
} from "./density-table.js";

export type PortionSource = "usda" | "off" | "density" | "user";

export interface Portion {
  label: string;
  grams: number;
  source: PortionSource;
}

export interface ResolveGramsInput {
  quantity: number;
  /** Either a mass/volume unit ("g", "ml", "cup") or a Portion label. */
  unit: string;
  portions: readonly Portion[];
  densityCategory?: DensityCategory;
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
