import { Hono } from "hono";
import { z } from "zod";
import type { Db } from "./db.js";
import {
  deleteLogEntry,
  getDayEntries,
  getDayTotals,
  getRecentFoods,
  logFood,
} from "./diary.js";
import { getGoalOn, onboardUser } from "./onboarding.js";
import { searchFoods } from "./search.js";

const onboardingSchema = z.object({
  email: z.email(),
  sexAtBirth: z.enum(["male", "female"]),
  birthDate: z.iso.date(),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),
  goalType: z.enum(["lose", "maintain", "gain", "build_muscle"]),
});

const logEntrySchema = z.object({
  userId: z.uuid(),
  foodId: z.uuid(),
  date: z.iso.date(),
  mealSlot: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
  quantity: z.number().positive(),
  unit: z.string().min(1),
});

export const createApp = (db: Db) => {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/onboarding", async (c) => {
    const parsed = onboardingSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "invalid_input", detail: parsed.error.issues }, 400);
    }

    return c.json(await onboardUser(db, parsed.data), 201);
  });

  app.get("/foods/search", async (c) => {
    const userId = c.req.query("userId");
    const query = c.req.query("q") ?? "";
    if (!userId) return c.json({ error: "userId_required" }, 400);

    return c.json({ results: await searchFoods(db, userId, query) });
  });

  app.post("/log-entries", async (c) => {
    const parsed = logEntrySchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json({ error: "invalid_input", detail: parsed.error.issues }, 400);
    }

    const result = await logFood(db, parsed.data);
    if ("error" in result) return c.json(result, 400);

    return c.json(result, 201);
  });

  app.delete("/log-entries/:id", async (c) => {
    const userId = c.req.query("userId");
    if (!userId) return c.json({ error: "userId_required" }, 400);

    const deleted = await deleteLogEntry(db, userId, c.req.param("id"));
    return deleted ? c.body(null, 204) : c.json({ error: "not_found" }, 404);
  });

  // The home screen: totals, the goal that applied on that date, and the diary.
  app.get("/users/:userId/days/:date", async (c) => {
    const userId = c.req.param("userId");
    const date = c.req.param("date");

    const [totals, goal, entries] = await Promise.all([
      getDayTotals(db, userId, date),
      getGoalOn(db, userId, date),
      getDayEntries(db, userId, date),
    ]);

    return c.json({
      date,
      totals,
      goal,
      remaining: goal ? goal.kcal - totals.kcal : null,
      entries,
    });
  });

  app.get("/users/:userId/recent-foods", async (c) =>
    c.json({ foods: await getRecentFoods(db, c.req.param("userId")) }),
  );

  return app;
};
