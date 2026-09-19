# Poker Companion — Phase 2: Strategy Module

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement deterministic board texture analysis and the GTO-baseline strategy engine as pure, fully-tested TypeScript functions.

**Architecture:** Two modules — `src/strategy/` for board classification and strategy output, `src/tests/` for tests. No UI dependencies. Requires Phase 1 to be complete (domain types and poker engine must exist).

**Tech Stack:** Next.js 15, TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-09-19-poker-companion-design.md` (sections 5, 6, 12, 13)

## Global Constraints

- All strategy functions are pure (no side effects)
- Strategy output is labelled "Modern baseline" — never "GTO"
- Multiway pots (`numPlayers > 2`) always return `LOW` confidence
- Missing position/aggressor context always returns `NEUTRAL` advantage and `LOW` confidence
- Board texture requires at minimum 3 cards (`board.length >= 3`) — return a minimal neutral result for fewer
- Suggested bet sizes are pot fractions in the range `[0, 2]` (e.g., `0.33` = 33% pot)
- Test runner: `npx vitest run` from the repo root

---

### Task 6: Board texture analysis

**Files:**
- Create: `src/strategy/boardTexture.ts`
- Create: `src/tests/boardTexture.test.ts`

**Interfaces:**
- Consumes: `Card`, `RANK_VALUES`, `Suit` from `@/domain/cards`
- Produces:
  - `BoardAnalysis { paired, monotone, twoTone, rainbow, connectedness, straightPotential, flushPotential, dynamism, labels }`
  - `analyzeBoardTexture(board: Card[]): BoardAnalysis`

**Steps:**

- [ ] **Step 1: Write the failing board texture test**

Create `src/tests/boardTexture.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/tests/boardTexture.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create src/strategy/boardTexture.ts**

```ts
import { Card, RANK_VALUES, Suit } from "../domain/cards";

export interface BoardAnalysis {
  paired: boolean;
  monotone: boolean;
  twoTone: boolean;
  rainbow: boolean;
  connectedness: "LOW" | "MEDIUM" | "HIGH";
  straightPotential: "LOW" | "MEDIUM" | "HIGH";
  flushPotential: "LOW" | "MEDIUM" | "HIGH";
  dynamism: "STATIC" | "SEMI_DYNAMIC" | "DYNAMIC" | "VERY_DYNAMIC";
  labels: string[];
}

function suitCounts(cards: Card[]): Record<Suit, number> {
  const counts: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
  for (const c of cards) counts[c.suit]++;
  return counts;
}

function rankCounts(cards: Card[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const c of cards) {
    const v = RANK_VALUES[c.rank];
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

// Number of distinct straight combinations that can be made with the board ranks
function countStraightCombinations(rankVals: number[]): number {
  const ALL_STRAIGHTS: number[][] = [
    [14, 5, 4, 3, 2], [6, 5, 4, 3, 2], [7, 6, 5, 4, 3],
    [8, 7, 6, 5, 4], [9, 8, 7, 6, 5], [10, 9, 8, 7, 6],
    [11, 10, 9, 8, 7], [12, 11, 10, 9, 8], [13, 12, 11, 10, 9],
    [14, 13, 12, 11, 10],
  ];
  const valSet = new Set(rankVals);
  let count = 0;
  for (const s of ALL_STRAIGHTS) {
    if (s.filter(r => valSet.has(r)).length >= 3) count++;
  }
  return count;
}

export function analyzeBoardTexture(board: Card[]): BoardAnalysis {
  if (board.length < 3) {
    return {
      paired: false, monotone: false, twoTone: false, rainbow: false,
      connectedness: "LOW", straightPotential: "LOW", flushPotential: "LOW",
      dynamism: "STATIC", labels: [],
    };
  }

  const suits = suitCounts(board);
  const ranks = rankCounts(board);
  const rankVals = board.map(c => RANK_VALUES[c.rank]);
  const uniqueSuits = Object.values(suits).filter(v => v > 0).length;
  const maxSuitCount = Math.max(...Object.values(suits));

  const paired = Object.values(ranks).some(v => v >= 2);
  const monotone = uniqueSuits === 1;
  const twoTone = uniqueSuits === 2;
  const rainbow = uniqueSuits >= 3;

  // Flush potential: how close to a flush
  const flushPotential: "LOW" | "MEDIUM" | "HIGH" =
    monotone ? "HIGH" : maxSuitCount >= 2 ? "MEDIUM" : "LOW";

  // Connectedness: how close together the ranks are
  const sortedRanks = [...rankVals].sort((a, b) => a - b);
  const span = sortedRanks[sortedRanks.length - 1] - sortedRanks[0];
  const gaps = sortedRanks.slice(1).map((r, i) => r - sortedRanks[i]);
  const maxGap = Math.max(...gaps);

  const connectedness: "LOW" | "MEDIUM" | "HIGH" =
    span <= 4 && maxGap <= 2 ? "HIGH"
    : span <= 7 || maxGap <= 3 ? "MEDIUM"
    : "LOW";

  // Straight potential: how many 5-card straights include 3+ board cards
  const straightCombos = countStraightCombinations(rankVals);
  const straightPotential: "LOW" | "MEDIUM" | "HIGH" =
    straightCombos >= 4 ? "HIGH" : straightCombos >= 2 ? "MEDIUM" : "LOW";

  // Dynamism
  const dynamism: "STATIC" | "SEMI_DYNAMIC" | "DYNAMIC" | "VERY_DYNAMIC" =
    (connectedness === "HIGH" && (twoTone || monotone)) ? "VERY_DYNAMIC"
    : (connectedness === "HIGH" || (connectedness === "MEDIUM" && (twoTone || monotone))) ? "DYNAMIC"
    : (connectedness === "MEDIUM" || twoTone) ? "SEMI_DYNAMIC"
    : "STATIC";

  // Human-readable labels
  const labels: string[] = [];
  if (paired) labels.push("Paired");
  if (monotone) labels.push("Monotone");
  else if (twoTone) labels.push("Two-Tone");
  else labels.push("Rainbow");
  if (dynamism === "STATIC") labels.push("Dry");
  else if (dynamism === "VERY_DYNAMIC") labels.push("Very Dynamic");
  else if (dynamism === "DYNAMIC") labels.push("Dynamic");
  else labels.push("Semi-Dynamic");

  return { paired, monotone, twoTone, rainbow, connectedness, straightPotential, flushPotential, dynamism, labels };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/tests/boardTexture.test.ts
```

Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add src/strategy/boardTexture.ts src/tests/boardTexture.test.ts
git commit -m "feat: add board texture analysis"
```

---

### Task 7: Strategy engine

**Files:**
- Create: `src/strategy/rangeContext.ts`
- Create: `src/strategy/rangeAdvantage.ts`
- Create: `src/strategy/nutAdvantage.ts`
- Create: `src/strategy/flopStrategy.ts`
- Create: `src/strategy/turnStrategy.ts`
- Create: `src/strategy/riverStrategy.ts`
- Create: `src/strategy/betSizing.ts`
- Create: `src/tests/strategy.test.ts`

**Interfaces:**
- Consumes: `PreFlopContext` from `@/domain/hand`; `BoardAnalysis` from `@/strategy/boardTexture`
- Produces:
  - `Advantage = "HERO" | "VILLAIN" | "NEUTRAL"` from `rangeAdvantage.ts` / `nutAdvantage.ts`
  - `StrategyStyle`, `StrategyConfidence`, `StrategyResult` from `flopStrategy.ts`
  - `estimateRangeAdvantage(context, board): Advantage`
  - `estimateNutAdvantage(context, board): Advantage`
  - `getFlopStrategy(context, board, spr): StrategyResult`
  - `getTurnStrategy(context, board, spr): StrategyResult`
  - `getRiverStrategy(context, board, spr): StrategyResult`
  - `suggestBetSizes(pot, fractions): number[]` from `betSizing.ts`

**Steps:**

- [ ] **Step 1: Write the failing strategy test**

Create `src/tests/strategy.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/tests/strategy.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create src/strategy/rangeContext.ts**

This file re-exports types used across the strategy module:

```ts
// Re-exported from domain/hand for strategy module convenience
export type { Position, PotType, PreFlopContext } from "../domain/hand";

export type Advantage = "HERO" | "VILLAIN" | "NEUTRAL";

export type StrategyStyle =
  | "SMALL_FREQUENT"
  | "MIXED"
  | "CHECK_MORE"
  | "POLARIZED"
  | "OVERBET_CANDIDATE"
  | "INSUFFICIENT_CONTEXT";

export type StrategyConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface StrategyResult {
  boardTexture: string[];
  rangeAdvantage: Advantage;
  nutAdvantage: Advantage;
  style: StrategyStyle;
  suggestedBetSizes: number[];
  confidence: StrategyConfidence;
  explanation: string;
}
```

- [ ] **Step 4: Create src/strategy/rangeAdvantage.ts**

```ts
import { PreFlopContext } from "../domain/hand";
import { BoardAnalysis } from "./boardTexture";
import { Advantage } from "./rangeContext";

export function estimateRangeAdvantage(
  context: PreFlopContext,
  board: BoardAnalysis
): Advantage {
  if (!context.preflopAggressor || !context.heroPosition || !context.villainPosition) {
    return "NEUTRAL";
  }

  const aggressorIsHero = context.preflopAggressor === "hero";

  if (aggressorIsHero) {
    if (board.dynamism === "STATIC") return "HERO";
    if (board.dynamism === "SEMI_DYNAMIC") return "HERO";
    if (board.dynamism === "DYNAMIC") return "NEUTRAL";
    return "VILLAIN"; // VERY_DYNAMIC — caller interacts strongly
  } else {
    if (board.dynamism === "STATIC") return "VILLAIN";
    if (board.dynamism === "SEMI_DYNAMIC") return "VILLAIN";
    if (board.dynamism === "DYNAMIC") return "NEUTRAL";
    return "HERO";
  }
}
```

- [ ] **Step 5: Create src/strategy/nutAdvantage.ts**

```ts
import { PreFlopContext } from "../domain/hand";
import { BoardAnalysis } from "./boardTexture";
import { Advantage } from "./rangeContext";

export function estimateNutAdvantage(
  context: PreFlopContext,
  board: BoardAnalysis
): Advantage {
  if (!context.preflopAggressor || !context.heroPosition) {
    return "NEUTRAL";
  }

  const aggressorIsHero = context.preflopAggressor === "hero";

  // On static boards, preflop raiser retains more strong holdings (sets, overpairs, Ax)
  if (board.dynamism === "STATIC" || board.dynamism === "SEMI_DYNAMIC") {
    return aggressorIsHero ? "HERO" : "VILLAIN";
  }

  // On connected/dynamic boards, nut advantage is more equal — caller hits more two-pairs, straights
  return "NEUTRAL";
}
```

- [ ] **Step 6: Create src/strategy/flopStrategy.ts**

```ts
import { PreFlopContext } from "../domain/hand";
import { BoardAnalysis } from "./boardTexture";
import { Advantage, StrategyResult, StrategyStyle, StrategyConfidence } from "./rangeContext";
import { estimateRangeAdvantage } from "./rangeAdvantage";
import { estimateNutAdvantage } from "./nutAdvantage";

function getConfidence(context: PreFlopContext, board: BoardAnalysis): StrategyConfidence {
  if (context.numPlayers > 2) return "LOW";
  if (!context.heroPosition || !context.villainPosition || !context.preflopAggressor) return "LOW";
  if (board.dynamism === "STATIC") return "HIGH";
  if (board.dynamism === "SEMI_DYNAMIC") return "HIGH";
  return "MEDIUM";
}

export function getFlopStrategy(
  context: PreFlopContext,
  board: BoardAnalysis,
  spr: number
): StrategyResult {
  const confidence = getConfidence(context, board);
  const rangeAdvantage = estimateRangeAdvantage(context, board);
  const nutAdvantage = estimateNutAdvantage(context, board);

  let style: StrategyStyle;
  let sizes: number[];
  let explanation: string;

  if (confidence === "LOW") {
    style = "INSUFFICIENT_CONTEXT";
    sizes = [0.33, 0.5];
    explanation = context.numPlayers > 2
      ? "Multiway pot — bet less frequently with a stronger range than heads-up."
      : "Insufficient position/aggressor context for a reliable recommendation.";
  } else if (board.dynamism === "STATIC" && rangeAdvantage === "HERO") {
    style = "SMALL_FREQUENT";
    sizes = [0.25, 0.33];
    explanation = "Dry board with range advantage — small bets work across a wide portion of your range.";
  } else if (board.dynamism === "SEMI_DYNAMIC") {
    style = "MIXED";
    sizes = [0.33, 0.5];
    explanation = "Semi-dynamic board — mix betting and checking; use medium sizing when betting.";
  } else if (nutAdvantage === "HERO" && board.dynamism !== "VERY_DYNAMIC") {
    style = "POLARIZED";
    sizes = [0.67, 1.0];
    explanation = "Nut advantage present — polarized betting with larger sizing extracts more value.";
  } else if (board.dynamism === "DYNAMIC" || board.dynamism === "VERY_DYNAMIC") {
    style = "CHECK_MORE";
    sizes = [0.5, 0.75];
    explanation = "Dynamic board — check more often to protect your range; use larger sizing when betting.";
  } else {
    style = "MIXED";
    sizes = [0.33, 0.5];
    explanation = "Balanced situation — mixed strategy with medium sizing.";
  }

  return {
    boardTexture: board.labels,
    rangeAdvantage,
    nutAdvantage,
    style,
    suggestedBetSizes: sizes,
    confidence,
    explanation,
  };
}
```

- [ ] **Step 7: Create src/strategy/turnStrategy.ts**

```ts
import { PreFlopContext } from "../domain/hand";
import { BoardAnalysis } from "./boardTexture";
import { StrategyResult, StrategyStyle, StrategyConfidence } from "./rangeContext";
import { estimateRangeAdvantage } from "./rangeAdvantage";
import { estimateNutAdvantage } from "./nutAdvantage";

export function getTurnStrategy(
  context: PreFlopContext,
  board: BoardAnalysis,
  spr: number
): StrategyResult {
  const rangeAdvantage = estimateRangeAdvantage(context, board);
  const nutAdvantage = estimateNutAdvantage(context, board);

  let confidence: StrategyConfidence =
    context.numPlayers > 2 || !context.preflopAggressor ? "LOW" : "MEDIUM";

  let style: StrategyStyle;
  let sizes: number[];
  let explanation: string;

  if (confidence === "LOW") {
    style = "INSUFFICIENT_CONTEXT";
    sizes = [0.5, 0.75];
    explanation = "Insufficient context — turn strategy requires position and aggressor information.";
  } else if (nutAdvantage === "HERO" && spr < 3) {
    style = "OVERBET_CANDIDATE";
    sizes = [1.0, 1.5];
    explanation = "Low SPR with nut advantage — overbet candidates emerge on the turn.";
  } else if (board.dynamism === "STATIC" && rangeAdvantage === "HERO") {
    style = "SMALL_FREQUENT";
    sizes = [0.25, 0.5];
    explanation = "Static board with range advantage — continue betting frequently, moderate sizing.";
  } else if (board.dynamism === "VERY_DYNAMIC") {
    style = "POLARIZED";
    sizes = [0.67, 1.0];
    explanation = "Dynamic turn — polarize into value hands and bluffs; check medium-strength hands.";
  } else {
    style = "MIXED";
    sizes = [0.5, 0.75];
    explanation = "Turn strategy narrows — bet value and strong draws; check medium holdings.";
  }

  return {
    boardTexture: board.labels,
    rangeAdvantage,
    nutAdvantage,
    style,
    suggestedBetSizes: sizes,
    confidence,
    explanation,
  };
}
```

- [ ] **Step 8: Create src/strategy/riverStrategy.ts**

```ts
import { PreFlopContext } from "../domain/hand";
import { BoardAnalysis } from "./boardTexture";
import { StrategyResult, StrategyStyle, StrategyConfidence } from "./rangeContext";
import { estimateRangeAdvantage } from "./rangeAdvantage";
import { estimateNutAdvantage } from "./nutAdvantage";

export function getRiverStrategy(
  context: PreFlopContext,
  board: BoardAnalysis,
  spr: number
): StrategyResult {
  const rangeAdvantage = estimateRangeAdvantage(context, board);
  const nutAdvantage = estimateNutAdvantage(context, board);

  let confidence: StrategyConfidence =
    context.numPlayers > 2 || !context.preflopAggressor ? "LOW" : "MEDIUM";

  let style: StrategyStyle;
  let sizes: number[];
  let explanation: string;

  if (confidence === "LOW") {
    style = "INSUFFICIENT_CONTEXT";
    sizes = [0.5, 0.75];
    explanation = "Insufficient context for river strategy.";
  } else if (nutAdvantage === "HERO" && rangeAdvantage === "HERO") {
    style = "OVERBET_CANDIDATE";
    sizes = [1.0, 1.5, 2.0];
    explanation = "Range and nut advantage — overbet candidates are viable on the river.";
  } else if (nutAdvantage === "HERO") {
    style = "POLARIZED";
    sizes = [0.75, 1.0];
    explanation = "Nut advantage on river — polarize with strong value and bluffs.";
  } else {
    style = "MIXED";
    sizes = [0.5, 0.75];
    explanation = "River: bet value for standard sizing; bluff catchers check or bet small (block bet).";
  }

  return {
    boardTexture: board.labels,
    rangeAdvantage,
    nutAdvantage,
    style,
    suggestedBetSizes: sizes,
    confidence,
    explanation,
  };
}
```

- [ ] **Step 9: Create src/strategy/betSizing.ts**

```ts
// Converts pot fractions (e.g. 0.33) to absolute amounts rounded to nearest 5
export function suggestBetSizes(pot: number, fractions: number[]): number[] {
  return fractions.map(f => Math.round((pot * f) / 5) * 5);
}
```

- [ ] **Step 10: Run tests to confirm they pass**

```bash
npx vitest run src/tests/strategy.test.ts
```

Expected: 11 passing.

- [ ] **Step 11: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass (Phase 1 + Phase 2 tests).

- [ ] **Step 12: Commit**

```bash
git add src/strategy/ src/tests/strategy.test.ts
git commit -m "feat: add strategy engine — board texture, range advantage, flop/turn/river strategy"
```
