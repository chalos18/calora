/**
 * Warm, dark, round.
 *
 * The background is brown-tinted rather than blue-black, which is what makes
 * the palette read as warm instead of merely dark.
 */
export const theme = {
  colour: {
    background: "#1A1512",
    surface: "#241D18",
    surfaceRaised: "#2E2620",
    border: "#3A302A",

    text: "#F5EDE6",
    textMuted: "#A08D7F",

    accent: "#E8925A",
    accentText: "#1A1512",
    danger: "#C75D4A",

    // The three macros step down in lightness as well as hue, so the donut
    // stays readable without relying on colour discrimination alone.
    protein: "#C75D4A",
    carbs: "#F2A65A",
    fat: "#EDD79B",
  },

  radius: {
    /** Buttons and chips are fully rounded. */
    pill: 9999,
    card: 20,
  },

  space: (units: number) => units * 8,

  font: {
    display: 34,
    title: 22,
    body: 16,
    label: 13,
  },
} as const;

export type MacroKey = "protein" | "carbs" | "fat";

export const MACRO_COLOUR: Record<MacroKey, string> = {
  protein: theme.colour.protein,
  carbs: theme.colour.carbs,
  fat: theme.colour.fat,
};

export const MEAL_SLOTS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snacks", label: "Snacks" },
] as const;

export type MealSlotKey = (typeof MEAL_SLOTS)[number]["key"];
