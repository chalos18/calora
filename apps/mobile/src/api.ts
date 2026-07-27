import Constants from "expo-constants";

/**
 * All model calls and registry reads go through the server, which is where the
 * Anthropic key lives. On web anything in the bundle is trivially extractable,
 * so the key must never reach a client.
 */
const baseUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:3000";

/**
 * A failed request, carrying any per-field messages the server returned so the
 * UI can show each one against the input it belongs to.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** True when the request never reached the server at all. */
export const isNetworkError = (cause: unknown): boolean =>
  cause instanceof TypeError ||
  (cause instanceof Error && /fetch|network/i.test(cause.message));

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      fields?: Record<string, string>;
    };
    throw new ApiError(
      body.error ?? `Request failed: ${response.status}`,
      response.status,
      body.fields ?? {},
    );
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
};

export interface MacroTargets {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  isFeasible: boolean;
}

export interface DiaryEntry {
  id: string;
  mealSlot: "breakfast" | "lunch" | "dinner" | "snacks";
  foodId: string | null;
  foodName: string;
  portionLabel: string;
  quantity: number;
  grams: number;
  isEstimated: boolean;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DayView {
  date: string;
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  goal: MacroTargets | null;
  remaining: number | null;
  entries: DiaryEntry[];
}

export interface FoodDetail {
  id: string;
  name: string;
  brandName: string | null;
  provenance: "usda" | "openfoodfacts" | "recipe" | "user";
  densityCategory: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  portions: { label: string; grams: number; source: string }[];
  hasRecipe: boolean;
  ingredients: string[];
}

export interface FoodSearchResult {
  id: string;
  name: string;
  brandName: string | null;
  provenance: "usda" | "openfoodfacts" | "recipe" | "user";
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  hasRecipe: boolean;
}

export const api = {
  getDay: (userId: string, date: string) =>
    request<DayView>(`/users/${userId}/days/${date}`),

  getFood: (foodId: string) => request<FoodDetail>(`/foods/${foodId}`),

  searchFoods: (userId: string, query: string) =>
    request<{ results: FoodSearchResult[] }>(
      `/foods/search?userId=${userId}&q=${encodeURIComponent(query)}`,
    ),

  recentFoods: (userId: string) =>
    request<{ foods: { foodId: string; foodName: string; lastLoggedAt: string }[] }>(
      `/users/${userId}/recent-foods`,
    ),

  logFood: (body: {
    userId: string;
    foodId: string;
    date: string;
    mealSlot: string;
    quantity: number;
    unit: string;
  }) =>
    request<{ id: string }>("/log-entries", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteLogEntry: (userId: string, id: string) =>
    request<void>(`/log-entries/${id}?userId=${userId}`, { method: "DELETE" }),

  onboard: (body: {
    email: string;
    sexAtBirth: "male" | "female";
    birthDate: string;
    heightCm: number;
    weightKg: number;
    activityLevel: string;
    goalType: string;
  }) =>
    request<{ userId: string; goal: MacroTargets }>("/onboarding", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
