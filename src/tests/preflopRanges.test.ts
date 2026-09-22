import { describe, it, expect } from "vitest";
import { getPreflopAdvice } from "@/data/preflopRanges";

describe("getPreflopAdvice", () => {
  // LIMP scenarios
  it("1. BTN vs limper returns ISO Raise with AA and empty mixRange", () => {
    const result = getPreflopAdvice("LIMP", "BTN", undefined, undefined);
    expect(result).not.toBeNull();
    expect(result!.suggestedAction).toBe("ISO Raise");
    expect(result!.valueRange).toContain("AA");
    expect(result!.mixRange).toEqual([]);
  });

  it("2. SB vs limper returns OOP sizing", () => {
    const result = getPreflopAdvice("LIMP", "SB", undefined, undefined);
    expect(result).not.toBeNull();
    expect(result!.sizing).toContain("OOP");
  });

  it("3. undefined heroPosition vs limper returns null", () => {
    expect(getPreflopAdvice("LIMP", undefined, undefined, undefined)).toBeNull();
  });

  it("4. UTG hero vs limper returns null (no UTG limper range)", () => {
    expect(getPreflopAdvice("LIMP", "UTG", undefined, undefined)).toBeNull();
  });

  it("5. CO hero vs limper with nit archetype includes Tighten note", () => {
    const result = getPreflopAdvice("LIMP", "CO", undefined, "nit");
    expect(result).not.toBeNull();
    expect(result!.adjustmentNote).toContain("Tighten");
  });

  // OPEN_RAISE scenarios
  it("6. BTN hero vs CO opener returns 3-Bet advice with AA and 88", () => {
    const result = getPreflopAdvice("OPEN_RAISE", "BTN", "CO", undefined);
    expect(result).not.toBeNull();
    expect(result!.suggestedAction).toContain("3-Bet");
    expect(result!.valueRange).toContain("AA");
    expect(result!.mixRange).toContain("88");
  });

  it("7. BB hero vs UTG opener returns non-null with correct three_bet range", () => {
    const result = getPreflopAdvice("OPEN_RAISE", "BB", "UTG", undefined);
    expect(result).not.toBeNull();
    expect(result!.valueRange).toContain("QQ");
    expect(result!.valueRange).toContain("AKs");
  });

  it("8. undefined heroPosition vs OPEN_RAISE returns null", () => {
    expect(getPreflopAdvice("OPEN_RAISE", undefined, "BTN", undefined)).toBeNull();
  });

  it("9. UTG hero vs BTN opener returns null (matrix entry does not exist)", () => {
    expect(getPreflopAdvice("OPEN_RAISE", "UTG", "BTN", undefined)).toBeNull();
  });

  it("10. SB hero vs BTN opener with lag archetype includes Widen note", () => {
    const result = getPreflopAdvice("OPEN_RAISE", "SB", "BTN", "lag");
    expect(result).not.toBeNull();
    expect(result!.adjustmentNote).toContain("Widen");
  });

  // SQUEEZE scenario
  it("11. SQUEEZE returns fixed guidance with adjustmentNote always present", () => {
    const result = getPreflopAdvice("SQUEEZE", "BTN", "CO", undefined);
    expect(result).not.toBeNull();
    expect(result!.suggestedAction).toBe("Squeeze");
    expect(result!.valueRange).toEqual([]);
    expect(result!.adjustmentNote).toBeTruthy();
  });

  // Unsupported / null scenarios
  it("12. FOLD returns null", () => {
    expect(getPreflopAdvice("FOLD", "BTN", "CO", undefined)).toBeNull();
  });

  it("13. THREE_BET returns null", () => {
    expect(getPreflopAdvice("THREE_BET", "BTN", "CO", undefined)).toBeNull();
  });

  it("14. undefined villainAction returns null", () => {
    expect(getPreflopAdvice(undefined, "BTN", "CO", undefined)).toBeNull();
  });
});
