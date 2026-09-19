# Poker Companion — Phase 1: Core Mathematics

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js 15 project and implement all poker mathematics as pure, fully-tested TypeScript functions.

**Architecture:** All poker math runs in `src/poker/` and `src/domain/` as pure functions with no UI dependencies. Vitest tests live in `src/tests/`. This phase has no UI — output is a passing test suite.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, Zustand, Vitest

**Spec:** `docs/superpowers/specs/2026-09-19-poker-companion-design.md`

## Global Constraints

- All poker math functions must be pure (no side effects, no global state)
- All calculations must complete in < 100 ms
- `nextCardProbability`: flop uses `outs / 47`, turn uses `outs / 46`
- `requiredEquity` formula: `call / (pot + call)`
- `RANGE_REQUIRED` when `hasMadeHand && outsResult.count < 3`
- Outs are unique — a card that completes multiple draws is counted once
- `calculateOuts` returns `{ outs: [], count: 0, labels: [] }` when `board.length < 3`
- All-in runout uses `enumeratedRunoutProbability` (full turn×river enumeration)
- Decision thresholds: CALL ≥ +2pp, FOLD ≤ −2pp, CLOSE within ±2pp
- Test runner: `npx vitest run` from the repo root
- Currency: `R` prefix (UI only; no currency logic in Phase 1)
- No ICM, no opponent ranges, no GTO solver

---

### Task 1: Project scaffold, domain types, and deck utilities

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test scripts)
- Create: `src/domain/cards.ts`
- Create: `src/domain/deck.ts`
- Create: `src/domain/hand.ts`
- Create: `src/tests/domain.test.ts`

**Interfaces:**
- Produces:
  - `Rank`, `Suit`, `Card`, `RANKS`, `SUITS`, `RANK_VALUES`, `SUIT_SYMBOLS`, `RANK_NAMES` from `cards.ts`
  - `cardKey(c: Card): string`, `cardLabel(c: Card): string`, `cardsEqual(a, b): boolean` from `cards.ts`
  - `createDeck(): Card[]`, `removeCards(deck, used): Card[]`, `hasNoDuplicates(cards): boolean`, `combinations<T>(arr, k): T[][]` from `deck.ts`
  - `GameMode`, `Street`, `Position`, `PotType`, `PokerHand`, `PreFlopContext` from `hand.ts`

**Steps:**

- [ ] **Step 1: Scaffold the Next.js 15 project**

Run from inside the repo root (`c:\Users\wayne.winter\Repositories\poker_companion`):

```bash
npx create-next-app@15 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-git
```

When prompted, accept defaults. This creates the Next.js app in the existing repo without reinitialising git.

- [ ] **Step 2: Install Zustand and Vitest**

```bash
npm install zustand
npm install -D vitest
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Add test scripts to package.json**

Add inside the `"scripts"` block:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write the failing domain test**

Create `src/tests/domain.test.ts`:

```ts
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
```

- [ ] **Step 6: Run test to confirm it fails**

```bash
npx vitest run src/tests/domain.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 7: Create src/domain/cards.ts**

```ts
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";
export type Suit = "s" | "h" | "d" | "c";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
export const SUITS: Suit[] = ["s", "h", "d", "c"];

export const RANK_VALUES: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "T": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  s: "♠", h: "♥", d: "♦", c: "♣",
};

export const RANK_NAMES: Record<number, string> = {
  14: "Ace", 13: "King", 12: "Queen", 11: "Jack", 10: "Ten",
  9: "Nine", 8: "Eight", 7: "Seven", 6: "Six", 5: "Five",
  4: "Four", 3: "Three", 2: "Two",
};

export function cardKey(c: Card): string {
  return `${c.rank}${c.suit}`;
}

export function cardLabel(c: Card): string {
  return `${c.rank}${SUIT_SYMBOLS[c.suit]}`;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}
```

- [ ] **Step 8: Create src/domain/deck.ts**

```ts
import { Card, RANKS, SUITS } from "./cards";

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function removeCards(deck: Card[], used: Card[]): Card[] {
  const usedKeys = new Set(used.map(c => `${c.rank}${c.suit}`));
  return deck.filter(c => !usedKeys.has(`${c.rank}${c.suit}`));
}

export function hasNoDuplicates(cards: Card[]): boolean {
  const seen = new Set<string>();
  for (const c of cards) {
    const k = `${c.rank}${c.suit}`;
    if (seen.has(k)) return false;
    seen.add(k);
  }
  return true;
}

export function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map(c => [first, ...c]),
    ...combinations(rest, k),
  ];
}
```

- [ ] **Step 9: Create src/domain/hand.ts**

```ts
import { Card } from "./cards";

export type GameMode = "cash" | "tournament";
export type Street = "preflop" | "flop" | "turn" | "river";
export type Position = "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB";
export type PotType = "srp" | "3bet" | "4bet";

export interface PokerHand {
  gameMode: GameMode;
  heroCards: Card[];
  board: Card[];
  street: Street;
  pot: number;
  amountToCall: number;
  heroStack?: number;
  villainStack?: number;
  isAllIn: boolean;
}

export interface PreFlopContext {
  heroPosition?: Position;
  villainPosition?: Position;
  preflopAggressor?: "hero" | "villain";
  potType?: PotType;
  numPlayers: number;
}
```

- [ ] **Step 10: Run test to confirm it passes**

```bash
npx vitest run src/tests/domain.test.ts
```

Expected: 8 passing.

- [ ] **Step 11: Commit**

```bash
git add vitest.config.ts package.json src/domain/ src/tests/domain.test.ts
git commit -m "feat: scaffold project, add domain types and deck utilities"
```

---

### Task 2: Hand evaluator

**Files:**
- Create: `src/poker/evaluator.ts`
- Create: `src/tests/evaluator.test.ts`

**Interfaces:**
- Consumes: `Card`, `RANK_VALUES`, `RANK_NAMES` from `@/domain/cards`; `combinations` from `@/domain/deck`
- Produces:
  - `HandCategory` union type
  - `HandResult { category, description, rankValue }`
  - `evaluateBestHand(heroCards: Card[], board: Card[]): HandResult`

**Steps:**

- [ ] **Step 1: Write the failing evaluator test**

Create `src/tests/evaluator.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { evaluateBestHand } from "@/poker/evaluator";

describe("evaluateBestHand", () => {
  it("detects high card", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "8", suit: "h" }],
      [{ rank: "K", suit: "d" }, { rank: "7", suit: "c" }, { rank: "4", suit: "h" }]
    );
    expect(r.category).toBe("high_card");
  });

  it("detects pair", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      [{ rank: "K", suit: "d" }, { rank: "7", suit: "c" }, { rank: "4", suit: "h" }]
    );
    expect(r.category).toBe("pair");
    expect(r.description).toContain("Aces");
  });

  it("detects two pair", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }],
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "d" }, { rank: "7", suit: "c" }]
    );
    expect(r.category).toBe("two_pair");
  });

  it("detects three of a kind", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      [{ rank: "A", suit: "d" }, { rank: "7", suit: "c" }, { rank: "4", suit: "h" }]
    );
    expect(r.category).toBe("three_of_a_kind");
  });

  it("detects straight", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "2", suit: "h" }],
      [{ rank: "3", suit: "d" }, { rank: "4", suit: "c" }, { rank: "5", suit: "h" }]
    );
    expect(r.category).toBe("straight");
  });

  it("detects wheel straight (A-2-3-4-5)", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "2", suit: "h" }],
      [{ rank: "3", suit: "d" }, { rank: "4", suit: "c" }, { rank: "5", suit: "h" },
       { rank: "K", suit: "s" }, { rank: "Q", suit: "d" }]
    );
    expect(r.category).toBe("straight");
  });

  it("detects flush", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "8", suit: "s" }],
      [{ rank: "K", suit: "s" }, { rank: "7", suit: "s" }, { rank: "2", suit: "s" }]
    );
    expect(r.category).toBe("flush");
  });

  it("detects full house", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      [{ rank: "A", suit: "d" }, { rank: "K", suit: "c" }, { rank: "K", suit: "h" }]
    );
    expect(r.category).toBe("full_house");
  });

  it("detects four of a kind", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      [{ rank: "A", suit: "d" }, { rank: "A", suit: "c" }, { rank: "K", suit: "h" }]
    );
    expect(r.category).toBe("four_of_a_kind");
  });

  it("detects straight flush / royal flush", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }],
      [{ rank: "Q", suit: "s" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }]
    );
    expect(r.category).toBe("straight_flush");
    expect(r.description).toBe("Royal Flush");
  });

  it("picks the best 5-card hand from 7 cards", () => {
    // Two pair possible: AA + KK, but also trips + pair with the board
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      [{ rank: "A", suit: "d" }, { rank: "K", suit: "c" }, { rank: "K", suit: "h" },
       { rank: "2", suit: "s" }, { rank: "3", suit: "d" }]
    );
    expect(r.category).toBe("full_house");
  });

  it("flush beats straight in rankValue", () => {
    const flush = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "8", suit: "s" }],
      [{ rank: "K", suit: "s" }, { rank: "7", suit: "s" }, { rank: "2", suit: "s" }]
    );
    const straight = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "2", suit: "h" }],
      [{ rank: "3", suit: "d" }, { rank: "4", suit: "c" }, { rank: "5", suit: "h" }]
    );
    expect(flush.rankValue).toBeGreaterThan(straight.rankValue);
  });

  it("handles preflop (< 5 cards) by detecting a pocket pair", () => {
    const r = evaluateBestHand(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }],
      []
    );
    expect(r.category).toBe("pair");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/tests/evaluator.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create src/poker/evaluator.ts**

```ts
import { Card, RANK_VALUES, RANK_NAMES } from "../domain/cards";
import { combinations } from "../domain/deck";

export type HandCategory =
  | "high_card" | "pair" | "two_pair" | "three_of_a_kind"
  | "straight" | "flush" | "full_house" | "four_of_a_kind"
  | "straight_flush";

export interface HandResult {
  category: HandCategory;
  description: string;
  rankValue: number;
}

function rankName(v: number): string {
  return RANK_NAMES[v] ?? String(v);
}

function rankPlural(v: number): string {
  if (v === 6) return "Sixes";
  return rankName(v) + "s";
}

// Returns the high-card value of the straight, or false if not a straight
function straightHighCard(sortedDesc: number[]): number | false {
  if (
    sortedDesc[0] === 14 && sortedDesc[1] === 5 &&
    sortedDesc[2] === 4 && sortedDesc[3] === 3 && sortedDesc[4] === 2
  ) return 5;
  for (let i = 0; i < 4; i++) {
    if (sortedDesc[i] - sortedDesc[i + 1] !== 1) return false;
  }
  return sortedDesc[0];
}

function encodeRanks(ranks: number[]): number {
  return ranks.reduce((acc, r) => acc * 15 + r, 0);
}

function evaluate5Card(cards: Card[]): HandResult {
  const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const straightHigh = straightHighCard(ranks);
  const isStraight = straightHigh !== false;

  const counts: Record<number, number> = {};
  for (const r of ranks) counts[r] = (counts[r] ?? 0) + 1;
  const groups = Object.entries(counts)
    .map(([r, c]) => ({ rank: Number(r), count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  if (isFlush && isStraight) {
    const h = straightHigh as number;
    return {
      category: "straight_flush",
      description: h === 14 ? "Royal Flush" : `Straight Flush, ${rankName(h)} high`,
      rankValue: 8_000_000 + h,
    };
  }
  if (groups[0].count === 4) {
    return {
      category: "four_of_a_kind",
      description: `Four of a Kind, ${rankPlural(groups[0].rank)}`,
      rankValue: 7_000_000 + groups[0].rank * 100 + (groups[1]?.rank ?? 0),
    };
  }
  if (groups[0].count === 3 && groups[1]?.count === 2) {
    return {
      category: "full_house",
      description: `Full House, ${rankPlural(groups[0].rank)} full of ${rankPlural(groups[1].rank)}`,
      rankValue: 6_000_000 + groups[0].rank * 100 + groups[1].rank,
    };
  }
  if (isFlush) {
    return {
      category: "flush",
      description: `${rankName(ranks[0])}-high Flush`,
      rankValue: 5_000_000 + encodeRanks(ranks),
    };
  }
  if (isStraight) {
    const h = straightHigh as number;
    return {
      category: "straight",
      description: `Straight, ${rankName(h)} high`,
      rankValue: 4_000_000 + h,
    };
  }
  if (groups[0].count === 3) {
    const kickers = groups.filter(g => g.count === 1).map(g => g.rank);
    return {
      category: "three_of_a_kind",
      description: `Three of a Kind, ${rankPlural(groups[0].rank)}`,
      rankValue: 3_000_000 + groups[0].rank * 1000 + encodeRanks(kickers),
    };
  }
  if (groups[0].count === 2 && groups[1]?.count === 2) {
    return {
      category: "two_pair",
      description: `Two Pair, ${rankPlural(groups[0].rank)} and ${rankPlural(groups[1].rank)}`,
      rankValue: 2_000_000 + groups[0].rank * 1000 + groups[1].rank * 100 + (groups[2]?.rank ?? 0),
    };
  }
  if (groups[0].count === 2) {
    const kickers = groups.filter(g => g.count === 1).map(g => g.rank);
    return {
      category: "pair",
      description: `Pair of ${rankPlural(groups[0].rank)}`,
      rankValue: 1_000_000 + groups[0].rank * 10_000 + encodeRanks(kickers),
    };
  }
  return {
    category: "high_card",
    description: `${rankName(ranks[0])}-high`,
    rankValue: encodeRanks(ranks),
  };
}

export function evaluateBestHand(heroCards: Card[], board: Card[]): HandResult {
  const all = [...heroCards, ...board];

  if (all.length < 5) {
    const ranks = all.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const counts: Record<number, number> = {};
    for (const r of ranks) counts[r] = (counts[r] ?? 0) + 1;
    const groups = Object.entries(counts)
      .map(([r, c]) => ({ rank: Number(r), count: c }))
      .sort((a, b) => b.count - a.count || b.rank - a.rank);
    if (groups[0]?.count >= 2) {
      return {
        category: "pair",
        description: `Pair of ${rankPlural(groups[0].rank)}`,
        rankValue: 1_000_000 + groups[0].rank * 10_000,
      };
    }
    return {
      category: "high_card",
      description: `${RANK_NAMES[ranks[0]] ?? ranks[0]}-high`,
      rankValue: ranks[0] ?? 0,
    };
  }

  const hands = all.length === 5 ? [all] : combinations(all, 5);
  let best: HandResult | null = null;
  for (const hand of hands) {
    const r = evaluate5Card(hand);
    if (!best || r.rankValue > best.rankValue) best = r;
  }
  return best!;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run src/tests/evaluator.test.ts
```

Expected: 13 passing.

- [ ] **Step 5: Commit**

```bash
git add src/poker/evaluator.ts src/tests/evaluator.test.ts
git commit -m "feat: add hand evaluator — all 9 categories"
```

---

### Task 3: Draw detection and outs engine

**Files:**
- Create: `src/poker/draws.ts`
- Create: `src/poker/outs.ts`
- Create: `src/tests/draws.test.ts`
- Create: `src/tests/outs.test.ts`

**Interfaces:**
- Consumes: `Card`, `RANK_VALUES`, `Suit` from `@/domain/cards`; `createDeck`, `removeCards` from `@/domain/deck`; `evaluateBestHand`, `HandCategory` from `@/poker/evaluator`
- Produces:
  - `DrawAnalysis { draws: string[], hasMadeHand: boolean }` from `draws.ts`
  - `detectDraws(heroCards, board): DrawAnalysis`
  - `OutsResult { outs: Card[], count: number, labels: string[] }` from `outs.ts`
  - `calculateOuts(heroCards, board): OutsResult`

**Steps:**

- [ ] **Step 1: Write the failing draws test**

Create `src/tests/draws.test.ts`:

```ts
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
```

- [ ] **Step 2: Write the failing outs test**

Create `src/tests/outs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculateOuts } from "@/poker/outs";

describe("calculateOuts", () => {
  it("returns 9 outs for a flush draw (A♥ 8♥ | K♥ 7♥ 2♣)", () => {
    const result = calculateOuts(
      [{ rank: "A", suit: "h" }, { rank: "8", suit: "h" }],
      [{ rank: "K", suit: "h" }, { rank: "7", suit: "h" }, { rank: "2", suit: "c" }]
    );
    expect(result.count).toBe(9);
  });

  it("does not double-count a card that completes both straight and flush", () => {
    // A♠ 2♠ | 3♠ 4♠ 6♣ — 5♠ completes flush (5th spade) AND wheel straight
    const result = calculateOuts(
      [{ rank: "A", suit: "s" }, { rank: "2", suit: "s" }],
      [{ rank: "3", suit: "s" }, { rank: "4", suit: "s" }, { rank: "6", suit: "c" }]
    );
    const fiveSpade = result.outs.filter(c => c.rank === "5" && c.suit === "s");
    expect(fiveSpade).toHaveLength(1);
  });

  it("returns 0 outs when board has fewer than 3 cards", () => {
    const result = calculateOuts(
      [{ rank: "A", suit: "h" }, { rank: "8", suit: "h" }],
      []
    );
    expect(result.count).toBe(0);
    expect(result.outs).toHaveLength(0);
  });

  it("counts overcard outs (A♠ K♠ | 9♦ 7♣ 2♥)", () => {
    const result = calculateOuts(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }],
      [{ rank: "9", suit: "d" }, { rank: "7", suit: "c" }, { rank: "2", suit: "h" }]
    );
    // 3 remaining Aces + 3 remaining Kings = 6 minimum overcard outs
    expect(result.count).toBeGreaterThanOrEqual(6);
  });

  it("each out card appears exactly once in the outs array", () => {
    const result = calculateOuts(
      [{ rank: "A", suit: "h" }, { rank: "8", suit: "h" }],
      [{ rank: "K", suit: "h" }, { rank: "7", suit: "h" }, { rank: "2", suit: "c" }]
    );
    const keys = result.outs.map(c => `${c.rank}${c.suit}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run src/tests/draws.test.ts src/tests/outs.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create src/poker/draws.ts**

```ts
import { Card, RANK_VALUES, Suit } from "../domain/cards";
import { evaluateBestHand, HandCategory } from "./evaluator";

export interface DrawAnalysis {
  draws: string[];
  hasMadeHand: boolean;
}

const ALL_STRAIGHTS: number[][] = [
  [14, 5, 4, 3, 2],
  [6, 5, 4, 3, 2],
  [7, 6, 5, 4, 3],
  [8, 7, 6, 5, 4],
  [9, 8, 7, 6, 5],
  [10, 9, 8, 7, 6],
  [11, 10, 9, 8, 7],
  [12, 11, 10, 9, 8],
  [13, 12, 11, 10, 9],
  [14, 13, 12, 11, 10],
];

const MADE_HAND_CATEGORIES: HandCategory[] = [
  "pair", "two_pair", "three_of_a_kind", "straight",
  "flush", "full_house", "four_of_a_kind", "straight_flush",
];

export function detectDraws(heroCards: Card[], board: Card[]): DrawAnalysis {
  if (board.length < 3) return { draws: [], hasMadeHand: false };

  const all = [...heroCards, ...board];
  const current = evaluateBestHand(heroCards, board);
  const hasMadeHand = MADE_HAND_CATEGORIES.includes(current.category);
  const draws: string[] = [];

  // Flush draw: exactly 4 cards of the same suit, hero contributes, not already a flush
  if (current.category !== "flush" && current.category !== "straight_flush") {
    const suitGroups: Record<Suit, Card[]> = { s: [], h: [], d: [], c: [] };
    for (const c of all) suitGroups[c.suit].push(c);

    for (const [suit, cards] of Object.entries(suitGroups) as [Suit, Card[]][]) {
      if (cards.length === 4 && heroCards.some(c => c.suit === suit)) {
        const heroMax = Math.max(
          ...heroCards.filter(c => c.suit === suit).map(c => RANK_VALUES[c.rank])
        );
        draws.push(heroMax === 14 ? "Nut flush draw" : "Flush draw");
      }
    }
  }

  // Straight draws: scan all possible straights for 4-card combinations
  if (current.category !== "straight" && current.category !== "straight_flush") {
    const allRankVals = new Set(all.map(c => RANK_VALUES[c.rank]));
    const heroRankVals = new Set(heroCards.map(c => RANK_VALUES[c.rank]));
    let oesd = 0;
    let gutshots = 0;

    for (const straight of ALL_STRAIGHTS) {
      const present = straight.filter(r => allRankVals.has(r));
      const missing = straight.filter(r => !allRankVals.has(r));
      if (present.length !== 4 || missing.length !== 1) continue;
      if (!straight.some(r => heroRankVals.has(r))) continue; // hero must contribute

      const missingIdx = straight.indexOf(missing[0]);
      if (missingIdx === 0 || missingIdx === 4) oesd++;
      else gutshots++;
    }

    if (gutshots >= 2 && oesd === 0) draws.push("Double-gutshot straight draw");
    else if (oesd > 0) draws.push("Open-ended straight draw");
    else if (gutshots > 0) draws.push("Gutshot straight draw");
  }

  // Overcard: hero card beats all board cards, board has no pair with that rank
  if (current.category === "high_card") {
    const boardRankVals = board.map(c => RANK_VALUES[c.rank]);
    const maxBoard = Math.max(...boardRankVals);
    for (const hc of heroCards) {
      const hv = RANK_VALUES[hc.rank];
      if (hv > maxBoard && !boardRankVals.includes(hv)) {
        draws.push(hv === 14 ? "Ace overcard" : `${hc.rank}-high overcard`);
      }
    }
  }

  return { draws: [...new Set(draws)], hasMadeHand };
}
```

- [ ] **Step 5: Create src/poker/outs.ts**

```ts
import { Card } from "../domain/cards";
import { createDeck, removeCards } from "../domain/deck";
import { evaluateBestHand } from "./evaluator";

export interface OutsResult {
  outs: Card[];
  count: number;
  labels: string[];
}

export function calculateOuts(heroCards: Card[], board: Card[]): OutsResult {
  if (board.length < 3) return { outs: [], count: 0, labels: [] };

  const used = [...heroCards, ...board];
  const unseen = removeCards(createDeck(), used);
  const baseline = evaluateBestHand(heroCards, board);
  const outs: Card[] = [];
  const labels: string[] = [];

  for (const candidate of unseen) {
    const newBoard = [...board, candidate];
    const improved = evaluateBestHand(heroCards, newBoard);
    if (improved.rankValue > baseline.rankValue) {
      outs.push(candidate);
      labels.push(improved.description);
    }
  }

  return { outs, count: outs.length, labels };
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx vitest run src/tests/draws.test.ts src/tests/outs.test.ts
```

Expected: 12 passing.

- [ ] **Step 7: Commit**

```bash
git add src/poker/draws.ts src/poker/outs.ts src/tests/draws.test.ts src/tests/outs.test.ts
git commit -m "feat: add draw detection and outs engine"
```

---

### Task 4: Probability, pot odds, and implied odds

**Files:**
- Create: `src/poker/probability.ts`
- Create: `src/poker/potOdds.ts`
- Create: `src/poker/impliedOdds.ts`
- Create: `src/tests/probability.test.ts`
- Create: `src/tests/potOdds.test.ts`

**Interfaces:**
- Consumes: `Card` from `@/domain/cards`; `createDeck`, `removeCards` from `@/domain/deck`; `evaluateBestHand` from `@/poker/evaluator`
- Produces:
  - `nextCardProbability(outs, street): number`
  - `runoutProbability(outs): number`
  - `enumeratedRunoutProbability(heroCards, board): number`
  - `PotOddsResult { ratio: number, requiredEquity: number }`
  - `calculatePotOdds(pot, call): PotOddsResult`
  - `ImpliedOddsResult { futureWinningsRequired, effectiveStackAvailable?, possible }`
  - `calculateImpliedOdds(pot, call, probability, effectiveStack?): ImpliedOddsResult`

**Steps:**

- [ ] **Step 1: Write the failing tests**

Create `src/tests/potOdds.test.ts`:

```ts
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
```

Create `src/tests/probability.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { nextCardProbability, runoutProbability, enumeratedRunoutProbability } from "@/poker/probability";

describe("nextCardProbability", () => {
  it("flop: 9 outs / 47 ≈ 19.15%", () => {
    expect(nextCardProbability(9, "flop")).toBeCloseTo(9 / 47, 5);
  });

  it("turn: 9 outs / 46", () => {
    expect(nextCardProbability(9, "turn")).toBeCloseTo(9 / 46, 5);
  });

  it("returns 0 for 0 outs", () => {
    expect(nextCardProbability(0, "flop")).toBe(0);
  });

  it("caps at 1 for outs > unseen (guard)", () => {
    expect(nextCardProbability(50, "flop")).toBe(1);
  });
});

describe("runoutProbability", () => {
  it("greater than single-card probability for same outs", () => {
    expect(runoutProbability(9)).toBeGreaterThan(nextCardProbability(9, "flop"));
  });

  it("formula: 1 - ((47-outs)/47) * ((46-outs)/46)", () => {
    const expected = 1 - (38 / 47) * (37 / 46);
    expect(runoutProbability(9)).toBeCloseTo(expected, 6);
  });
});

describe("enumeratedRunoutProbability", () => {
  it("flush draw (~34% by river with 9 outs)", () => {
    const heroCards = [{ rank: "A" as const, suit: "h" as const }, { rank: "8" as const, suit: "h" as const }];
    const board = [{ rank: "K" as const, suit: "h" as const }, { rank: "7" as const, suit: "h" as const }, { rank: "2" as const, suit: "c" as const }];
    const prob = enumeratedRunoutProbability(heroCards, board);
    expect(prob).toBeGreaterThan(0.30);
    expect(prob).toBeLessThan(0.40);
  });

  it("is greater than next-card probability for the same flush draw", () => {
    const heroCards = [{ rank: "A" as const, suit: "h" as const }, { rank: "8" as const, suit: "h" as const }];
    const board = [{ rank: "K" as const, suit: "h" as const }, { rank: "7" as const, suit: "h" as const }, { rank: "2" as const, suit: "c" as const }];
    expect(enumeratedRunoutProbability(heroCards, board)).toBeGreaterThan(nextCardProbability(9, "flop"));
  });

  it("returns 0 when board is not exactly 3 cards", () => {
    const heroCards = [{ rank: "A" as const, suit: "h" as const }, { rank: "8" as const, suit: "h" as const }];
    expect(enumeratedRunoutProbability(heroCards, [])).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/tests/potOdds.test.ts src/tests/probability.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create src/poker/potOdds.ts**

```ts
export interface PotOddsResult {
  ratio: number;
  requiredEquity: number;
}

export function calculatePotOdds(pot: number, call: number): PotOddsResult {
  if (call <= 0) return { ratio: Infinity, requiredEquity: 0 };
  return {
    ratio: pot / call,
    requiredEquity: call / (pot + call),
  };
}
```

- [ ] **Step 4: Create src/poker/probability.ts**

```ts
import { Card } from "../domain/cards";
import { createDeck, removeCards } from "../domain/deck";
import { evaluateBestHand } from "./evaluator";

export function nextCardProbability(outs: number, street: "flop" | "turn"): number {
  if (outs <= 0) return 0;
  const unseen = street === "flop" ? 47 : 46;
  return Math.min(outs / unseen, 1);
}

export function runoutProbability(outs: number): number {
  if (outs <= 0) return 0;
  return 1 - ((47 - outs) / 47) * ((46 - outs) / 46);
}

// Exact enumeration of all turn+river combinations — valid on flop only
export function enumeratedRunoutProbability(heroCards: Card[], board: Card[]): number {
  if (board.length !== 3) return 0;

  const used = [...heroCards, ...board];
  const remaining = removeCards(createDeck(), used);
  const baseline = evaluateBestHand(heroCards, board);

  let improvements = 0;
  let total = 0;

  for (let i = 0; i < remaining.length; i++) {
    for (let j = i + 1; j < remaining.length; j++) {
      total++;
      const runout = [...board, remaining[i], remaining[j]];
      const result = evaluateBestHand(heroCards, runout);
      if (result.rankValue > baseline.rankValue) improvements++;
    }
  }

  return total > 0 ? improvements / total : 0;
}
```

- [ ] **Step 5: Create src/poker/impliedOdds.ts**

```ts
export interface ImpliedOddsResult {
  futureWinningsRequired: number;
  effectiveStackAvailable?: number;
  possible: boolean;
}

export function calculateImpliedOdds(
  pot: number,
  call: number,
  probability: number,
  effectiveStack?: number
): ImpliedOddsResult {
  if (probability <= 0 || call <= 0) {
    return { futureWinningsRequired: Infinity, effectiveStackAvailable: effectiveStack, possible: false };
  }
  const totalRequired = call / probability;
  const futureWinningsRequired = Math.max(0, totalRequired - pot - call);
  const possible = effectiveStack !== undefined
    ? futureWinningsRequired <= effectiveStack
    : futureWinningsRequired < pot * 2;

  return { futureWinningsRequired, effectiveStackAvailable: effectiveStack, possible };
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx vitest run src/tests/potOdds.test.ts src/tests/probability.test.ts
```

Expected: 11 passing.

- [ ] **Step 7: Commit**

```bash
git add src/poker/probability.ts src/poker/potOdds.ts src/poker/impliedOdds.ts src/tests/probability.test.ts src/tests/potOdds.test.ts
git commit -m "feat: add probability, pot odds, and implied odds"
```

---

### Task 5: Decision engine

**Files:**
- Create: `src/poker/decisionEngine.ts`
- Create: `src/tests/decisionEngine.test.ts`

**Interfaces:**
- Consumes: `PokerHand` from `@/domain/hand`; `DrawAnalysis` from `@/poker/draws`; `OutsResult` from `@/poker/outs`; `calculatePotOdds` from `@/poker/potOdds`; `calculateImpliedOdds`, `ImpliedOddsResult` from `@/poker/impliedOdds`; `nextCardProbability`, `enumeratedRunoutProbability` from `@/poker/probability`
- Produces:
  - `DecisionSignal` = `"CALL" | "FOLD" | "CLOSE" | "RANGE_REQUIRED"`
  - `DecisionResult { signal, requiredEquity, comparisonProbability?, margin?, reason, impliedOdds? }`
  - `calculateDecision(hand, drawAnalysis, outsResult): DecisionResult`

**Steps:**

- [ ] **Step 1: Write the failing decision engine test**

Create `src/tests/decisionEngine.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/tests/decisionEngine.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create src/poker/decisionEngine.ts**

```ts
import { PokerHand } from "../domain/hand";
import { DrawAnalysis } from "./draws";
import { OutsResult } from "./outs";
import { calculatePotOdds } from "./potOdds";
import { calculateImpliedOdds, ImpliedOddsResult } from "./impliedOdds";
import { nextCardProbability, enumeratedRunoutProbability } from "./probability";

export type DecisionSignal = "CALL" | "FOLD" | "CLOSE" | "RANGE_REQUIRED";

export interface DecisionResult {
  signal: DecisionSignal;
  requiredEquity: number;
  comparisonProbability?: number;
  margin?: number;
  reason: string;
  impliedOdds?: ImpliedOddsResult;
}

const MARGIN_THRESHOLD = 0.02;

export function calculateDecision(
  hand: PokerHand,
  drawAnalysis: DrawAnalysis,
  outsResult: OutsResult
): DecisionResult {
  const { pot, amountToCall, heroStack, villainStack, isAllIn, street } = hand;

  if (amountToCall <= 0) {
    return { signal: "CALL", requiredEquity: 0, reason: "No cost to continue." };
  }

  const { requiredEquity } = calculatePotOdds(pot, amountToCall);

  if (drawAnalysis.hasMadeHand && outsResult.count < 3) {
    return {
      signal: "RANGE_REQUIRED",
      requiredEquity,
      reason: "Made hand — opponent range required for reliable equity calculation.",
    };
  }

  let comparisonProbability: number;
  if (isAllIn && street === "flop") {
    comparisonProbability = enumeratedRunoutProbability(hand.heroCards, hand.board);
  } else {
    comparisonProbability = nextCardProbability(
      outsResult.count,
      street === "flop" ? "flop" : "turn"
    );
  }

  const margin = comparisonProbability - requiredEquity;

  const effectiveStack =
    heroStack !== undefined && villainStack !== undefined
      ? Math.min(heroStack, villainStack)
      : undefined;

  const impliedOdds = calculateImpliedOdds(pot, amountToCall, comparisonProbability, effectiveStack);

  let signal: DecisionSignal;
  let reason: string;

  if (margin >= MARGIN_THRESHOLD) {
    signal = "CALL";
    reason = `Draw probability (${(comparisonProbability * 100).toFixed(1)}%) exceeds required equity (${(requiredEquity * 100).toFixed(1)}%).`;
  } else if (margin <= -MARGIN_THRESHOLD) {
    signal = "FOLD";
    reason = `Draw probability (${(comparisonProbability * 100).toFixed(1)}%) is below required equity (${(requiredEquity * 100).toFixed(1)}%).`;
  } else {
    signal = "CLOSE";
    reason = `Margin ±${(Math.abs(margin) * 100).toFixed(1)}% — implied odds may determine the correct play.`;
  }

  return { signal, requiredEquity, comparisonProbability, margin, reason, impliedOdds };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/tests/decisionEngine.test.ts
```

Expected: 8 passing.

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass (domain, evaluator, draws, outs, probability, potOdds, decisionEngine).

- [ ] **Step 6: Commit**

```bash
git add src/poker/decisionEngine.ts src/tests/decisionEngine.test.ts
git commit -m "feat: add decision engine — CALL/FOLD/CLOSE/RANGE_REQUIRED"
```
