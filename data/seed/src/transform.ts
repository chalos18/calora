import {
  USDA_MACRO_IDS,
  USDA_NUTRIENT_MAP,
  type NutrientDefinition,
} from "./nutrient-map.js";

export type CsvRow = Record<string, string>;

/**
 * A small RFC-4180 reader. USDA's exports contain commas and quotes inside
 * descriptions ("Beans, black, boiled"), so splitting on commas loses data.
 */
export const parseCsv = (contents: string): CsvRow[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < contents.length; i++) {
    const char = contents[i]!;

    if (inQuotes) {
      if (char === '"') {
        if (contents[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && contents[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value !== "")) rows.push(row);

  const [header, ...body] = rows;
  if (!header) return [];

  return body.map((values) =>
    Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])),
  );
};

export interface SeedPortion {
  label: string;
  grams: number;
  source: "usda";
}

export interface SeedFood {
  fdcId: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  nutrients: { nutrientId: string; amount: number }[];
  portions: SeedPortion[];
}

export interface TransformInput {
  foodRows: CsvRow[];
  nutrientRows: CsvRow[];
  portionRows: CsvRow[];
}

// Branded foods are excluded on purpose: packaged products come from Open Food
// Facts at scan time, and USDA's branded set is US-only and vast.
const KEPT_DATA_TYPES = new Set(["sr_legacy_food", "foundation_food"]);

const groupBy = <T>(rows: T[], key: (row: T) => string): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const existing = map.get(id);
    if (existing) existing.push(row);
    else map.set(id, [row]);
  }
  return map;
};

export const toSeedFoods = ({
  foodRows,
  nutrientRows,
  portionRows,
}: TransformInput): SeedFood[] => {
  const nutrientsByFood = groupBy(nutrientRows, (row) => row.fdc_id ?? "");
  const portionsByFood = groupBy(portionRows, (row) => row.fdc_id ?? "");

  const foods: SeedFood[] = [];

  for (const foodRow of foodRows) {
    if (!KEPT_DATA_TYPES.has(foodRow.data_type ?? "")) continue;

    const fdcId = foodRow.fdc_id ?? "";
    const rows = nutrientsByFood.get(fdcId) ?? [];

    const macros: Record<string, number> = {};
    const nutrients: { nutrientId: string; amount: number }[] = [];

    for (const row of rows) {
      const usdaId = Number(row.nutrient_id);
      const amount = Number(row.amount);
      if (!Number.isFinite(amount)) continue;

      const macroKey = USDA_MACRO_IDS[usdaId as keyof typeof USDA_MACRO_IDS];
      if (macroKey) {
        macros[macroKey] = amount;
        continue;
      }

      const definition: NutrientDefinition | undefined =
        USDA_NUTRIENT_MAP[usdaId];
      if (definition) {
        nutrients.push({ nutrientId: definition.id, amount });
      }
    }

    // Without energy there is nothing to log against; such rows are reference
    // entries rather than foods.
    if (macros.kcal === undefined) continue;

    const portions: SeedPortion[] = (portionsByFood.get(fdcId) ?? [])
      .map((row) => ({
        label: (row.modifier || row.portion_description || "").trim(),
        grams: Number(row.gram_weight),
        source: "usda" as const,
      }))
      .filter((portion) => portion.label !== "" && portion.grams > 0);

    foods.push({
      fdcId,
      name: foodRow.description ?? "",
      kcal: macros.kcal,
      protein: macros.protein ?? 0,
      carbs: macros.carbs ?? 0,
      fat: macros.fat ?? 0,
      nutrients,
      portions,
    });
  }

  return foods;
};
