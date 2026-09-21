import { describe, expect, it } from "vitest";
import { calculateOutsPLO } from "@/poker/plo/outs";

describe("calculateOutsPLO", () => {
  it("returns 0 outs when board < 3 cards", () => {
    const result = calculateOutsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "Q", suit: "s" }, { rank: "J", suit: "s" }],
      []
    );

    expect(result.count).toBe(0);
  });

  it("returns 0 outs on river (board.length === 5)", () => {
    const result = calculateOutsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "Q", suit: "s" }, { rank: "J", suit: "s" }],
      [
        { rank: "T", suit: "h" }, { rank: "9", suit: "h" }, { rank: "8", suit: "c" },
        { rank: "3", suit: "d" }, { rank: "2", suit: "s" }
      ]
    );

    expect(result.count).toBe(0);
  });

  it("draws contain flush outs for flush draw hand", () => {
    const result = calculateOutsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }],
      [{ rank: "Q", suit: "h" }, { rank: "9", suit: "h" }, { rank: "2", suit: "c" }]
    );

    const heartDrawOuts = result.drawOuts.filter((card) => card.suit === "h");
    expect(heartDrawOuts.length).toBeGreaterThan(0);
  });
});
