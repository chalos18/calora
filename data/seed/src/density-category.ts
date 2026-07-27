import type { DensityCategory } from "@calora/core";

/**
 * Guess a food's density category from its USDA description.
 *
 * USDA names are "Food, qualifier, qualifier, ..." - "Beans, black, mature
 * seeds, cooked, boiled, without salt". Only the head names the food; every
 * comma-separated tail is a qualifier.
 *
 * That distinction is load-bearing. Matching the whole string lets a qualifier
 * win: "without salt" classified cooked beans as salt, which converts a cup at
 * 1.217 g/ml instead of 0.717 - 292 g where 172 g was right, and that number
 * freezes onto a Log Entry looking like every other.
 *
 * Only used when a food has no sourced portion for the unit asked for, and
 * every weight it produces is marked estimated. A wrong guess is still worse
 * than none, so anything unrecognised stays unset and the app declines to
 * convert rather than inventing a weight.
 */
const HEAD_RULES: [RegExp, DensityCategory][] = [
  [/^oils?$|^shortening$/, "oil"],
  [/^butter$|^margarine$/, "butter"],
  [/^honey$/, "honey"],
  [/^syrups?$|^molasses$/, "syrup"],
  [/^salt$/, "salt"],
  [/^sugars?$/, "sugar_granulated"],
  [/^flours?$|^cornmeal$|^starch$/, "flour"],
  [/^cereals?$/, "cereal_flake"],
  [/^oats?$|^oatmeal$/, "oats_rolled"],
  [/^milk$|^cream$|^buttermilk$/, "milk"],
  [/^yogh?urt$/, "yoghurt"],
  [/^cheese$/, "cheese_grated"],
  [/^broth$|^stock$|^bouillon$|^soup$/, "broth"],
  [/^water$|^juice$|^beverages?$/, "water"],
  [/^nuts?$|^almonds?$|^walnuts?$|^peanuts?$|^cashews?$|^pecans?$/, "nut_chopped"],
  [/^seeds?$/, "seed"],
  [/^rice$/, "rice_dry"],
  [/^pasta$|^macaroni$|^spaghetti$|^noodles$/, "pasta_cooked"],
  [
    /^beans?$|^lentils?$|^chickpeas?$|^peas?$|^legumes?$|^soybeans?$/,
    "legume_dry",
  ],
  [/^lettuce$|^spinach$|^kale$|^greens$|^cabbage$|^herbs?$|^parsley$/, "leafy_raw"],
  [
    /^beef$|^pork$|^chicken$|^turkey$|^lamb$|^fish$|^veal$|^game meat$|^meat$|^sausages?$|^ham$|^bacon$/,
    "meat_diced",
  ],
  [
    /^apples?$|^bananas?$|^berries$|^oranges?$|^peaches$|^pears?$|^mangos?$|^grapes$|^melons?$|^strawberries$|^blueberries$/,
    "fruit_chopped",
  ],
  [
    /^broccoli$|^carrots?$|^onions?$|^peppers?$|^tomatoes$|^potatoes$|^squash$|^celery$|^cucumber$|^mushrooms?$/,
    "vegetable_chopped",
  ],
];

/** Categories whose density differs materially once cooked. */
const COOKED_FORM: Partial<Record<DensityCategory, DensityCategory>> = {
  rice_dry: "rice_cooked",
  legume_dry: "legume_cooked",
};

const isCooked = (description: string): boolean =>
  /\b(cooked|boiled|steamed|braised|roasted|baked|stewed)\b/i.test(description);

export const inferDensityCategory = (
  description: string,
): DensityCategory | null => {
  const head = (description.split(",")[0] ?? "").trim().toLowerCase();
  if (head === "") return null;

  for (const [pattern, category] of HEAD_RULES) {
    if (!pattern.test(head)) continue;

    return isCooked(description)
      ? (COOKED_FORM[category] ?? category)
      : category;
  }

  return null;
};
