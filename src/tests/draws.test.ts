import { describe, it, expect } from "vitest";
import { detectDraws } from "@/poker/draws";

describe("detectDraws", () => {
  it("detects nut flush draw (hero has Ace of suit)", () => {
    const result = detectDraws(
      [{ rank: "A", suit: "h" }, { rank: "8", suit: "h" }],
      [{ rank: "K", suit: "h" }, { rank: "7", suit: "h" }, { rank: "2", suit: "c" }]
    );
    expect(result.draws).toContain("Nut flush draw");
  });

  it("detects non-nut flush draw", () => {
    const result = detectDraws(
      [{ rank: "9", suit: "h" }, { rank: "8", suit: "h" }],
      [{ rank: "K", suit: "h" }, { rank: "7", suit: "h" }, { rank: "2", suit: "c" }]
    );
    expect(result.draws).toContain("Flush draw");
    expect(result.draws).not.toContain("Nut flush draw");
  });

  it("detects open-ended straight draw", () => {
    const result = detectDraws(
      [{ rank: "9", suit: "s" }, { rank: "T", suit: "s" }],
      [{ rank: "8", suit: "d" }, { rank: "7", suit: "c" }, { rank: "2", suit: "h" }]
    );
    expect(result.draws).toContain("Open-ended straight draw");
  });

  it("detects gutshot straight draw", () => {
    const result = detectDraws(
      [{ rank: "9", suit: "s" }, { rank: "J", suit: "s" }],
      [{ rank: "8", suit: "d" }, { rank: "7", suit: "c" }, { rank: "2", suit: "h" }]
    );
    expect(result.draws).toContain("Gutshot straight draw");
  });

  it("hasMadeHand is true for pair or better", () => {
    const result = detectDraws(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }],
      [{ rank: "A", suit: "h" }, { rank: "8", suit: "c" }, { rank: "4", suit: "d" }]
    );
    expect(result.hasMadeHand).toBe(true);
  });

  it("hasMadeHand is false for pure draw hands", () => {
    const result = detectDraws(
      [{ rank: "A", suit: "h" }, { rank: "8", suit: "h" }],
      [{ rank: "K", suit: "h" }, { rank: "7", suit: "h" }, { rank: "2", suit: "c" }]
    );
    expect(result.hasMadeHand).toBe(false);
  });

  it("returns no draws before the flop", () => {
    const result = detectDraws(
      [{ rank: "A", suit: "h" }, { rank: "8", suit: "h" }],
      []
    );
    expect(result.draws).toHaveLength(0);
    expect(result.hasMadeHand).toBe(false);
  });
});
