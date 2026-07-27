import { describe, expect, it } from "vitest";
import { textMatchScore } from "./text-score.js";

describe("textMatchScore", () => {
  it("scores an exact name as a perfect match", () => {
    expect(textMatchScore("Feijoada", "feijoada")).toBe(1);
  });

  it("scores by how much of the query the name accounts for", () => {
    // "beans" hits, "brazilian" does not.
    expect(textMatchScore("Beans, black, boiled", "brazilian beans")).toBe(0.5);
  });

  it("ignores punctuation and case", () => {
    expect(textMatchScore("Beans, BLACK; boiled", "black beans")).toBe(1);
  });

  it("matches on word prefixes so partial typing still finds things", () => {
    expect(textMatchScore("Broccoli, raw", "brocc")).toBe(1);
  });

  it("scores nothing for an unrelated name", () => {
    expect(textMatchScore("Feijoada", "cornflakes")).toBe(0);
  });

  it("scores an empty query as no match rather than a perfect one", () => {
    expect(textMatchScore("Feijoada", "   ")).toBe(0);
  });
});
