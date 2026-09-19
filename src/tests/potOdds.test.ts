import { describe, it, expect } from "vitest";
import { calculatePotOdds } from "@/poker/potOdds";

describe("calculatePotOdds", () => {
  it("calculates ratio 5:1 and required equity 16.67%", () => {
    const r = calculatePotOdds(1000, 200);
    expect(r.ratio).toBe(5);
    expect(r.requiredEquity).toBeCloseTo(0.16667, 4);
  });

  it("equal pot and call gives 1:1 and 50% equity", () => {
    const r = calculatePotOdds(200, 200);
    expect(r.ratio).toBe(1);
    expect(r.requiredEquity).toBe(0.5);
  });

  it("handles zero call (free check)", () => {
    const r = calculatePotOdds(500, 0);
    expect(r.requiredEquity).toBe(0);
  });

  it("required equity formula is call / (pot + call)", () => {
    const r = calculatePotOdds(800, 400);
    expect(r.requiredEquity).toBeCloseTo(400 / 1200, 10);
  });
});
