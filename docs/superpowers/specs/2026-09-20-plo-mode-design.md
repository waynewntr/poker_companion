# PLO Mode — Design Document

**Date:** 2026-09-20  
**Parent spec:** `docs/superpowers/specs/2026-09-19-poker-companion-design.md`

---

## 1. Core Constraint

**Zero deletions to any existing NLHE file.** All PLO logic lives in new files. The only existing files that receive additions (no removals) are `src/state/handStore.ts` and `src/app/page.tsx`.

---

## 2. New Files

```
src/poker/plo/
  evaluator.ts     PLO hand evaluator — C(4,2) × C(board,3) combinations
  draws.ts         PLO draw detection — flush requires 2 suited hole cards
  outs.ts          PLO outs — same enumeration, uses PLO evaluator
  preflop.ts       PLO hand category rater (Premium/Strong/Playable/Fold)

src/components/
  PloBoard.tsx         4-slot hero display (shares CardSlot logic from Board.tsx)
  PloPreflopPanel.tsx  PLO preflop hand rating panel

src/tests/
  plo-evaluator.test.ts
  plo-draws.test.ts
  plo-outs.test.ts
  plo-preflop.test.ts
```

---

## 3. Existing Files — Additions Only

### `src/state/handStore.ts`

Additions:
- `"hero3" | "hero4"` appended to `SlotName` union
- `hero3: null, hero4: null` added to `EMPTY_SLOTS`
- `gameType: "nlhe" | "plo"` field in `HandStore` interface (default `"nlhe"`)
- `setGameType(t: "nlhe" | "plo"): void` action
- New constants `NLHE_SLOT_ORDER` and `PLO_SLOT_ORDER`
- `selectCard` modified to use `get().gameType` when determining slot advance order
- New exported selector `getHeroCardsForMode(slots, gameType): Card[]`
- `newHand` retains `gameType` (same pattern as `gameMode`)

Existing `getHeroCards`, `getBoardCards`, `getAllUsedCards`, `getCurrentStreet` — **untouched**.

### `src/app/page.tsx`

Additions:
- Import PLO engine functions and components
- `gameType` and `setGameType` read from store
- `heroCards` derived via `getHeroCardsForMode(slots, gameType)` instead of `getHeroCards(slots)`
- `NLHE | PLO` tab next to `CASH | TOURNAMENT` toggle
- Conditional rendering: `gameType === "plo"` swaps `<Board />` → `<PloBoard />`, uses PLO evaluator, shows `<PloPreflopPanel />`
- PLO pot-max button in Pot Setup section
- `heroCards.length === 2` guard becomes `heroCards.length === (gameType === "plo" ? 4 : 2)`

---

## 4. PLO Evaluator

**Rule**: exactly 2 cards from hero hand + exactly 3 cards from board = 5 cards evaluated.

```ts
// src/poker/plo/evaluator.ts
import { evaluateBestHand } from "@/poker/evaluator"; // NLHE evaluator reused for 5-card eval
import { combinations } from "@/domain/deck";

export function evaluateBestHandPLO(heroCards: Card[], board: Card[]): HandResult {
  // heroCards must have exactly 4; board must have 3-5
  const holePairs = combinations(heroCards, 2);
  const boardTriples = combinations(board, 3);
  let best: HandResult | null = null;
  for (const holePair of holePairs) {
    for (const boardTriple of boardTriples) {
      // evaluateBestHand([2 cards], [3 cards]) evaluates exactly those 5 cards
      const result = evaluateBestHand(holePair, boardTriple);
      if (!best || result.rankValue > best.rankValue) best = result;
    }
  }
  return best!;
}
```

Combinations: Flop=6, Turn=24, River=60 — all fast.

---

## 5. PLO Draw Detection

Key differences from NLHE:
- **Flush draw**: hero must have **exactly 2 cards of the same suit** and board must have **exactly 2 of that suit** (total = 4) → flush draw. NOT detected if hero has only 1 card of that suit.
- **Straight draw**: 4-to-a-straight where hero contributes **exactly 2 of the 4 ranks**.

```ts
// Flush draw check: hero has 2 of suit S, board has 2 of suit S
// (not 3 = already a flush, not 1 = can't use 2 hole cards from that suit)
```

`hasMadeHand` based on `evaluateBestHandPLO` category (same categories as NLHE).

---

## 6. PLO Outs

Same algorithm as NLHE `calculateOuts` but calls `evaluateBestHandPLO` instead:

```ts
// src/poker/plo/outs.ts
import { evaluateBestHandPLO } from "./evaluator";
// Enumerate unseen deck, evaluate each with PLO rules
// drawOuts: cards that complete flush/straight (same DRAW_COMPLETING_CATEGORIES)
```

Returns the same `OutsResult` interface — no interface changes needed.

---

## 7. PLO Preflop Rater

Classifies 4-card PLO hand into one of: `"Premium" | "Strong" | "Playable" | "Marginal"`.

Rules (in order, first match wins):

**Premium:**
- Contains AA + at least single-suited + one more connected card (AKxx, AQxx etc.)
- Double-suited (two pairs of matching suits) + 4 connected ranks (rundown)
- AAKK double-suited or better

**Strong:**
- AA without the premium qualifiers
- Double-suited broadways (KQJT ds, AQJT ds, etc.)
- Single-suited rundown KQJT+
- KK or QQ + double-suited

**Playable:**
- Single-suited rundown (JT98s + 2 other)
- Pair JJ+ with connectivity or suited
- Suited ace + 2 connected (A234s type, A567s type)

**Marginal (suggest fold):**
- Disconnected hands with no suit coordination
- Low pairs without supporting cards
- Rainbow disconnected

Output:
```ts
interface PLOHandRating {
  rating: "Premium" | "Strong" | "Playable" | "Marginal";
  label: string;        // e.g. "Double-suited rundown"
  doubleSuited: boolean;
  singleSuited: boolean;
  hasAce: boolean;
  topPairRank?: number; // highest pair rank if hand contains a pair
}
```

---

## 8. PLO Pot-Max Button

PLO max bet formula: `call + pot + 2 × call = pot + 3 × call`

A **"Pot"** button appears in Pot Setup when `gameType === "plo"`:
```
Pot max = pot + 3 × call
```
Clicking it sets `amountToCall` to the pot-max amount.

---

## 9. Tab Design

```
[ NLHE ]  [ PLO ]          CASH  TOURNAMENT     NEW HAND
```

Switching game type calls `setGameType` + `newHand()` automatically.

---

## 10. Acceptance Criteria

- [ ] PLO evaluator correctly enforces 2-from-hole + 3-from-board
- [ ] PLO flush draw only detected when hero has 2 of flush suit
- [ ] PLO outs enumeration works correctly
- [ ] PLO preflop rater classifies known hands correctly (AA = Premium, 7632r = Marginal)
- [ ] Switching to PLO shows 4 hero card slots
- [ ] Switching back to NLHE shows 2 hero card slots
- [ ] Existing NLHE tests still pass (zero regressions)
- [ ] All PLO engine tests pass
- [ ] Pot-max button computes correct PLO pot size
- [ ] NLHE code is unchanged (no deletions, no logic changes)
