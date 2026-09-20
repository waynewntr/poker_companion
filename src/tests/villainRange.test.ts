import { describe, it, expect } from "vitest";
import { analyzeVillainRange } from "@/strategy/villainRange";
import { getVillainCombos } from "@/data/archetypeRanges";
import { evaluateBestHand } from "@/poker/evaluator";

describe("analyzeVillainRange", () => {
  it("returns zero beatHeroCount when hero has nuts (royal flush)", () => {
    const heroCards = [
      { rank: "A" as const, suit: "s" as const },
      { rank: "K" as const, suit: "s" as const },
    ];
    const board = [
      { rank: "Q" as const, suit: "s" as const },
      { rank: "J" as const, suit: "s" as const },
      { rank: "T" as const, suit: "s" as const },
    ];
    const heroResult = evaluateBestHand(heroCards, board);
    const blocked = [...heroCards, ...board];
    const combos = getVillainCombos("gto_oriented_reg", "BTN", blocked);

    const result = analyzeVillainRange(combos, heroCards, board, heroResult, "gto_oriented_reg", "BTN");
    expect(result.beatHeroPct).toBe(0);
    expect(result.totalCombos).toBeGreaterThan(0);
  });

  it("beatHeroPct > 0 when villain has strong hands that beat hero pair", () => {
    const heroCards = [
      { rank: "A" as const, suit: "s" as const },
      { rank: "K" as const, suit: "s" as const },
    ];
    const board = [
      { rank: "A" as const, suit: "h" as const },
      { rank: "8" as const, suit: "c" as const },
      { rank: "4" as const, suit: "d" as const },
    ];
    const heroResult = evaluateBestHand(heroCards, board);
    const blocked = [...heroCards, ...board];
    const combos = getVillainCombos("gto_oriented_reg", "BTN", blocked);

    const result = analyzeVillainRange(combos, heroCards, board, heroResult, "gto_oriented_reg", "BTN");
    expect(result.beatHeroPct).toBeGreaterThan(0);
  });

  it("drawingToWinCount > 0 when villain has flush draw that beats hero straight", () => {
    const heroCards = [
      { rank: "Q" as const, suit: "s" as const },
      { rank: "J" as const, suit: "s" as const },
    ];
    const board = [
      { rank: "T" as const, suit: "s" as const },
      { rank: "9" as const, suit: "s" as const },
      { rank: "8" as const, suit: "h" as const },
    ];
    const heroResult = evaluateBestHand(heroCards, board);
    const blocked = [...heroCards, ...board];
    const combos = getVillainCombos("gto_oriented_reg", "BTN", blocked);

    const result = analyzeVillainRange(combos, heroCards, board, heroResult, "gto_oriented_reg", "BTN");
    expect(result.drawingToWinCount).toBeGreaterThan(0);
    expect(result.drawDescriptions.length).toBeGreaterThan(0);
  });

  it("threatLevel is LOW when drawingToWinPct < 0.10", () => {
    const heroCards = [
      { rank: "A" as const, suit: "s" as const },
      { rank: "K" as const, suit: "h" as const },
    ];
    const board = [
      { rank: "A" as const, suit: "h" as const },
      { rank: "K" as const, suit: "d" as const },
      { rank: "2" as const, suit: "c" as const },
    ];
    const heroResult = evaluateBestHand(heroCards, board);
    const result = analyzeVillainRange([], heroCards, board, heroResult, "nit", "UTG");
    expect(result.threatLevel).toBe("LOW");
    expect(result.totalCombos).toBe(0);
    expect(result.beatHeroPct).toBe(0);
  });

  it("equityDenialFraction is a valid fraction", () => {
    const heroCards = [
      { rank: "A" as const, suit: "s" as const },
      { rank: "K" as const, suit: "s" as const },
    ];
    const board = [
      { rank: "Q" as const, suit: "s" as const },
      { rank: "J" as const, suit: "s" as const },
      { rank: "2" as const, suit: "h" as const },
    ];
    const heroResult = evaluateBestHand(heroCards, board);
    const blocked = [...heroCards, ...board];
    const combos = getVillainCombos("maniac", "BTN", blocked);
    const result = analyzeVillainRange(combos, heroCards, board, heroResult, "maniac", "BTN");
    expect(result.equityDenialFraction).toBeGreaterThanOrEqual(0.25);
    expect(result.equityDenialFraction).toBeLessThanOrEqual(2);
  });
});
