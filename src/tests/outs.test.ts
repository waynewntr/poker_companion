import { describe, it, expect } from "vitest";
import { calculateOuts } from "@/poker/outs";

describe("calculateOuts", () => {
  it("returns 9 outs for a flush draw (A♥ 8♥ | K♥ 7♥ 2♣)", () => {
    const result = calculateOuts(
      [{ rank: "A", suit: "h" }, { rank: "8", suit: "h" }],
      [{ rank: "K", suit: "h" }, { rank: "7", suit: "h" }, { rank: "2", suit: "c" }]
    );
    // Flush outs: all 9 remaining hearts are outs
    const heartOuts = result.outs.filter(c => c.suit === "h");
    expect(heartOuts).toHaveLength(9);
    // Total outs includes pairing improvements too
    expect(result.count).toBeGreaterThanOrEqual(9);
  });

  it("does not double-count a card that completes both straight and flush", () => {
    // A♠ 2♠ | 3♠ 4♠ 6♣ — 5♠ completes flush (5th spade) AND wheel straight
    const result = calculateOuts(
      [{ rank: "A", suit: "s" }, { rank: "2", suit: "s" }],
      [{ rank: "3", suit: "s" }, { rank: "4", suit: "s" }, { rank: "6", suit: "c" }]
    );
    const fiveSpade = result.outs.filter(c => c.rank === "5" && c.suit === "s");
    expect(fiveSpade).toHaveLength(1);
  });

  it("returns 0 outs when board has fewer than 3 cards", () => {
    const result = calculateOuts(
      [{ rank: "A", suit: "h" }, { rank: "8", suit: "h" }],
      []
    );
    expect(result.count).toBe(0);
    expect(result.outs).toHaveLength(0);
  });

  it("spec §11: duplicate card (A♠ in hero and board) is not counted as an out", () => {
    const heroCards = [
      { rank: "A" as const, suit: "s" as const },
      { rank: "K" as const, suit: "h" as const },
    ];
    const board = [
      { rank: "A" as const, suit: "s" as const },
      { rank: "9" as const, suit: "c" as const },
      { rank: "2" as const, suit: "d" as const },
    ];

    const result = calculateOuts(heroCards, board);

    expect(result.outs.every(c => !(c.rank === "A" && c.suit === "s"))).toBe(true);
    expect(result.outs).toHaveLength(0);
    expect(result.count).toBe(0);
  });

  it("returns 0 outs on the river (board.length === 5)", () => {
    const result = calculateOuts(
      [{ rank: "A", suit: "h" }, { rank: "8", suit: "h" }],
      [
        { rank: "K", suit: "h" },
        { rank: "7", suit: "h" },
        { rank: "2", suit: "c" },
        { rank: "3", suit: "d" },
        { rank: "J", suit: "s" },
      ]
    );

    expect(result.count).toBe(0);
    expect(result.outs).toHaveLength(0);
  });

  it("counts overcard outs (A♠ K♠ | 9♦ 7♣ 2♥)", () => {
    const result = calculateOuts(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }],
      [{ rank: "9", suit: "d" }, { rank: "7", suit: "c" }, { rank: "2", suit: "h" }]
    );
    // 3 remaining Aces + 3 remaining Kings = 6 minimum overcard outs
    expect(result.count).toBeGreaterThanOrEqual(6);
  });

  it("each out card appears exactly once in the outs array", () => {
    const result = calculateOuts(
      [{ rank: "A", suit: "h" }, { rank: "8", suit: "h" }],
      [{ rank: "K", suit: "h" }, { rank: "7", suit: "h" }, { rank: "2", suit: "c" }]
    );
    const keys = result.outs.map(c => `${c.rank}${c.suit}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
