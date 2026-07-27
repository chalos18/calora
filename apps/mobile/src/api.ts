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

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? `Request failed: ${response.status}`);
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
