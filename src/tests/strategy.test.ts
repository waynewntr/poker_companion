import { describe, it, expect } from "vitest";
import { analyzeBoardTexture } from "@/strategy/boardTexture";
import { estimateRangeAdvantage } from "@/strategy/rangeAdvantage";
import { estimateNutAdvantage } from "@/strategy/nutAdvantage";
import { getFlopStrategy } from "@/strategy/flopStrategy";
import { suggestBetSizes } from "@/strategy/betSizing";
import type { PreFlopContext } from "@/domain/hand";

const btnVsBb: PreFlopContext = {
  heroPosition: "BTN",
  villainPosition: "BB",
  preflopAggressor: "hero",
  potType: "srp",
  numPlayers: 2,
};

const unknownContext: PreFlopContext = { numPlayers: 2 };

describe("estimateRangeAdvantage", () => {
  it("BTN vs BB on dry board → HERO", () => {
    const board = analyzeBoardTexture([
      { rank: "A", suit: "c" }, { rank: "7", suit: "d" }, { rank: "2", suit: "s" }
    ]);
    expect(estimateRangeAdvantage(btnVsBb, board)).toBe("HERO");
  });

  it("BTN vs BB on very dynamic board → NEUTRAL or VILLAIN", () => {
    const board = analyzeBoardTexture([
      { rank: "9", suit: "s" }, { rank: "8", suit: "s" }, { rank: "6", suit: "h" }
    ]);
    const result = estimateRangeAdvantage(btnVsBb, board);
    expect(["NEUTRAL", "VILLAIN"]).toContain(result);
  });

  it("unknown position context → NEUTRAL", () => {
    const board = analyzeBoardTexture([
      { rank: "A", suit: "c" }, { rank: "7", suit: "d" }, { rank: "2", suit: "s" }
    ]);
    expect(estimateRangeAdvantage(unknownContext, board)).toBe("NEUTRAL");
  });
});

describe("estimateNutAdvantage", () => {
  it("BTN vs BB with Ace on dry board → HERO nut advantage", () => {
    const board = analyzeBoardTexture([
      { rank: "A", suit: "c" }, { rank: "7", suit: "d" }, { rank: "2", suit: "s" }
    ]);
    expect(estimateNutAdvantage(btnVsBb, board)).toBe("HERO");
  });

  it("unknown context → NEUTRAL", () => {
    const board = analyzeBoardTexture([
      { rank: "A", suit: "c" }, { rank: "7", suit: "d" }, { rank: "2", suit: "s" }
    ]);
    expect(estimateNutAdvantage(unknownContext, board)).toBe("NEUTRAL");
  });
});

describe("getFlopStrategy", () => {
  it("dry board, BTN vs BB → SMALL_FREQUENT strategy", () => {
    const board = analyzeBoardTexture([
      { rank: "A", suit: "c" }, { rank: "7", suit: "d" }, { rank: "2", suit: "s" }
    ]);
    const r = getFlopStrategy(btnVsBb, board, 5);
    expect(r.style).toBe("SMALL_FREQUENT");
    expect(r.suggestedBetSizes[0]).toBeLessThanOrEqual(0.33);
    expect(r.confidence).toBe("HIGH");
  });

  it("very dynamic board → CHECK_MORE strategy", () => {
    const board = analyzeBoardTexture([
      { rank: "9", suit: "s" }, { rank: "8", suit: "s" }, { rank: "6", suit: "h" }
    ]);
    const r = getFlopStrategy(btnVsBb, board, 5);
    expect(r.style).toBe("CHECK_MORE");
    expect(r.suggestedBetSizes[0]).toBeGreaterThanOrEqual(0.5);
  });

  it("multiway pot → INSUFFICIENT_CONTEXT with LOW confidence", () => {
    const multiway: PreFlopContext = { ...btnVsBb, numPlayers: 3 };
    const board = analyzeBoardTexture([
      { rank: "A", suit: "c" }, { rank: "7", suit: "d" }, { rank: "2", suit: "s" }
    ]);
    const r = getFlopStrategy(multiway, board, 5);
    expect(r.style).toBe("INSUFFICIENT_CONTEXT");
    expect(r.confidence).toBe("LOW");
  });

  it("unknown position → LOW confidence", () => {
    const board = analyzeBoardTexture([
      { rank: "A", suit: "c" }, { rank: "7", suit: "d" }, { rank: "2", suit: "s" }
    ]);
    const r = getFlopStrategy(unknownContext, board, 5);
    expect(r.confidence).toBe("LOW");
  });

  it("result always has explanation string", () => {
    const board = analyzeBoardTexture([
      { rank: "A", suit: "c" }, { rank: "7", suit: "d" }, { rank: "2", suit: "s" }
    ]);
    const r = getFlopStrategy(btnVsBb, board, 5);
    expect(typeof r.explanation).toBe("string");
    expect(r.explanation.length).toBeGreaterThan(0);
  });
});

describe("suggestBetSizes", () => {
  it("converts pot fractions to R amounts rounded to nearest 5", () => {
    const sizes = suggestBetSizes(1000, [0.33, 0.5]);
    expect(sizes[0]).toBe(330);
    expect(sizes[1]).toBe(500);
  });

  it("rounds to nearest 5 for live-game chip values", () => {
    const sizes = suggestBetSizes(1240, [0.667]);
    // 1240 * 0.667 = 827.08 → nearest 5 = 825
    expect(sizes[0]).toBe(825);
  });
});