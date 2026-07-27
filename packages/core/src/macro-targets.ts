export type GoalType = "lose" | "maintain" | "gain" | "build_muscle";

export interface MacroTargetInput {
  tdee: number;
  weightKg: number;
  goalType: GoalType;
}

export interface MacroTargets {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /**
   * False when the calorie goal cannot accommodate the protein and fat floors.
   * The floors win and the calorie goal is exceeded, because a target that
   * starves protein is worse than one that misses its deficit. The UI is
   * expected to surface this rather than silently show an unreachable goal.
   */
  isFeasible: boolean;
}

const KCAL_ADJUSTMENT: Record<GoalType, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
  build_muscle: 250,
};

const PROTEIN_G_PER_KG: Record<GoalType, number> = {
  lose: 2.2,
  maintain: 1.6,
  gain: 1.8,
  build_muscle: 2.0,
};

/**
 * Protein-first macro targets, anchored to bodyweight rather than to
 * percentages of the calorie goal.
 *
 * A percentage split cuts the protein target as calories fall, which is
 * backwards for cutting and for building muscle. Anchoring to kg keeps protein
 * where it belongs and lets carbohydrate absorb the variation.
 */
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

const FAT_G_PER_KG = 0.9;

/** Below these, a target stops being a diet and starts being a deficiency. */
export const PROTEIN_FLOOR_G_PER_KG = 1.6;
export const FAT_FLOOR_G_PER_KG = 0.8;

export const deriveMacroTargets = ({
  tdee,
  weightKg,
  goalType,
}: MacroTargetInput): MacroTargets => {
  const kcal = tdee + KCAL_ADJUSTMENT[goalType];

  let proteinG = Math.round(PROTEIN_G_PER_KG[goalType] * weightKg);
  let fatG = Math.round(FAT_G_PER_KG * weightKg);

  const proteinFloorG = Math.round(PROTEIN_FLOOR_G_PER_KG * weightKg);
  const fatFloorG = Math.round(FAT_FLOOR_G_PER_KG * weightKg);

  const overspend = () =>
    proteinG * KCAL_PER_G.protein + fatG * KCAL_PER_G.fat - kcal;

  // When the calorie goal cannot fit both, give up fat before protein: fat has
  // the lower floor and protein is the macro the goal exists to protect.
  if (overspend() > 0) {
    fatG -= Math.min(
      Math.ceil(overspend() / KCAL_PER_G.fat),
      fatG - fatFloorG,
    );
  }

  if (overspend() > 0) {
    proteinG -= Math.min(
      Math.ceil(overspend() / KCAL_PER_G.protein),
      proteinG - proteinFloorG,
    );
  }

  const remaining =
    kcal - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat;
  const carbsG = Math.max(0, Math.round(remaining / KCAL_PER_G.carbs));

  return { kcal, proteinG, fatG, carbsG, isFeasible: overspend() <= 0 };
};
