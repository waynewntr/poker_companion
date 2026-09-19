import { describe, it, expect } from "vitest";
import { analyzeBoardTexture } from "@/strategy/boardTexture";

describe("analyzeBoardTexture", () => {
  it("classifies A♣ 7♦ 2♠ as STATIC / Rainbow / not paired", () => {
    const board = [
      { rank: "A" as const, suit: "c" as const },
      { rank: "7" as const, suit: "d" as const },
      { rank: "2" as const, suit: "s" as const },
    ];
    const r = analyzeBoardTexture(board);
    expect(r.dynamism).toBe("STATIC");
    expect(r.rainbow).toBe(true);
    expect(r.paired).toBe(false);
    expect(r.labels).toContain("Rainbow");
  });

  it("classifies 9♠ 8♠ 6♥ as VERY_DYNAMIC / Two-Tone", () => {
    const board = [
      { rank: "9" as const, suit: "s" as const },
      { rank: "8" as const, suit: "s" as const },
      { rank: "6" as const, suit: "h" as const },
    ];
    const r = analyzeBoardTexture(board);
    expect(r.dynamism).toBe("VERY_DYNAMIC");
    expect(r.twoTone).toBe(true);
    expect(r.connectedness).toBe("HIGH");
  });

  it("classifies A♠ A♥ 7♦ as paired", () => {
    const board = [
      { rank: "A" as const, suit: "s" as const },
      { rank: "A" as const, suit: "h" as const },
      { rank: "7" as const, suit: "d" as const },
    ];
    const r = analyzeBoardTexture(board);
    expect(r.paired).toBe(true);
    expect(r.labels).toContain("Paired");
  });

  it("classifies K♠ Q♠ J♠ as monotone", () => {
    const board = [
      { rank: "K" as const, suit: "s" as const },
      { rank: "Q" as const, suit: "s" as const },
      { rank: "J" as const, suit: "s" as const },
    ];
    const r = analyzeBoardTexture(board);
    expect(r.monotone).toBe(true);
    expect(r.flushPotential).toBe("HIGH");
    expect(r.labels).toContain("Monotone");
  });

  it("classifies K♠ 8♦ 3♥ as STATIC / Rainbow / LOW connectedness", () => {
    const board = [
      { rank: "K" as const, suit: "s" as const },
      { rank: "8" as const, suit: "d" as const },
      { rank: "3" as const, suit: "h" as const },
    ];
    const r = analyzeBoardTexture(board);
    expect(r.dynamism).toBe("STATIC");
    expect(r.connectedness).toBe("LOW");
  });

  it("classifies T♥ 9♥ 7♣ as VERY_DYNAMIC / Two-Tone / HIGH connectedness", () => {
    const board = [
      { rank: "T" as const, suit: "h" as const },
      { rank: "9" as const, suit: "h" as const },
      { rank: "7" as const, suit: "c" as const },
    ];
    const r = analyzeBoardTexture(board);
    expect(r.dynamism).toBe("VERY_DYNAMIC");
    expect(r.connectedness).toBe("HIGH");
  });

  it("returns neutral result for fewer than 3 cards", () => {
    const r = analyzeBoardTexture([]);
    expect(r.dynamism).toBe("STATIC");
    expect(r.labels).toHaveLength(0);
  });

  it("dynamism STATIC has label 'Dry'", () => {
    const board = [
      { rank: "A" as const, suit: "c" as const },
      { rank: "7" as const, suit: "d" as const },
      { rank: "2" as const, suit: "s" as const },
    ];
    const r = analyzeBoardTexture(board);
    expect(r.labels).toContain("Dry");
  });
});
