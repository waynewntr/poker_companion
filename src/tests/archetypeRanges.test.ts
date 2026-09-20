import { describe, it, expect } from "vitest";
import { getVillainCombos, ARCHETYPE_LABELS } from "@/data/archetypeRanges";

describe("getVillainCombos", () => {
  it("returns 0 combos for BB (no RFI range)", () => {
    expect(getVillainCombos("gto_oriented_reg", "BB", [])).toHaveLength(0);
  });

  it("pair hand expands to 6 combos (AA)", () => {
    // AA is in every archetype's UTG range
    const combos = getVillainCombos("nit", "UTG", []);
    const aaCombos = combos.filter(
      ([a, b]) => a.rank === "A" && b.rank === "A"
    );
    expect(aaCombos).toHaveLength(6);
  });

  it("suited hand expands to 4 combos (AKs)", () => {
    const combos = getVillainCombos("nit", "UTG", []);
    const aksCombos = combos.filter(
      ([a, b]) => a.rank === "A" && b.rank === "K" && a.suit === b.suit
    );
    expect(aksCombos).toHaveLength(4);
  });

  it("offsuit hand expands to 12 combos (AKo)", () => {
    const combos = getVillainCombos("nit", "UTG", []);
    const akoCombos = combos.filter(
      ([a, b]) => a.rank === "A" && b.rank === "K" && a.suit !== b.suit
    );
    expect(akoCombos).toHaveLength(12);
  });

  it("blocks combos containing hero cards", () => {
    const blocked = [{ rank: "A" as const, suit: "s" as const }];
    const combos = getVillainCombos("nit", "UTG", blocked);
    const hasBlockedCard = combos.some(([a, b]) =>
      (a.rank === "A" && a.suit === "s") || (b.rank === "A" && b.suit === "s")
    );
    expect(hasBlockedCard).toBe(false);
  });

  it("blocks combos containing board cards", () => {
    const blocked = [
      { rank: "A" as const, suit: "s" as const },
      { rank: "K" as const, suit: "h" as const },
    ];
    const combos = getVillainCombos("nit", "UTG", blocked);
    const hasBlockedCombo = combos.some(([a, b]) => {
      const cards = [a, b];
      return cards.some(c =>
        (c.rank === "A" && c.suit === "s") ||
        (c.rank === "K" && c.suit === "h")
      );
    });
    expect(hasBlockedCombo).toBe(false);
  });

  it("ARCHETYPE_LABELS has correct display name for gto_oriented_reg", () => {
    expect(ARCHETYPE_LABELS["gto_oriented_reg"]).toBe("Modern Balanced Reg");
  });

  it("calling_station uses voluntary_entry_prior (wider range) at BTN", () => {
    const raiseRange = getVillainCombos("calling_station", "BTN", []);
    // calling_station raise_first_in BTN is ~198 combos (after expansion)
    // voluntary_entry_prior BTN is ~642 combos (wider)
    // We use voluntary_entry_prior so count should be >> 198
    expect(raiseRange.length).toBeGreaterThan(500);
  });
});
