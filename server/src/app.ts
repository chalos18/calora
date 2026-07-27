import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import type { Db } from "./db.js";
import {
  deleteLogEntry,
  getDayEntries,
  getDayTotals,
  getRecentFoods,
  logFood,
} from "./diary.js";
import { getFood } from "./foods.js";
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

/**
 * Turn Zod issues into a field -> message map.
 *
 * The client renders each message against the input it belongs to, so a flat
 * list of issues is not enough - the field name has to survive.
 */
const fieldErrors = (error: z.ZodError): Record<string, string> => {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in fields)) {
      fields[field] = issue.message;
    }
  }
  return fields;
};

/** Postgres unique-constraint violation. */
const isUniqueViolation = (cause: unknown): boolean =>
  typeof cause === "object" &&
  cause !== null &&
  "code" in cause &&
  (cause as { code?: string }).code === "23505";

const logEntrySchema = z.object({
  userId: z.uuid(),
  foodId: z.uuid(),
  date: z.iso.date(),
  mealSlot: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
  quantity: z.number().positive(),
  unit: z.string().min(1),
});

export interface AppOptions {
  /**
   * Allow requests from another origin. Needed in development, where the Expo
   * web client is served from :8081 while this API listens on :3000, so the
   * browser sends a preflight OPTIONS before every POST.
   *
   * Off by default: production serves both from one origin, and a permissive
   * default would be a security decision made by accident.
   */
  allowCrossOrigin?: boolean;
}

export const createApp = (db: Db, options: AppOptions = {}) => {
  const app = new Hono();

  // Registered before any route: Hono applies middleware in registration
  // order, so mounting this afterwards silently does nothing.
  if (options.allowCrossOrigin) {
    app.use("*", cors());
  }

  app.get("/health", (c) => c.json({ ok: true }));

  app.post("/onboarding", async (c) => {
    const parsed = onboardingSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json(
        { error: "invalid_input", fields: fieldErrors(parsed.error) },
        400,
      );
    }

    try {
      return c.json(await onboardUser(db, parsed.data), 201);
    } catch (cause) {
      if (isUniqueViolation(cause)) {
        return c.json(
          {
            error: "email_taken",
            fields: {
              email: "That email is already registered on this Calora.",
            },
          },
          409,
        );
      }
      throw cause;
    }
  });

  app.get("/foods/search", async (c) => {
    const userId = c.req.query("userId");
    const query = c.req.query("q") ?? "";
    if (!userId) return c.json({ error: "userId_required" }, 400);

    return c.json({ results: await searchFoods(db, userId, query) });
  });

  // Registered after /foods/search: "search" is a valid-looking :id, and
  // Hono matches in registration order.
  app.get("/foods/:id", async (c) => {
    const food = await getFood(db, c.req.param("id"));
    return food ? c.json(food) : c.json({ error: "not_found" }, 404);
  });

  app.post("/log-entries", async (c) => {
    const parsed = logEntrySchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json(
        { error: "invalid_input", fields: fieldErrors(parsed.error) },
        400,
      );
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
