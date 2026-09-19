import { describe, it, expect } from "vitest";
import { calculateDecision } from "@/poker/decisionEngine";
import type { DrawAnalysis } from "@/poker/draws";
import type { OutsResult } from "@/poker/outs";
import type { PokerHand } from "@/domain/hand";

const baseHand: PokerHand = {
  gameMode: "cash",
  heroCards: [],
  board: [],
  street: "flop",
  pot: 1000,
  amountToCall: 200,
  isAllIn: false,
};

// 9 outs flush draw on flop: 9/47 = 19.1%, required = 16.7%, margin = +2.4% → CALL
const flushDrawHand: PokerHand = {
  ...baseHand,
  heroCards: [{ rank: "A", suit: "h" }, { rank: "8", suit: "h" }],
  board: [{ rank: "K", suit: "h" }, { rank: "7", suit: "h" }, { rank: "2", suit: "c" }],
};
const flushDrawAnalysis: DrawAnalysis = { draws: ["Nut flush draw"], hasMadeHand: false };
const nineOuts: OutsResult = {
  outs: Array(9).fill({ rank: "2", suit: "s" }),
  count: 9,
  labels: [],
};

describe("calculateDecision", () => {
  it("returns CALL when draw probability exceeds required equity by ≥ 2pp", () => {
    const r = calculateDecision(flushDrawHand, flushDrawAnalysis, nineOuts);
    expect(r.signal).toBe("CALL");
    expect(r.margin).toBeGreaterThan(0.02);
  });

  it("returns FOLD when draw probability is below required equity by ≥ 2pp", () => {
    // 2 outs / 47 = 4.3% vs required 16.7% → -12.4%
    const twoOuts: OutsResult = { outs: Array(2).fill({ rank: "2", suit: "s" }), count: 2, labels: [] };
    const r = calculateDecision(baseHand, { draws: [], hasMadeHand: false }, twoOuts);
    expect(r.signal).toBe("FOLD");
    expect(r.margin).toBeLessThan(-0.02);
  });

  it("returns RANGE_REQUIRED for made hand with < 3 outs", () => {
    const twoOuts: OutsResult = { outs: Array(2).fill({ rank: "2", suit: "s" }), count: 2, labels: [] };
    const r = calculateDecision(baseHand, { draws: [], hasMadeHand: true }, twoOuts);
    expect(r.signal).toBe("RANGE_REQUIRED");
  });

  it("returns CLOSE when margin is within ±2pp", () => {
    // 8 outs / 47 = 17.0% vs required 16.7% → margin +0.3%
    const eightOuts: OutsResult = { outs: Array(8).fill({ rank: "2", suit: "s" }), count: 8, labels: [] };
    const r = calculateDecision(baseHand, { draws: ["OESD"], hasMadeHand: false }, eightOuts);
    expect(r.signal).toBe("CLOSE");
    expect(Math.abs(r.margin!)).toBeLessThan(0.02);
  });

  it("uses enumeratedRunoutProbability for all-in on flop", () => {
    const allInHand: PokerHand = { ...flushDrawHand, isAllIn: true };
    const r = calculateDecision(allInHand, flushDrawAnalysis, nineOuts);
    // Runout probability for 9-out flush draw is ~34% > 19% next-card
    expect(r.comparisonProbability).toBeGreaterThan(0.25);
    expect(r.signal).toBe("CALL");
  });

  it("returns CALL with zero call amount (free check)", () => {
    const freeCheck: PokerHand = { ...baseHand, amountToCall: 0 };
    const r = calculateDecision(freeCheck, { draws: [], hasMadeHand: false }, { outs: [], count: 0, labels: [] });
    expect(r.signal).toBe("CALL");
    expect(r.requiredEquity).toBe(0);
  });

  it("includes implied odds in result", () => {
    const r = calculateDecision(flushDrawHand, flushDrawAnalysis, nineOuts);
    expect(r.impliedOdds).toBeDefined();
    expect(r.impliedOdds!.futureWinningsRequired).toBeGreaterThanOrEqual(0);
  });

  it("always includes reason string", () => {
    const r = calculateDecision(flushDrawHand, flushDrawAnalysis, nineOuts);
    expect(typeof r.reason).toBe("string");
    expect(r.reason.length).toBeGreaterThan(0);
  });
});
