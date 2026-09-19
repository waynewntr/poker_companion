import { describe, it, expect } from "vitest";
import { nextCardProbability, runoutProbability, enumeratedRunoutProbability } from "@/poker/probability";

describe("nextCardProbability", () => {
  it("flop: 9 outs / 47 ≈ 19.15%", () => {
    expect(nextCardProbability(9, "flop")).toBeCloseTo(9 / 47, 5);
  });

  it("turn: 9 outs / 46", () => {
    expect(nextCardProbability(9, "turn")).toBeCloseTo(9 / 46, 5);
  });

  it("returns 0 for 0 outs", () => {
    expect(nextCardProbability(0, "flop")).toBe(0);
  });

  it("caps at 1 for outs > unseen (guard)", () => {
    expect(nextCardProbability(50, "flop")).toBe(1);
  });
});

describe("runoutProbability", () => {
  it("greater than single-card probability for same outs", () => {
    expect(runoutProbability(9)).toBeGreaterThan(nextCardProbability(9, "flop"));
  });

  it("formula: 1 - ((47-outs)/47) * ((46-outs)/46)", () => {
    const expected = 1 - (38 / 47) * (37 / 46);
    expect(runoutProbability(9)).toBeCloseTo(expected, 6);
  });
});

describe("enumeratedRunoutProbability", () => {
  it("enumeratedRunoutProbability is higher than next-card for flush draw hand", () => {
    const heroCards = [{ rank: "A" as const, suit: "h" as const }, { rank: "8" as const, suit: "h" as const }];
    const board = [{ rank: "K" as const, suit: "h" as const }, { rank: "7" as const, suit: "h" as const }, { rank: "2" as const, suit: "c" as const }];
    const prob = enumeratedRunoutProbability(heroCards, board);
    expect(prob).toBeGreaterThan(0.30);
    // Note: total improvement probability is higher than ~34% because pairing outs also count
  });

  it("is greater than next-card probability for the same flush draw", () => {
    const heroCards = [{ rank: "A" as const, suit: "h" as const }, { rank: "8" as const, suit: "h" as const }];
    const board = [{ rank: "K" as const, suit: "h" as const }, { rank: "7" as const, suit: "h" as const }, { rank: "2" as const, suit: "c" as const }];
    expect(enumeratedRunoutProbability(heroCards, board)).toBeGreaterThan(nextCardProbability(9, "flop"));
  });

  it("returns 0 when board is not exactly 3 cards", () => {
    const heroCards = [{ rank: "A" as const, suit: "h" as const }, { rank: "8" as const, suit: "h" as const }];
    expect(enumeratedRunoutProbability(heroCards, [])).toBe(0);
  });
});
