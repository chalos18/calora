/**
 * The subset of USDA's ~150 components Calora keeps.
 *
 * Trimming here is what turns an 83 MB dataset into a few MB the app can
 * bundle: the full export carries sampling metadata, analytical methods and
 * components nobody tracks. Macros are handled separately because they live in
 * columns, not in the nutrient table.
 */
export const USDA_MACRO_IDS = {
  1008: "kcal",
  1003: "protein",
  1005: "carbs",
  1004: "fat",
} as const;

export interface NutrientDefinition {
  id: string;
  name: string;
  unit: string;
}

/** USDA nutrient number -> Calora nutrient. */
export const USDA_NUTRIENT_MAP: Record<number, NutrientDefinition> = {
  1079: { id: "FIBER", name: "Fibre", unit: "g" },
  2000: { id: "SUGAR", name: "Total sugars", unit: "g" },
  1258: { id: "SATFAT", name: "Saturated fat", unit: "g" },

  1087: { id: "CA", name: "Calcium", unit: "mg" },
  1089: { id: "FE", name: "Iron", unit: "mg" },
  1090: { id: "MG", name: "Magnesium", unit: "mg" },
  1091: { id: "P", name: "Phosphorus", unit: "mg" },
  1092: { id: "K", name: "Potassium", unit: "mg" },
  1093: { id: "NA", name: "Sodium", unit: "mg" },
  1095: { id: "ZN", name: "Zinc", unit: "mg" },
  1098: { id: "CU", name: "Copper", unit: "mg" },
  1101: { id: "MN", name: "Manganese", unit: "mg" },
  1103: { id: "SE", name: "Selenium", unit: "ug" },

  1106: { id: "VITA", name: "Vitamin A (RAE)", unit: "ug" },
  1162: { id: "VITC", name: "Vitamin C", unit: "mg" },
  1114: { id: "VITD", name: "Vitamin D", unit: "ug" },
  1109: { id: "VITE", name: "Vitamin E", unit: "mg" },
  1185: { id: "VITK", name: "Vitamin K", unit: "ug" },
  1165: { id: "B1", name: "Thiamin", unit: "mg" },
  1166: { id: "B2", name: "Riboflavin", unit: "mg" },
  1167: { id: "B3", name: "Niacin", unit: "mg" },
  1175: { id: "B6", name: "Vitamin B6", unit: "mg" },
  1177: { id: "B9", name: "Folate", unit: "ug" },
  1178: { id: "B12", name: "Vitamin B12", unit: "ug" },
  1170: { id: "B5", name: "Pantothenic acid", unit: "mg" },
  1180: { id: "CHOLINE", name: "Choline", unit: "mg" },
};

export const KEPT_NUTRIENTS: NutrientDefinition[] = Object.values(
  USDA_NUTRIENT_MAP,
);
