export {
  DENSITY_G_PER_ML,
  isDensityCategory,
  isVolumeUnit,
  VOLUME_UNIT_ML,
  type DensityCategory,
  type VolumeUnit,
} from "./density-table.js";

export {
  computeNutrientCoverage,
  JUDGEABLE_COVERAGE_THRESHOLD,
  type CoverageEntry,
  type NutrientCoverage,
} from "./coverage.js";

export {
  deriveMacroTargets,
  FAT_FLOOR_G_PER_KG,
  KCAL_PER_G,
  PROTEIN_FLOOR_G_PER_KG,
  type GoalType,
  type MacroTargetInput,
  type MacroTargets,
} from "./macro-targets.js";

export {
  scaleMacrosToGrams,
  scaleNutrientsToGrams,
  type Macros,
} from "./nutrition.js";

export {
  offerableUnits,
  resolveGrams,
  type FoodMeasures,
  type Portion,
  type PortionSource,
  type ResolvedGrams,
  type ResolveGramsInput,
  type Unit,
} from "./portions.js";

export {
  rankFoods,
  scoreFood,
  type Provenance,
  type RankableFood,
} from "./ranking.js";

export { textMatchScore } from "./text-score.js";

export {
  ACTIVITY_FACTORS,
  calculateBmr,
  calculateTdee,
  type ActivityLevel,
  type BmrInput,
  type SexAtBirth,
  type TdeeInput,
} from "./tdee.js";
