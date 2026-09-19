# Poker Odds Companion — Design Document

**Date:** 2026-09-19  
**Specs:** `poker_odds_companion_v1.md`, `poker_modern_strategy_module.md`  
**Approach:** A — Single-page Next.js app, client-side only

---

## 1. Architecture

A single Next.js 15 (App Router) application that runs entirely in the browser. There is no server component involved in poker calculations — all math executes client-side so results appear within the 100 ms target on any local machine.

The hand state lives in a Zustand store. Street progression (pre-flop → flop → turn → river) is driven by conditional rendering within the single `/` route — no navigation required. The poker engine (`src/poker/`) and strategy engine (`src/strategy/`) are pure TypeScript modules with no UI dependencies. UI components read the store and call engine functions on each state change.

**Tech stack:**
- Next.js 15 (App Router, TypeScript)
- Tailwind CSS v4 (dark HUD theme)
- Zustand (hand + UI state)
- Vitest (unit tests for all poker math)

---

## 2. File Structure

```
src/
  domain/
    cards.ts          Rank, Suit, Card types; card display helpers
    deck.ts           createDeck(), removeCards(deck, used)
    hand.ts           PokerHand, GameMode, Street types

  poker/
    evaluator.ts      HandResult (9-category evaluator, pure)
    draws.ts          DrawAnalysis (flush/straight/overcard draws)
    outs.ts           OutsResult (unseen-card enumeration, unique outs)
    probability.ts    exact next-card %, two-card runout %
    potOdds.ts        PotOddsResult (pot odds ratio, required equity)
    impliedOdds.ts    ImpliedOddsResult (future winnings required)
    decisionEngine.ts DecisionResult (CALL / FOLD / CLOSE / RANGE_REQUIRED)

  strategy/
    boardTexture.ts   BoardAnalysis (paired, monotone, connectedness, dynamism)
    rangeContext.ts   Position, PreFlopContext, PotType types
    rangeAdvantage.ts rangeAdvantage(context, board) → HERO | VILLAIN | NEUTRAL
    nutAdvantage.ts   nutAdvantage(context, board) → HERO | VILLAIN | NEUTRAL
    flopStrategy.ts   StrategyResult for flop
    turnStrategy.ts   StrategyResult for turn
    riverStrategy.ts  StrategyResult for river
    betSizing.ts      suggestBetSizes(pot, style) → number[]

  state/
    handStore.ts      Zustand store — PokerHand + preflop context + UI state

  components/
    CardPicker.tsx    52-card grid (4 suits × 13 ranks), one-tap selection
    Board.tsx         Hero cards + community cards display
    MoneyInput.tsx    Pot / call / stack numeric inputs (R prefix)
    DecisionResult.tsx Traffic-light + required equity + margin + outs
    DrawSummary.tsx   Draw list + unique outs count
    StackSummary.tsx  Effective stack, SPR
    StrategyPanel.tsx Board texture + range advantage + bet sizing
    BetSizeButtons.tsx ¼ ⅓ ½ ⅔ ¾ POT overbet preset buttons

  app/
    page.tsx          Main HUD layout — single route
    layout.tsx        Dark theme, font, metadata
    globals.css       Tailwind base + HUD CSS variables

  tests/
    evaluator.test.ts
    draws.test.ts
    outs.test.ts
    probability.test.ts
    potOdds.test.ts
    decisionEngine.test.ts
    boardTexture.test.ts
```

---

## 3. Domain Types

```ts
type Rank = "2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"T"|"J"|"Q"|"K"|"A";
type Suit = "s"|"h"|"d"|"c";
interface Card { rank: Rank; suit: Suit; }

type GameMode = "cash" | "tournament";
type Street   = "preflop" | "flop" | "turn" | "river";

interface PokerHand {
  gameMode:      GameMode;
  heroCards:     Card[];    // max 2
  board:         Card[];    // max 5
  street:        Street;
  pot:           number;
  amountToCall:  number;
  heroStack?:    number;
  villainStack?: number;
  isAllIn:       boolean;
}

type Position = "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB";
type PotType  = "srp" | "3bet" | "4bet";

interface PreFlopContext {
  heroPosition?:     Position;
  villainPosition?:  Position;
  preflopAggressor?: "hero" | "villain";
  potType?:          PotType;
  numPlayers:        number; // 2–6, default 2
}
```

---

## 4. Poker Engine Contracts

All functions are pure — no side effects, no global state.

### evaluator.ts
```ts
type HandCategory =
  | "high_card" | "pair" | "two_pair" | "three_of_a_kind"
  | "straight"  | "flush" | "full_house" | "four_of_a_kind"
  | "straight_flush";

interface HandResult {
  category:    HandCategory;
  description: string;   // e.g. "Pair of Aces"
  rankValue:   number;   // for hand comparison
}

function evaluateBestHand(heroCards: Card[], board: Card[]): HandResult
```

### draws.ts
```ts
interface DrawAnalysis {
  draws: string[];       // human labels, e.g. "Nut flush draw"
  hasMadeHand: boolean;  // true → RANGE_REQUIRED candidate
}

function detectDraws(heroCards: Card[], board: Card[]): DrawAnalysis
```

### outs.ts
```ts
interface OutsResult {
  outs:     Card[];   // unique improving cards
  count:    number;
  labels:   string[]; // per-out draw labels (for display)
}

function calculateOuts(heroCards: Card[], board: Card[]): OutsResult
```

### probability.ts
```ts
function nextCardProbability(outs: number, street: "flop" | "turn"): number
// flop: outs/47, turn: outs/46

function runoutProbability(outs: number): number
// 1 - ((47-outs)/47) * ((46-outs)/46)  [stable outs approximation]

function enumeratedRunoutProbability(heroCards: Card[], board: Card[]): number
// full turn×river enumeration for accuracy
```

### potOdds.ts
```ts
interface PotOddsResult {
  ratio:          number;  // pot / call
  requiredEquity: number;  // call / (pot + call)
}

function calculatePotOdds(pot: number, call: number): PotOddsResult
```

### impliedOdds.ts
```ts
interface ImpliedOddsResult {
  futureWinningsRequired: number;
  effectiveStackAvailable?: number;
  possible: boolean;
}

function calculateImpliedOdds(
  pot: number,
  call: number,
  probability: number,
  effectiveStack?: number
): ImpliedOddsResult
```

### decisionEngine.ts
```ts
type DecisionSignal = "CALL" | "FOLD" | "CLOSE" | "RANGE_REQUIRED";

interface DecisionResult {
  signal:                DecisionSignal;
  requiredEquity:        number;
  comparisonProbability?: number;
  margin?:               number;
  reason:                string;
  impliedOdds?:          ImpliedOddsResult;
}

function calculateDecision(
  hand:         PokerHand,
  drawAnalysis: DrawAnalysis,
  outsResult:   OutsResult
): DecisionResult
```

**Decision rules:**
- `hasMadeHand && outsResult.count < 3` → `RANGE_REQUIRED`
- `margin >= +0.02` → `CALL`
- `margin <= -0.02` → `FOLD`
- otherwise → `CLOSE`

---

## 5. Strategy Engine Contracts

```ts
// boardTexture.ts
interface BoardAnalysis {
  paired:           boolean;
  monotone:         boolean;
  twoTone:          boolean;
  rainbow:          boolean;
  connectedness:    "LOW" | "MEDIUM" | "HIGH";
  straightPotential: "LOW" | "MEDIUM" | "HIGH";
  flushPotential:   "LOW" | "MEDIUM" | "HIGH";
  dynamism:         "STATIC" | "SEMI_DYNAMIC" | "DYNAMIC" | "VERY_DYNAMIC";
  labels:           string[]; // human-readable, e.g. ["Dry", "Rainbow"]
}

function analyzeBoardTexture(board: Card[]): BoardAnalysis

// rangeAdvantage.ts / nutAdvantage.ts
type Advantage = "HERO" | "VILLAIN" | "NEUTRAL";

function estimateRangeAdvantage(context: PreFlopContext, board: BoardAnalysis): Advantage
function estimateNutAdvantage(context: PreFlopContext, board: BoardAnalysis): Advantage

// flopStrategy.ts (and turn/river equivalents)
type StrategyStyle =
  | "SMALL_FREQUENT" | "MIXED" | "CHECK_MORE"
  | "POLARIZED" | "OVERBET_CANDIDATE" | "INSUFFICIENT_CONTEXT";

type StrategyConfidence = "LOW" | "MEDIUM" | "HIGH";

interface StrategyResult {
  boardTexture:    string[];
  rangeAdvantage:  Advantage;
  nutAdvantage:    Advantage;
  style:           StrategyStyle;
  suggestedBetSizes: number[];  // as pot fractions, e.g. [0.33, 0.5]
  confidence:      StrategyConfidence;
  explanation:     string;
}

function getFlopStrategy(
  context: PreFlopContext,
  board:   BoardAnalysis,
  spr:     number
): StrategyResult
```

---

## 6. Zustand Store

```ts
interface HandStore extends PokerHand, PreFlopContext {
  // selection state
  activeSlot: "hero1" | "hero2" | "flop1" | "flop2" | "flop3" | "turn" | "river" | null;

  // actions
  selectCard:      (card: Card) => void;
  setActiveSlot:   (slot: HandStore["activeSlot"]) => void;
  setPot:          (v: number) => void;
  setAmountToCall: (v: number) => void;
  setHeroStack:    (v: number | undefined) => void;
  setVillainStack: (v: number | undefined) => void;
  setIsAllIn:      (v: boolean) => void;
  setGameMode:     (mode: GameMode) => void;
  setHeroPosition: (p: Position | undefined) => void;
  setVillainPosition: (p: Position | undefined) => void;
  setPreflopAggressor: (a: "hero" | "villain" | undefined) => void;
  setPotType:      (t: PotType | undefined) => void;
  newHand:         () => void;  // resets cards/pot/call, retains mode/stacks/positions
}
```

All used cards (heroCards ∪ board) are tracked to prevent duplicate selection.

---

## 7. Card Picker UI

- **Layout:** 4 rows (suits: ♠ ♥ ♦ ♣) × 13 columns (ranks: A K Q J T 9 8 7 6 5 4 3 2)
- Each card is a compact button (~44px touch target)
- Suit colors: ♠ ♣ = white; ♥ ♦ = red (#EF4444)
- Selected/used cards: opacity-30, pointer-events-none
- Active slot is shown above the grid; tapping a card assigns it there
- After assignment, slot advances to the next empty slot automatically

---

## 8. Main Layout (page.tsx)

Single-column layout optimized for portrait desktop/tablet:

```
┌─────────────────────────┐
│ [CASH / TOURNAMENT]  NEW HAND │
│                              │
│ YOUR HAND     BOARD          │
│ [?] [?]   [?][?][?][?][?]   │
│                              │
│ Card Picker (52-grid)        │
│                              │
│ POT   R[___]                 │
│ CALL  R[___]                 │
│ ALL-IN [ ]                   │
│                              │
│ ──── DECISION ────           │
│ 🟢 CALL (or FOLD/CLOSE/⚪)  │
│ Required equity   16.7%      │
│ Draw probability  25.5%      │
│ Margin           +8.8%       │
│                              │
│ Flush draw · Gutshot         │
│ 12 unique outs               │
│                              │
│ Effective stack  R 3,400     │
│ SPR              3.4         │
│                              │
│ ──── STRATEGY ────           │
│ Board: Dry / Rainbow         │
│ Range: Hero                  │
│ Style: Small / Frequent      │
│ Size:  25–33%                │
│ Confidence: HIGH             │
└─────────────────────────┘
```

Strategy panel is collapsible on smaller screens.

---

## 9. Decision Signal Rules

| Condition | Signal |
|---|---|
| `hasMadeHand && outs < 3` | `RANGE_REQUIRED` |
| `margin >= +2pp` | `CALL` |
| `margin <= -2pp` | `FOLD` |
| `-2pp < margin < +2pp` | `CLOSE` |

For normal (non-all-in) street: `comparisonProbability = nextCardProbability`  
For all-in: `comparisonProbability = enumeratedRunoutProbability`  
`margin = comparisonProbability − requiredEquity`

---

## 10. Currency

All monetary displays use the `R` prefix (ZAR).  
Example: `R 3,400` — space between prefix and number, commas for thousands.

---

## 11. Testing Requirements (Vitest)

Minimum tests per spec section 31:

| Test | Expected |
|---|---|
| `calculatePotOdds(1000, 200)` | `ratio = 5`, `requiredEquity ≈ 0.1667` |
| Flush draw (A♥ 8♥ / K♥ 7♥ 2♣) | 9 outs, `nextCardProbability ≈ 0.1915` |
| Combo out (straight + flush on same card) | counted once |
| Duplicate card (A♠ in hero and board) | throws or returns invalid |
| All-in runout uses both turn + river | `enumeratedRunoutProbability` called |
| `evaluateBestHand` — all 9 categories | correct category returned |
| `analyzeBoardTexture` — dry vs dynamic | correct dynamism label |

---

## 12. Strategy Heuristics (V1)

Range advantage is estimated from preflop position + board:

| Aggressor | Board | Range Advantage |
|---|---|---|
| BTN / CO vs BB | Dry (A72r, K82r) | HERO |
| BTN / CO vs BB | Very Dynamic (986ss, T9Xss) | NEUTRAL / VILLAIN |
| SB / BB 3-bet | Any | HERO (capped by position) |
| Unknown position | Any | NEUTRAL (LOW confidence) |

Nut advantage follows similar rules. Multiway pots (numPlayers > 2) always produce LOW confidence.

---

## 13. Important Limitations (V1)

- **RANGE_REQUIRED** is returned for made hands with few outs — the app does not claim to know showdown equity without an opponent range.
- **Tournament mode** uses Chip EV only — no ICM, bubble factor, or $EV.
- **Strategy module** is heuristic, not solver-derived. Outputs use the label "Modern baseline" not "GTO".
- **Multiway pots** produce LOW confidence strategy output.

---

## 14. Acceptance Criteria

All items from spec sections 35 (V1) and 37 (Strategy Module) must pass.

Key observable gates:
- Duplicate card selection is blocked
- Pot = 1000, Call = 200 → Required equity = 16.7%
- Flush draw hand → outs = 9, probability ≈ 19.1%
- Made hand with top pair → RANGE_REQUIRED
- All-in toggle → uses runout probability
- New Hand resets cards/pot/call; retains game mode
- Strategy panel shows board texture, range advantage, suggested size
- All calculations complete in < 100 ms

---

## 15. Out of Scope for V1

- OCR / screen capture
- Opponent range modelling
- ICM / tournament $EV
- GTO solver integration
- Hand history database
- Automated betting / clicks
- Multi-table support
