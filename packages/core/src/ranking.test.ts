import { describe, expect, it } from "vitest";
import type { RankableFood } from "./ranking.js";
import { rankFoods } from "./ranking.js";

const NOW = new Date("2026-07-27T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const food = (overrides: Partial<RankableFood> & { id: string }): RankableFood => ({
  name: overrides.id,
  provenance: "usda",
  textScore: 0.5,
  logCount: 0,
  lastLoggedAt: null,
  ...overrides,
});

const idsInOrder = (foods: RankableFood[]) =>
  rankFoods(foods, NOW).map((f) => f.id);

describe("rankFoods", () => {
  it("puts a food you actually eat above a better text match you never log", () => {
    // Searching "brazilian beans": the verbose user entry matches more words,
    // but the feijoada logged twelve times is what was meant.
    const ranked = idsInOrder([
      food({ id: "brazilian-style-black-beans", provenance: "user", textScore: 1 }),
      food({
        id: "feijoada",
        provenance: "recipe",
        textScore: 0.3,
        logCount: 12,
        lastLoggedAt: daysAgo(1),
      }),
    ]);

    expect(ranked[0]).toBe("feijoada");
  });

  it("prefers sourced data over user-created when nothing has been logged", () => {
    const ranked = idsInOrder([
      food({ id: "user-entry", provenance: "user" }),
      food({ id: "usda-entry", provenance: "usda" }),
    ]);

    expect(ranked[0]).toBe("usda-entry");
  });

  it("falls back to text relevance when history and provenance tie", () => {
    const ranked = idsInOrder([
      food({ id: "weak-match", textScore: 0.4 }),
      food({ id: "strong-match", textScore: 0.9 }),
    ]);

    expect(ranked[0]).toBe("strong-match");
  });

  it("decays history so a stale favourite yields to a current one", () => {
    const ranked = idsInOrder([
      food({ id: "last-year", logCount: 5, lastLoggedAt: daysAgo(300) }),
      food({ id: "yesterday", logCount: 5, lastLoggedAt: daysAgo(1) }),
    ]);

    expect(ranked[0]).toBe("yesterday");
  });

  it("does not mutate the array it was given", () => {
    const foods = [food({ id: "a", textScore: 0.1 }), food({ id: "b", textScore: 0.9 })];
    rankFoods(foods, NOW);

    expect(foods.map((f) => f.id)).toEqual(["a", "b"]);
  });
});
