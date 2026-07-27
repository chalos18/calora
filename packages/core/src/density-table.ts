/**
 * Approximate densities in g/ml, used only when a food has no sourced portion
 * for the volume unit being asked for.
 *
 * Every figure here produces an *estimate*, never sourced data, and callers
 * must carry that distinction through to the Log Entry. Values are derived from
 * commonly cited cup weights (1 cup = 240 ml), so a cup of oil lands near 218 g
 * and a cup of cornflakes near 28 g.
 */
export const DENSITY_G_PER_ML = {
  water: 1.0,
  broth: 1.0,
  milk: 1.03,
  yoghurt: 1.03,
  oil: 0.9083,
  butter: 0.911,
  honey: 1.417,
  syrup: 1.317,
  flour: 0.5,
  sugar_granulated: 0.85,
  salt: 1.217,
  rice_dry: 0.85,
  rice_cooked: 0.7833,
  pasta_cooked: 0.5833,
  legume_dry: 0.8,
  legume_cooked: 0.7167,
  cereal_flake: 0.1167,
  oats_rolled: 0.375,
  nut_chopped: 0.5833,
  seed: 0.6,
  cheese_grated: 0.4,
  meat_diced: 0.6667,
  vegetable_chopped: 0.5833,
  fruit_chopped: 0.6417,
  leafy_raw: 0.125,
} as const;

export type DensityCategory = keyof typeof DENSITY_G_PER_ML;

/** Volume units Calora accepts, in millilitres. */
export const VOLUME_UNIT_ML = {
  ml: 1,
  tsp: 5,
  tbsp: 15,
  cup: 240,
} as const;

export type VolumeUnit = keyof typeof VOLUME_UNIT_ML;

export const isVolumeUnit = (unit: string): unit is VolumeUnit =>
  Object.hasOwn(VOLUME_UNIT_ML, unit);
