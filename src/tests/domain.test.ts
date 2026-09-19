import { describe, it, expect } from "vitest";
import { createDeck, removeCards, hasNoDuplicates, combinations } from "@/domain/deck";
import { cardKey, cardLabel } from "@/domain/cards";

describe("deck", () => {
  it("creates 52 unique cards", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(hasNoDuplicates(deck)).toBe(true);
  });

  it("removes specified cards", () => {
    const deck = createDeck();
    const remaining = removeCards(deck, [
      { rank: "A", suit: "s" },
      { rank: "K", suit: "h" },
    ]);
    expect(remaining).toHaveLength(50);
    expect(remaining.find(c => c.rank === "A" && c.suit === "s")).toBeUndefined();
  });

  it("detects duplicate cards", () => {
    expect(hasNoDuplicates([
      { rank: "A", suit: "s" },
      { rank: "A", suit: "s" },
    ])).toBe(false);
  });

  it("allows same rank different suit", () => {
    expect(hasNoDuplicates([
      { rank: "A", suit: "s" },
      { rank: "A", suit: "h" },
    ])).toBe(true);
  });

  it("generates C(5,2) = 10 combinations", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(combinations(arr, 2)).toHaveLength(10);
  });

  it("generates C(7,5) = 21 combinations", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7];
    expect(combinations(arr, 5)).toHaveLength(21);
  });
});

describe("card helpers", () => {
  it("cardKey produces unique keys", () => {
    expect(cardKey({ rank: "A", suit: "s" })).toBe("As");
  });

  it("cardLabel uses suit symbols", () => {
    expect(cardLabel({ rank: "A", suit: "s" })).toBe("A♠");
    expect(cardLabel({ rank: "K", suit: "h" })).toBe("K♥");
  });
});
