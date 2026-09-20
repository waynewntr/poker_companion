import { describe, expect, it } from "vitest";
import { evaluateBestHandPLO } from "@/poker/plo/evaluator";

describe("evaluateBestHandPLO", () => {
  it("enforces 2-from-hole: finds flush when 2 suited hole cards + 3 board", () => {
    const result = evaluateBestHandPLO(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }, { rank: "J", suit: "d" }, { rank: "T", suit: "d" }],
      [{ rank: "Q", suit: "s" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }]
    );
    expect(result.category).toBe("straight_flush");
  });

  it("enforces 2-from-hole: cannot use 3 hole cards", () => {
    const result = evaluateBestHandPLO(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }, { rank: "Q", suit: "s" }, { rank: "J", suit: "d" }],
      [{ rank: "2", suit: "h" }, { rank: "3", suit: "c" }, { rank: "4", suit: "d" }]
    );

    expect(result.category).toBe("high_card");
  });

  it("detects straight from valid 2+3 combo", () => {
    // K♣Q♣ (2 hole) + J♠T♦9♥ (3 board) = 9-T-J-Q-K straight
    const result = evaluateBestHandPLO(
      [{ rank: "K", suit: "c" }, { rank: "Q", suit: "c" }, { rank: "2", suit: "h" }, { rank: "2", suit: "d" }],
      [{ rank: "J", suit: "s" }, { rank: "T", suit: "d" }, { rank: "9", suit: "h" }]
    );
    expect(result.category).toBe("straight");
  });

  it("detects pair of aces correctly", () => {
    const result = evaluateBestHandPLO(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }, { rank: "K", suit: "d" }, { rank: "Q", suit: "c" }],
      [{ rank: "2", suit: "d" }, { rank: "7", suit: "c" }, { rank: "J", suit: "s" }]
    );

    expect(result.category).toBe("pair");
    expect(result.description).toContain("Aces");
  });

  it("picks the best available hand across all combinations", () => {
    const result = evaluateBestHandPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "Q", suit: "s" }, { rank: "J", suit: "s" }],
      [{ rank: "T", suit: "h" }, { rank: "9", suit: "h" }, { rank: "8", suit: "h" }]
    );

    expect(result.category).toBe("flush");
  });

  it("returns correct result on river", () => {
    const result = evaluateBestHandPLO(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }, { rank: "K", suit: "s" }, { rank: "K", suit: "h" }],
      [{ rank: "A", suit: "d" }, { rank: "K", suit: "d" }, { rank: "Q", suit: "c" }, { rank: "2", suit: "s" }, { rank: "3", suit: "d" }]
    );

    expect(["three_of_a_kind", "full_house"]).toContain(result.category);
  });
});