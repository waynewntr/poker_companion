import { describe, expect, it } from "vitest";
import { detectDrawsPLO } from "@/poker/plo/draws";

describe("detectDrawsPLO", () => {
  it("detects flush draw when hero has 2 of suit and board has 2 of same suit", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }],
      [{ rank: "Q", suit: "h" }, { rank: "9", suit: "h" }, { rank: "2", suit: "c" }]
    );

    expect(result.draws.some((draw) => draw.toLowerCase().includes("flush"))).toBe(true);
  });

  it("detects straight draw only when hero contributes exactly 2 of the 4 connected ranks", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "d" }, { rank: "Q", suit: "s" }, { rank: "J", suit: "c" }],
      [{ rank: "T", suit: "h" }, { rank: "9", suit: "d" }, { rank: "2", suit: "c" }]
    );

    expect(result.draws.some((draw) => draw.toLowerCase().includes("straight"))).toBe(true);
  });

  it("does not detect straight draw when hero contributes only 1 of the 4 connected ranks", () => {
    const result = detectDrawsPLO(
      [{ rank: "T", suit: "h" }, { rank: "7", suit: "d" }, { rank: "3", suit: "s" }, { rank: "2", suit: "c" }],
      [{ rank: "K", suit: "h" }, { rank: "Q", suit: "d" }, { rank: "J", suit: "c" }]
    );

    expect(result.draws.some((draw) => draw.toLowerCase().includes("straight"))).toBe(false);
  });

  it("does not detect flush draw when hero has only 1 card of the flush suit", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "s" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }],
      [{ rank: "Q", suit: "h" }, { rank: "9", suit: "h" }, { rank: "2", suit: "c" }]
    );

    expect(result.draws.every((draw) => !draw.toLowerCase().includes("flush"))).toBe(true);
  });

  it("does not detect flush draw when board has 3 of the suit", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }],
      [{ rank: "Q", suit: "h" }, { rank: "9", suit: "h" }, { rank: "2", suit: "h" }]
    );

    expect(result.draws.some((draw) => draw.toLowerCase().includes("flush"))).toBe(false);
  });

  it("reports hasMadeHand when the best PLO hand is pair or better", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }, { rank: "K", suit: "d" }, { rank: "Q", suit: "c" }],
      [{ rank: "2", suit: "d" }, { rank: "7", suit: "c" }, { rank: "J", suit: "s" }]
    );

    expect(result.hasMadeHand).toBe(true);
  });

  it("reports no made hand for a high-card PLO holding", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "d" }, { rank: "7", suit: "c" }, { rank: "3", suit: "h" }],
      [{ rank: "J", suit: "d" }, { rank: "9", suit: "c" }, { rank: "2", suit: "h" }]
    );

    expect(result.hasMadeHand).toBe(false);
  });

  it("returns empty draws before the flop", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "Q", suit: "s" }, { rank: "J", suit: "s" }],
      []
    );

    expect(result.draws).toHaveLength(0);
    expect(result.hasMadeHand).toBe(false);
  });

  it("returns empty draws on the river", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "Q", suit: "s" }, { rank: "J", suit: "s" }],
      [
        { rank: "T", suit: "h" }, { rank: "9", suit: "h" }, { rank: "8", suit: "c" },
        { rank: "3", suit: "d" }, { rank: "2", suit: "s" }
      ]
    );

    expect(result.draws).toHaveLength(0);
  });
});