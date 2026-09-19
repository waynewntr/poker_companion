import { describe, it, expect } from "vitest";
import { evaluateBestHand } from "@/poker/evaluator";

describe("evaluateBestHand", () => {
  it("detects high card", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "8", suit: "h" }],
      [{ rank: "K", suit: "d" }, { rank: "7", suit: "c" }, { rank: "4", suit: "h" }]
    );
    expect(r.category).toBe("high_card");
  });

  it("detects pair", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      [{ rank: "K", suit: "d" }, { rank: "7", suit: "c" }, { rank: "4", suit: "h" }]
    );
    expect(r.category).toBe("pair");
    expect(r.description).toContain("Aces");
  });

  it("detects two pair", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }],
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "d" }, { rank: "7", suit: "c" }]
    );
    expect(r.category).toBe("two_pair");
  });

  it("detects three of a kind", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      [{ rank: "A", suit: "d" }, { rank: "7", suit: "c" }, { rank: "4", suit: "h" }]
    );
    expect(r.category).toBe("three_of_a_kind");
  });

  it("detects straight", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "2", suit: "h" }],
      [{ rank: "3", suit: "d" }, { rank: "4", suit: "c" }, { rank: "5", suit: "h" }]
    );
    expect(r.category).toBe("straight");
  });

  it("detects wheel straight (A-2-3-4-5)", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "2", suit: "h" }],
      [{ rank: "3", suit: "d" }, { rank: "4", suit: "c" }, { rank: "5", suit: "h" },
       { rank: "K", suit: "s" }, { rank: "Q", suit: "d" }]
    );
    expect(r.category).toBe("straight");
  });

  it("detects flush", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "8", suit: "s" }],
      [{ rank: "K", suit: "s" }, { rank: "7", suit: "s" }, { rank: "2", suit: "s" }]
    );
    expect(r.category).toBe("flush");
  });

  it("detects full house", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      [{ rank: "A", suit: "d" }, { rank: "K", suit: "c" }, { rank: "K", suit: "h" }]
    );
    expect(r.category).toBe("full_house");
  });

  it("detects four of a kind", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      [{ rank: "A", suit: "d" }, { rank: "A", suit: "c" }, { rank: "K", suit: "h" }]
    );
    expect(r.category).toBe("four_of_a_kind");
  });

  it("detects straight flush / royal flush", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }],
      [{ rank: "Q", suit: "s" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }]
    );
    expect(r.category).toBe("straight_flush");
    expect(r.description).toBe("Royal Flush");
  });

  it("picks the best 5-card hand from 7 cards", () => {
    // Two pair possible: AA + KK, but also trips + pair with the board
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      [{ rank: "A", suit: "d" }, { rank: "K", suit: "c" }, { rank: "K", suit: "h" },
       { rank: "2", suit: "s" }, { rank: "3", suit: "d" }]
    );
    expect(r.category).toBe("full_house");
  });

  it("flush beats straight in rankValue", () => {
    const flush = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "8", suit: "s" }],
      [{ rank: "K", suit: "s" }, { rank: "7", suit: "s" }, { rank: "2", suit: "s" }]
    );
    const straight = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "2", suit: "h" }],
      [{ rank: "3", suit: "d" }, { rank: "4", suit: "c" }, { rank: "5", suit: "h" }]
    );
    expect(flush.rankValue).toBeGreaterThan(straight.rankValue);
  });

  it("handles preflop (< 5 cards) by detecting a pocket pair", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      []
    );
    expect(r.category).toBe("pair");
  });
});
