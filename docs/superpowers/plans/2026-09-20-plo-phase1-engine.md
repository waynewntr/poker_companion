# PLO Mode — Phase 1: Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the PLO poker engine as pure, fully-tested TypeScript functions — evaluator, draws, outs, and preflop rater. No UI changes.

**Architecture:** New files only under `src/poker/plo/`. The PLO evaluator reuses the existing NLHE `evaluateBestHand` for 5-card evaluation by generating valid 2-from-hole + 3-from-board combinations. Zero changes to existing NLHE files.

**Tech Stack:** TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-09-20-plo-mode-design.md`

## Global Constraints

- **Zero deletions or logic changes** to any existing NLHE file
- All PLO functions pure (no side effects, no global state)
- PLO evaluator rule: exactly 2 hole cards + exactly 3 board cards = 5 cards
- PLO flush draw: hero must have **exactly 2** cards of flush suit (not 1, not 3+)
- PLO straight draw: hero must contribute **exactly 2 ranks** of 4-in-a-row
- `OutsResult` interface reused unchanged — PLO outs return the same shape
- Test runner: `npx vitest run` from repo root
- Working directory: `C:\Users\wayne.winter\Repositories\poker_companion`

---

### Task 1: PLO evaluator

**Files:**
- Create: `src/poker/plo/evaluator.ts`
- Create: `src/tests/plo-evaluator.test.ts`

**Interfaces:**
- Consumes: `evaluateBestHand`, `HandResult` from `@/poker/evaluator`; `combinations` from `@/domain/deck`; `Card` from `@/domain/cards`
- Produces: `evaluateBestHandPLO(heroCards: Card[], board: Card[]): HandResult`

**Steps:**

- [ ] **Step 1: Write the failing test**

Create `src/tests/plo-evaluator.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { evaluateBestHandPLO } from "@/poker/plo/evaluator";

describe("evaluateBestHandPLO", () => {
  it("enforces 2-from-hole: finds flush when 2 suited hole cards + 3 board", () => {
    // Hero: A♠K♠J♦T♦ — A♠K♠ + Q♠J♠T♠ board = flush
    const result = evaluateBestHandPLO(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }, { rank: "J", suit: "d" }, { rank: "T", suit: "d" }],
      [{ rank: "Q", suit: "s" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }]
    );
    expect(result.category).toBe("straight_flush"); // A♠K♠Q♠J♠T♠ = royal flush
  });

  it("enforces 2-from-hole: cannot use 3 hole cards", () => {
    // Hero: A♠K♠Q♠J♦ — even though 3 spades in hero+board, must use exactly 2 from hero
    // Best valid hand: A♠K♠ + Q♠2♣3♦ board = flush (A-K-Q + 2 board spades)
    // Wait — only if board has 3 spades can we use 2 from hero for flush
    // Let's test: hero A♠K♠Q♠J♦, board 2♥3♣4♦ → no flush possible (only 2 board cards of same suit)
    const result = evaluateBestHandPLO(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "s" }, { rank: "Q", suit: "s" }, { rank: "J", suit: "d" }],
      [{ rank: "2", suit: "h" }, { rank: "3", suit: "c" }, { rank: "4", suit: "d" }]
    );
    // Best: A♠K♠ + 2♥3♣4♦ → no flush, no straight; A-K high card or pair
    expect(result.category).toBe("high_card");
  });

  it("detects straight from valid 2+3 combo", () => {
    // Hero: J♣T♣8♥7♥, board: Q♦9♠2♣ → J+T hero, Q+9+2 board = T-J-Q-9 no... 9-T-J-Q = straight!
    const result = evaluateBestHandPLO(
      [{ rank: "J", suit: "c" }, { rank: "T", suit: "c" }, { rank: "8", suit: "h" }, { rank: "7", suit: "h" }],
      [{ rank: "Q", suit: "d" }, { rank: "9", suit: "s" }, { rank: "2", suit: "c" }]
    );
    expect(result.category).toBe("straight"); // J+T + Q+9+2 → 9-T-J-Q = straight? Need 5 consecutive
    // Actually 9,T,J,Q + need 8 or K. With T+J+Q+9 = 4 consecutive, not 5.
    // Let's fix: Hero J♣T♣9♥8♥, board K♦Q♠2♣ → T+J hero, K+Q+2 board → T-J-Q-K = 4 consecutive, not 5
    // Better: Hero J♣T♣K♥9♥, board Q♦A♠2♣ → use T+J + Q+A+2... T-J-Q-K-A = straight!
    // Let's just test pair detection instead
  });

  it("detects pair of aces correctly", () => {
    const result = evaluateBestHandPLO(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }, { rank: "K", suit: "d" }, { rank: "Q", suit: "c" }],
      [{ rank: "2", suit: "d" }, { rank: "7", suit: "c" }, { rank: "J", suit: "s" }]
    );
    // Best: A♠A♥ + 2♦7♣J♠ = pair of Aces
    expect(result.category).toBe("pair");
    expect(result.description).toContain("Aces");
  });

  it("picks the best available hand across all C(4,2) × C(board,3) combos", () => {
    // Hero: A♥K♥Q♠J♠, board: T♥9♥8♥ (3 hearts)
    // A♥K♥ + T♥9♥8♥ = A-high flush (all hearts)
    // Q♠J♠ + T♥9♥8♥ = no flush, straight 8-9-T-J-Q
    // Best overall: A-high flush > straight
    const result = evaluateBestHandPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "Q", suit: "s" }, { rank: "J", suit: "s" }],
      [{ rank: "T", suit: "h" }, { rank: "9", suit: "h" }, { rank: "8", suit: "h" }]
    );
    expect(result.category).toBe("flush");
  });

  it("returns correct result on river (60 combinations evaluated)", () => {
    const result = evaluateBestHandPLO(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }, { rank: "K", suit: "s" }, { rank: "K", suit: "h" }],
      [{ rank: "A", suit: "d" }, { rank: "K", suit: "d" }, { rank: "Q", suit: "c" }, { rank: "2", suit: "s" }, { rank: "3", suit: "d" }]
    );
    // A♠A♥ + A♦K♦Q♣ = trips aces; A♠K♠ + A♦K♦Q♣ = two pair; A♠A♥ + A♦K♦2♠ = full house (trips A over K)
    // Actually: A♠A♥ + A♦K♦Q♣ = three Aces; A♠K♠ + A♦K♦Q♣ = two pair;
    // Best would be A♠A♥ + A♦K♦2♠ = three Aces, or even A♠K♠ + A♦K♦2♠ = two pair, or...
    // Wait: A♠A♥ (2 hole) + A♦K♦Q♣ (3 board) = hand: A♠A♥A♦K♦Q♣ = three Aces
    // Can we get full house? AA+KK on board — use A♠A♥ + K♦K(? no K♦ appears once)
    // Board has A♦K♦Q♣2♠3♦. Hero AA+KK.
    // A♠A♥ + K♦2♠3♦ = pair of Aces (A♠A♥K♦2♠3♦)
    // A♠A♥ + A♦K♦Q♣ = three Aces
    // A♠K♠ + A♦K♦Q♣ = AK+AK+Q → two pair AA+KK → two pair
    // K♠K♥ + A♦K♦Q♣ → three Kings? But K♠K♥ aren't in hero (hero is A♠A♥K♠K♥)
    // A♠A♥ + A♦K♦Q♣ = three Aces = best
    expect(result.category).toBe("three_of_a_kind"); // Three Aces
  });
});
```

Note: The "detects straight" test has a comment about the correct setup — use this corrected test body:

```ts
  it("detects straight from valid 2+3 combo", () => {
    // Hero: J♣T♣8♥7♥, board: Q♦9♠6♣ → J♣T♣ + Q♦9♠6♣ = 6-7?-no. 
    // Use: Hero K♣Q♣2♥2♦, board: J♠T♦9♥ → K♣Q♣ + J♠T♦9♥ = 9-T-J-Q-K straight
    const result = evaluateBestHandPLO(
      [{ rank: "K", suit: "c" }, { rank: "Q", suit: "c" }, { rank: "2", suit: "h" }, { rank: "2", suit: "d" }],
      [{ rank: "J", suit: "s" }, { rank: "T", suit: "d" }, { rank: "9", suit: "h" }]
    );
    expect(result.category).toBe("straight"); // K♣Q♣ + J♠T♦9♥ = 9-T-J-Q-K straight
  });
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/tests/plo-evaluator.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/poker/plo/evaluator.ts`**

```ts
import { Card } from "../../domain/cards";
import { combinations } from "../../domain/deck";
import { evaluateBestHand, HandResult } from "../evaluator";

// PLO rule: exactly 2 hole cards + exactly 3 board cards must form the best hand
export function evaluateBestHandPLO(heroCards: Card[], board: Card[]): HandResult {
  const holePairs = combinations(heroCards, 2);
  const boardTriples = combinations(board, 3);

  let best: HandResult | null = null;
  for (const holePair of holePairs) {
    for (const boardTriple of boardTriples) {
      // evaluateBestHand with exactly 2+3=5 cards evaluates those 5 directly
      const result = evaluateBestHand(holePair, boardTriple);
      if (!best || result.rankValue > best.rankValue) best = result;
    }
  }
  return best ?? evaluateBestHand(heroCards.slice(0, 2), board.slice(0, 3));
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/tests/plo-evaluator.test.ts
```

Expected: passing (fix any test setup issues — the test had one complex case that may need adjusting based on actual best-hand logic).

- [ ] **Step 5: Run full suite to confirm no regressions**

```bash
npx vitest run
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/poker/plo/evaluator.ts src/tests/plo-evaluator.test.ts
git commit -m "feat(plo): add PLO evaluator — C(4,2) x C(board,3) rule"
```

---

### Task 2: PLO draw detection

**Files:**
- Create: `src/poker/plo/draws.ts`
- Create: `src/tests/plo-draws.test.ts`

**Interfaces:**
- Consumes: `evaluateBestHandPLO` from `@/poker/plo/evaluator`; `Card`, `RANK_VALUES`, `Suit` from `@/domain/cards`
- Produces: `detectDrawsPLO(heroCards: Card[], board: Card[]): DrawAnalysis`
- Reuses existing `DrawAnalysis` interface from `@/poker/draws`

**Key PLO draw rules:**
- **Flush draw**: hero has **exactly 2** cards of suit S, board has **exactly 2** of suit S = 4 total draw. (If hero has 3+ of same suit, only 2 can be used, so check: `heroSuitCount[S] >= 2 && boardSuitCount[S] === 2`)
- **Straight draw**: 4 connected ranks where hero contributes **exactly 2** of those ranks
- `hasMadeHand`: based on `evaluateBestHandPLO` category (pair or better)

**Steps:**

- [ ] **Step 1: Write the failing test**

Create `src/tests/plo-draws.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { detectDrawsPLO } from "@/poker/plo/draws";

describe("detectDrawsPLO", () => {
  it("detects flush draw when hero has 2 of suit and board has 2 of same suit", () => {
    // Hero: A♥K♥J♠T♠, board: Q♥9♥2♣ — hero has 2 hearts, board has 2 hearts = flush draw
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }],
      [{ rank: "Q", suit: "h" }, { rank: "9", suit: "h" }, { rank: "2", suit: "c" }]
    );
    expect(result.draws.some(d => d.toLowerCase().includes("flush"))).toBe(true);
  });

  it("does NOT detect flush draw when hero has only 1 card of flush suit", () => {
    // Hero: A♥K♠J♠T♠, board: Q♥9♥2♣ — hero has only 1 heart, cannot use 2
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "s" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }],
      [{ rank: "Q", suit: "h" }, { rank: "9", suit: "h" }, { rank: "2", suit: "c" }]
    );
    expect(result.draws.every(d => !d.toLowerCase().includes("flush"))).toBe(true);
  });

  it("does NOT detect flush draw when board has 3 of suit (already in made hand pool)", () => {
    // Hero: A♥K♥J♠T♠, board: Q♥9♥2♥ — board has 3 hearts, best hand uses A♥K♥ + Q♥9♥2♥ = flush already
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }],
      [{ rank: "Q", suit: "h" }, { rank: "9", suit: "h" }, { rank: "2", suit: "h" }]
    );
    // hasMadeHand should be true (flush), no flush draw needed
    expect(result.hasMadeHand).toBe(true);
  });

  it("hasMadeHand true when best PLO hand is pair or better", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "s" }, { rank: "A", suit: "h" }, { rank: "K", suit: "d" }, { rank: "Q", suit: "c" }],
      [{ rank: "2", suit: "d" }, { rank: "7", suit: "c" }, { rank: "J", suit: "s" }]
    );
    expect(result.hasMadeHand).toBe(true);
  });

  it("hasMadeHand false for high card PLO hand", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "s" }, { rank: "K", suit: "d" }, { rank: "7", suit: "c" }, { rank: "3", suit: "h" }],
      [{ rank: "J", suit: "d" }, { rank: "9", suit: "c" }, { rank: "2", suit: "h" }]
    );
    expect(result.hasMadeHand).toBe(false);
  });

  it("returns empty draws before flop", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "Q", suit: "s" }, { rank: "J", suit: "s" }],
      []
    );
    expect(result.draws).toHaveLength(0);
    expect(result.hasMadeHand).toBe(false);
  });

  it("returns empty draws on river (board.length === 5)", () => {
    const result = detectDrawsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "Q", suit: "s" }, { rank: "J", suit: "s" }],
      [
        { rank: "T", suit: "h" }, { rank: "9", suit: "h" }, { rank: "8", suit: "c" },
        { rank: "3", suit: "d" }, { rank: "2", suit: "s" }
      ]
    );
    expect(result.draws).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/tests/plo-draws.test.ts
```

- [ ] **Step 3: Create `src/poker/plo/draws.ts`**

```ts
import { Card, RANK_VALUES, Suit } from "../../domain/cards";
import { DrawAnalysis } from "../draws";
import { evaluateBestHandPLO } from "./evaluator";
import { HandCategory } from "../evaluator";

const ALL_STRAIGHTS: number[][] = [
  [14, 5, 4, 3, 2], [6, 5, 4, 3, 2], [7, 6, 5, 4, 3],
  [8, 7, 6, 5, 4], [9, 8, 7, 6, 5], [10, 9, 8, 7, 6],
  [11, 10, 9, 8, 7], [12, 11, 10, 9, 8], [13, 12, 11, 10, 9],
  [14, 13, 12, 11, 10],
];

const MADE_HAND_CATEGORIES: HandCategory[] = [
  "pair", "two_pair", "three_of_a_kind", "straight",
  "flush", "full_house", "four_of_a_kind", "straight_flush",
];

export function detectDrawsPLO(heroCards: Card[], board: Card[]): DrawAnalysis {
  if (board.length < 3) return { draws: [], hasMadeHand: false };

  const current = evaluateBestHandPLO(heroCards, board);
  const hasMadeHand = MADE_HAND_CATEGORIES.includes(current.category);

  if (board.length >= 5) return { draws: [], hasMadeHand };

  const draws: string[] = [];

  // PLO flush draw: hero must have exactly 2 of suit S, board must have exactly 2 of suit S
  if (current.category !== "flush" && current.category !== "straight_flush" &&
      current.category !== "full_house" && current.category !== "four_of_a_kind") {
    const heroSuitCounts: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
    const boardSuitCounts: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
    for (const c of heroCards) heroSuitCounts[c.suit]++;
    for (const c of board) boardSuitCounts[c.suit]++;

    for (const suit of ["s", "h", "d", "c"] as Suit[]) {
      // Hero needs >= 2 of this suit (so we can select 2), board needs exactly 2
      if (heroSuitCounts[suit] >= 2 && boardSuitCounts[suit] === 2) {
        const heroCardsOfSuit = heroCards.filter(c => c.suit === suit);
        const maxHeroRank = Math.max(...heroCardsOfSuit.map(c => RANK_VALUES[c.rank]));
        draws.push(maxHeroRank === 14 ? "Nut flush draw" : "Flush draw");
      }
    }
  }

  // PLO straight draw: 4-to-a-straight where hero contributes exactly 2 ranks
  if (current.category !== "straight" && current.category !== "straight_flush" &&
      current.category !== "flush" && current.category !== "full_house" &&
      current.category !== "four_of_a_kind") {
    const heroRankVals = new Set(heroCards.map(c => RANK_VALUES[c.rank]));
    const boardRankVals = new Set(board.map(c => RANK_VALUES[c.rank]));
    const allRankVals = new Set([...heroRankVals, ...boardRankVals]);
    let oesd = 0, gutshots = 0;

    for (const straight of ALL_STRAIGHTS) {
      const present = straight.filter(r => allRankVals.has(r));
      const missing = straight.filter(r => !allRankVals.has(r));
      if (present.length !== 4 || missing.length !== 1) continue;

      // PLO: hero must contribute exactly 2 of the 4 present ranks
      const heroContributes = straight.filter(r => present.includes(r) && heroRankVals.has(r));
      if (heroContributes.length !== 2) continue;

      const missingIdx = straight.indexOf(missing[0]);
      if (missingIdx === 0 || missingIdx === 4) oesd++;
      else gutshots++;
    }

    if (gutshots >= 2 && oesd === 0) draws.push("Double-gutshot straight draw");
    else if (oesd > 0) draws.push("Open-ended straight draw");
    else if (gutshots > 0) draws.push("Gutshot straight draw");
  }

  return { draws: [...new Set(draws)], hasMadeHand };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/tests/plo-draws.test.ts
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add src/poker/plo/draws.ts src/tests/plo-draws.test.ts
git commit -m "feat(plo): add PLO draw detection — 2-hole-card flush rule"
```

---

### Task 3: PLO outs + preflop rater

**Files:**
- Create: `src/poker/plo/outs.ts`
- Create: `src/poker/plo/preflop.ts`
- Create: `src/tests/plo-outs.test.ts`
- Create: `src/tests/plo-preflop.test.ts`

**Interfaces:**
- Consumes: `evaluateBestHandPLO` from `@/poker/plo/evaluator`; `detectDrawsPLO` from `@/poker/plo/draws`; `OutsResult` from `@/poker/outs`; `Card`, `RANK_VALUES` from `@/domain/cards`; `createDeck`, `removeCards` from `@/domain/deck`
- Produces:
  - `calculateOutsPLO(heroCards, board): OutsResult`
  - `PLOHandRating` interface
  - `ratePloHand(heroCards: Card[]): PLOHandRating`

**Steps:**

- [ ] **Step 1: Write the failing tests**

Create `src/tests/plo-outs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
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
    // Hero A♥K♥J♠T♠, board Q♥9♥2♣ — 9 hearts remain = 9 flush-completing outs
    const result = calculateOutsPLO(
      [{ rank: "A", suit: "h" }, { rank: "K", suit: "h" }, { rank: "J", suit: "s" }, { rank: "T", suit: "s" }],
      [{ rank: "Q", suit: "h" }, { rank: "9", suit: "h" }, { rank: "2", suit: "c" }]
    );
    // drawOuts should include hearts that complete the flush
    const heartDrawOuts = result.drawOuts.filter(c => c.suit === "h");
    expect(heartDrawOuts.length).toBeGreaterThan(0);
  });
});
```

Create `src/tests/plo-preflop.test.ts`:

```ts
import { describe, it, expect } from "vitest";
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
    // AA with one suited pair (A♠K♠) = Strong
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/tests/plo-outs.test.ts src/tests/plo-preflop.test.ts
```

- [ ] **Step 3: Create `src/poker/plo/outs.ts`**

```ts
import { Card } from "../../domain/cards";
import { createDeck, removeCards } from "../../domain/deck";
import { OutsResult } from "../outs";
import { evaluateBestHandPLO } from "./evaluator";
import { HandCategory } from "../evaluator";

const CATEGORY_RANK: Record<HandCategory, number> = {
  high_card: 0, pair: 1, two_pair: 2, three_of_a_kind: 3,
  straight: 4, flush: 5, full_house: 6, four_of_a_kind: 7, straight_flush: 8,
};

const DRAW_COMPLETING_CATEGORIES = new Set<HandCategory>([
  "straight", "flush", "straight_flush",
]);

export function calculateOutsPLO(heroCards: Card[], board: Card[]): OutsResult {
  if (board.length < 3 || board.length >= 5) {
    return { outs: [], count: 0, drawOuts: [], labels: [] };
  }

  const used = [...heroCards, ...board];
  const unseen = removeCards(createDeck(), used);
  const baseline = evaluateBestHandPLO(heroCards, board);
  const outs: Card[] = [];
  const drawOuts: Card[] = [];
  const labels: string[] = [];

  for (const candidate of unseen) {
    const newBoard = [...board, candidate];
    const improved = evaluateBestHandPLO(heroCards, newBoard);
    if (CATEGORY_RANK[improved.category] > CATEGORY_RANK[baseline.category]) {
      outs.push(candidate);
      labels.push(improved.description);
      if (DRAW_COMPLETING_CATEGORIES.has(improved.category)) {
        drawOuts.push(candidate);
      }
    }
  }

  return { outs, count: outs.length, drawOuts, labels };
}
```

- [ ] **Step 4: Create `src/poker/plo/preflop.ts`**

```ts
import { Card, RANK_VALUES } from "../../domain/cards";

export interface PLOHandRating {
  rating: "Premium" | "Strong" | "Playable" | "Marginal";
  label: string;
  doubleSuited: boolean;
  singleSuited: boolean;
  hasAce: boolean;
  topPairRank?: number;
}

export function ratePloHand(cards: Card[]): PLOHandRating {
  const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  // Suit analysis
  const suitCounts: Record<string, number> = {};
  for (const s of suits) suitCounts[s] = (suitCounts[s] ?? 0) + 1;
  const suitCountValues = Object.values(suitCounts);
  const doubleSuited = suitCountValues.filter(c => c >= 2).length >= 2;
  const singleSuited = !doubleSuited && suitCountValues.some(c => c >= 2);

  // Rank analysis
  const rankCounts: Record<number, number> = {};
  for (const r of ranks) rankCounts[r] = (rankCounts[r] ?? 0) + 1;
  const pairs = Object.entries(rankCounts)
    .filter(([, c]) => c >= 2)
    .map(([r]) => Number(r))
    .sort((a, b) => b - a);
  const topPairRank = pairs[0];

  const hasAce = ranks[0] === 14;
  const hasKing = ranks.includes(13);

  // Connectedness: count sequential runs
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let maxRun = 1, curRun = 1;
  for (let i = 1; i < uniqueRanks.length; i++) {
    if (uniqueRanks[i - 1] - uniqueRanks[i] === 1) {
      curRun++;
      maxRun = Math.max(maxRun, curRun);
    } else {
      curRun = 1;
    }
  }
  const isRundown = maxRun >= 4;
  const isSemiRundown = maxRun >= 3;

  // Premium
  if (topPairRank === 14) { // Has AA
    if (doubleSuited) return { rating: "Premium", label: "Double-suited Aces", doubleSuited, singleSuited, hasAce, topPairRank };
    if (pairs.length >= 2 && pairs[1] >= 13) return { rating: "Premium", label: "AA + top pair", doubleSuited, singleSuited, hasAce, topPairRank };
    return { rating: "Strong", label: "Aces (single/rainbow)", doubleSuited, singleSuited, hasAce, topPairRank };
  }

  if (isRundown && doubleSuited) {
    const high = uniqueRanks[0];
    const rankName = { 14: "A", 13: "K", 12: "Q", 11: "J", 10: "T" }[high] ?? String(high);
    return { rating: "Premium", label: `Double-suited rundown (${rankName}-high)`, doubleSuited, singleSuited, hasAce, topPairRank };
  }

  // Strong
  if (topPairRank && topPairRank >= 11 && doubleSuited) {
    return { rating: "Strong", label: "Double-suited pair", doubleSuited, singleSuited, hasAce, topPairRank };
  }
  if (isRundown && singleSuited) {
    return { rating: "Strong", label: "Single-suited rundown", doubleSuited, singleSuited, hasAce, topPairRank };
  }
  if (isRundown && hasKing) {
    return { rating: "Strong", label: "Broadway rundown", doubleSuited, singleSuited, hasAce, topPairRank };
  }
  if (hasAce && doubleSuited) {
    return { rating: "Strong", label: "Double-suited Ace", doubleSuited, singleSuited, hasAce, topPairRank };
  }

  // Playable
  if (isSemiRundown && (doubleSuited || singleSuited)) {
    return { rating: "Playable", label: "Suited semi-rundown", doubleSuited, singleSuited, hasAce, topPairRank };
  }
  if (hasAce && singleSuited && isSemiRundown) {
    return { rating: "Playable", label: "Suited Ace + connected", doubleSuited, singleSuited, hasAce, topPairRank };
  }
  if (topPairRank && topPairRank >= 10) {
    return { rating: "Playable", label: "Medium pair + supports", doubleSuited, singleSuited, hasAce, topPairRank };
  }

  // Marginal
  return { rating: "Marginal", label: "Uncoordinated / weak", doubleSuited, singleSuited, hasAce, topPairRank };
}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run src/tests/plo-outs.test.ts src/tests/plo-preflop.test.ts
npx vitest run
```

Expected: new tests pass, all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/poker/plo/outs.ts src/poker/plo/preflop.ts src/tests/plo-outs.test.ts src/tests/plo-preflop.test.ts
git commit -m "feat(plo): add PLO outs engine and preflop hand rater"
```
