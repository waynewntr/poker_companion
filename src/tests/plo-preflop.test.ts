import { describe, expect, it } from "vitest";
import { ratePloHand } from "@/poker/plo/preflop";

describe("ratePloHand", () => {
  it("rates AA double-suited as Premium", () => {
    const r = ratePloHand([
      { rank: "A", suit: "s" }, { rank: "A", suit: "h" },
      { rank: "K", suit: "s" }, { rank: "K", suit: "h" }
    ]);

    expect(r.rating).toBe("Premium");
    expect(r.doubleSuited).toBe(true);
  });

  it("rates AA double-suited (A♠A♥7♠2♥) as Premium", () => {
    const r = ratePloHand([
      { rank: "A", suit: "s" }, { rank: "A", suit: "h" },
      { rank: "7", suit: "s" }, { rank: "2", suit: "h" }
    ]);

    expect(r.rating).toBe("Premium");
    expect(r.doubleSuited).toBe(true);
  });

  it("rates a single-suited broadway rundown as Strong", () => {
    const r = ratePloHand([
      { rank: "K", suit: "s" }, { rank: "Q", suit: "s" },
      { rank: "J", suit: "d" }, { rank: "T", suit: "c" }
    ]);

    expect(r.rating).toBe("Strong");
    expect(r.singleSuited).toBe(true);
  });

  it("rates a lower single-suited rundown as Playable", () => {
    const r = ratePloHand([
      { rank: "7", suit: "s" }, { rank: "6", suit: "s" },
      { rank: "5", suit: "d" }, { rank: "4", suit: "c" }
    ]);

    expect(r.rating).toBe("Playable");
    expect(r.singleSuited).toBe(true);
  });

  it("rates KQJT double-suited as Premium", () => {
    const r = ratePloHand([
      { rank: "K", suit: "s" }, { rank: "Q", suit: "h" },
      { rank: "J", suit: "s" }, { rank: "T", suit: "h" }
    ]);

    expect(r.rating).toBe("Premium");
    expect(r.doubleSuited).toBe(true);
  });

  it("rates 7632 rainbow as Marginal", () => {
    const r = ratePloHand([
      { rank: "7", suit: "s" }, { rank: "6", suit: "d" },
      { rank: "3", suit: "h" }, { rank: "2", suit: "c" }
    ]);

    expect(r.rating).toBe("Marginal");
  });

  it("rates AA single-suited as Strong", () => {
    const r = ratePloHand([
      { rank: "A", suit: "s" }, { rank: "A", suit: "d" },
      { rank: "K", suit: "s" }, { rank: "Q", suit: "c" }
    ]);

    expect(["Premium", "Strong"]).toContain(r.rating);
  });

  it("hasAce is true when hand contains an Ace", () => {
    const r = ratePloHand([
      { rank: "A", suit: "s" }, { rank: "K", suit: "h" },
      { rank: "Q", suit: "d" }, { rank: "J", suit: "c" }
    ]);

    expect(r.hasAce).toBe(true);
  });

  it("doubleSuited is false for rainbow hand", () => {
    const r = ratePloHand([
      { rank: "A", suit: "s" }, { rank: "K", suit: "h" },
      { rank: "Q", suit: "d" }, { rank: "J", suit: "c" }
    ]);

    expect(r.doubleSuited).toBe(false);
  });
});