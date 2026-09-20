# PLO Mode — Phase 2: Store + UI + Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `gameType` and PLO slots to the store, create PLO UI components, and wire everything into a tab-switched main HUD.

**Architecture:** Phase 1 PLO engine is complete. This phase adds minimal store extensions and new UI components. The NLHE path in page.tsx is unchanged — only conditional rendering is added.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v3, Zustand

**Spec:** `docs/superpowers/specs/2026-09-20-plo-mode-design.md`

## Global Constraints

- **Zero deletions or logic changes to existing NLHE files**
- Only additions to `src/state/handStore.ts` (new fields, no changes to existing functions)
- `getHeroCards` selector stays **untouched** — new `getHeroCardsForMode` added alongside it
- `gameType` persists across `newHand()` (retained, like `gameMode`)
- Switching game type must call `newHand()` automatically
- PLO hero card guard: `heroCards.length !== 4` (not `!== 2`)
- NLHE hero card guard: `heroCards.length !== 2` (unchanged)
- PLO pot-max formula: `pot + 3 × call`
- `npx tsc --noEmit` must pass
- Working directory: `C:\Users\wayne.winter\Repositories\poker_companion`

---

### Task 4: Store extension

**Files:**
- Modify: `src/state/handStore.ts` (additions only)

**Interfaces:**
- Produces (new exports):
  - `SlotName` extended with `"hero3" | "hero4"`
  - `gameType: "nlhe" | "plo"` in `HandStore`
  - `setGameType(t: "nlhe" | "plo"): void` action
  - `getHeroCardsForMode(slots, gameType): Card[]` selector

**Steps:**

- [ ] **Step 1: Add to `src/state/handStore.ts`**

The existing file has:
```ts
export type SlotName = "hero1" | "hero2" | "flop1" | "flop2" | "flop3" | "turn" | "river";
```

Change ONLY this line to:
```ts
export type SlotName =
  | "hero1" | "hero2" | "hero3" | "hero4"
  | "flop1" | "flop2" | "flop3"
  | "turn" | "river";
```

The existing `SLOT_ORDER` constant:
```ts
const SLOT_ORDER: SlotName[] = ["hero1", "hero2", "flop1", "flop2", "flop3", "turn", "river"];
```

Add two new constants below it (do not modify the original):
```ts
const NLHE_SLOT_ORDER: SlotName[] = ["hero1", "hero2", "flop1", "flop2", "flop3", "turn", "river"];
const PLO_SLOT_ORDER: SlotName[] = ["hero1", "hero2", "hero3", "hero4", "flop1", "flop2", "flop3", "turn", "river"];
```

Add `hero3: null, hero4: null` to `EMPTY_SLOTS`:
```ts
const EMPTY_SLOTS: Record<SlotName, Card | null> = {
  hero1: null, hero2: null, hero3: null, hero4: null,
  flop1: null, flop2: null, flop3: null,
  turn: null, river: null,
};
```

Add to `HandStore` interface (after `numPlayers: number;`):
```ts
gameType: "nlhe" | "plo";
setGameType: (t: "nlhe" | "plo") => void;
```

Add to the `create<HandStore>` implementation initial state (after `numPlayers: 2,`):
```ts
gameType: "nlhe",
```

Add the `setGameType` action (after `setNumPlayers`):
```ts
setGameType: (t) => {
  // Switching game type clears the hand automatically
  const { gameMode, heroStack, villainStack, heroPosition, villainPosition,
          preflopAggressor, potType, numPlayers, villainArchetype } = get();
  set({
    slots: { ...EMPTY_SLOTS },
    pot: 0, amountToCall: 0, isAllIn: false,
    activeSlot: "hero1",
    gameType: t,
    gameMode, heroStack, villainStack,
    heroPosition, villainPosition, preflopAggressor, potType, numPlayers, villainArchetype,
  });
},
```

Modify `selectCard` to use game-type-aware slot order. Find the existing `selectCard` implementation and change the auto-advance logic from using `SLOT_ORDER` to using game-type-aware selection:

```ts
// Inside selectCard, replace the advance logic:
const slotOrder = get().gameType === "plo" ? PLO_SLOT_ORDER : NLHE_SLOT_ORDER;
const currentIdx = slotOrder.indexOf(activeSlot);
let nextSlot: SlotName | null = null;
for (let i = currentIdx + 1; i < slotOrder.length; i++) {
  if (newSlots[slotOrder[i]] === null) {
    nextSlot = slotOrder[i];
    break;
  }
}
```

Update `newHand` to retain `gameType`:
```ts
newHand: () => {
  const { gameMode, heroStack, villainStack, heroPosition, villainPosition,
          preflopAggressor, potType, numPlayers, villainArchetype, gameType } = get();
  set({
    slots: { ...EMPTY_SLOTS },
    pot: 0, amountToCall: 0, isAllIn: false,
    activeSlot: "hero1",
    gameMode, heroStack, villainStack,
    heroPosition, villainPosition, preflopAggressor, potType, numPlayers,
    villainArchetype, gameType,  // retained
  });
},
```

Add new selector at the bottom of the file (after `getSPR`):
```ts
export function getHeroCardsForMode(
  slots: Record<SlotName, Card | null>,
  gameType: "nlhe" | "plo"
): Card[] {
  if (gameType === "plo") {
    return [slots.hero1, slots.hero2, slots.hero3, slots.hero4]
      .filter((c): c is Card => c !== null);
  }
  return [slots.hero1, slots.hero2].filter((c): c is Card => c !== null);
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type issues before continuing.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/state/handStore.ts
git commit -m "feat(plo): extend store with gameType, hero3/hero4 slots, getHeroCardsForMode"
```

---

### Task 5: PLO UI components

**Files:**
- Create: `src/components/PloBoard.tsx`
- Create: `src/components/PloPreflopPanel.tsx`

**Interfaces:**
- Consumes: `useHandStore`, `SlotName`, `getHeroCardsForMode` from `@/state/handStore`; `SUIT_SYMBOLS`, `SUIT_TEXT_CLASS_MAP` from `@/domain/cards`; `ratePloHand`, `PLOHandRating` from `@/poker/plo/preflop`; `handToType` from `@/data/archetypeRanges`

**Steps:**

- [ ] **Step 1: Create `src/components/PloBoard.tsx`**

```tsx
"use client";

import { SUIT_SYMBOLS, SUIT_TEXT_CLASS_MAP } from "@/domain/cards";
import { useHandStore, SlotName } from "@/state/handStore";
import type { Card } from "@/domain/cards";

function CardSlot({ card, slot, active }: { card: Card | null; slot: SlotName; active: boolean }) {
  const setActiveSlot = useHandStore(s => s.setActiveSlot);
  const clearSlot = useHandStore(s => s.clearSlot);

  const suitClass = card ? SUIT_TEXT_CLASS_MAP[card.suit] : "text-gray-600";

  function handleClick() {
    if (card) clearSlot(slot);
    else setActiveSlot(slot);
  }

  return (
    <button
      onClick={handleClick}
      className={[
        "flex flex-col items-center justify-center rounded border w-11 h-14 text-sm font-bold transition-colors",
        active ? "border-blue-500 bg-[#1A1A2F]" : "border-[#2A2A35] bg-[#1A1A1F]",
        suitClass,
      ].join(" ")}
    >
      {card ? (
        <>
          <span>{card.rank}</span>
          <span className="text-xl leading-none">{SUIT_SYMBOLS[card.suit]}</span>
        </>
      ) : (
        <span className="text-gray-600 text-lg">?</span>
      )}
    </button>
  );
}

export default function PloBoard() {
  const slots = useHandStore(s => s.slots);
  const activeSlot = useHandStore(s => s.activeSlot);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Your Hand (PLO — 4 cards)</p>
        <div className="flex gap-2">
          {(["hero1", "hero2", "hero3", "hero4"] as SlotName[]).map(slot => (
            <CardSlot key={slot} card={slots[slot]} slot={slot} active={activeSlot === slot} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Board</p>
        <div className="flex gap-2">
          {(["flop1", "flop2", "flop3", "turn", "river"] as SlotName[]).map(slot => (
            <CardSlot key={slot} card={slots[slot]} slot={slot} active={activeSlot === slot} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/PloPreflopPanel.tsx`**

```tsx
"use client";

import type { Card } from "@/domain/cards";
import { ratePloHand } from "@/poker/plo/preflop";

const RATING_CONFIG = {
  Premium: { emoji: "🟢", class: "text-green-500", action: "OPEN / 3-BET" },
  Strong: { emoji: "🟡", class: "text-yellow-400", action: "OPEN" },
  Playable: { emoji: "🟠", class: "text-amber-400", action: "OPEN (position-dependent)" },
  Marginal: { emoji: "🔴", class: "text-red-500", action: "FOLD" },
};

interface Props {
  heroCards: Card[];
}

export default function PloPreflopPanel({ heroCards }: Props) {
  if (heroCards.length !== 4) {
    return (
      <section className="space-y-3 rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
        <p className="text-xs uppercase tracking-widest text-gray-500">Preflop — PLO</p>
        <p className="text-sm italic text-gray-500">Select all 4 hole cards to see an opening recommendation.</p>
      </section>
    );
  }

  const rating = ratePloHand(heroCards);
  const cfg = RATING_CONFIG[rating.rating];

  return (
    <section className="space-y-4 rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
      <p className="text-xs uppercase tracking-widest text-gray-500">Preflop — PLO</p>

      <div className={`text-3xl font-black ${cfg.class}`}>
        {cfg.emoji} {cfg.action}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-gray-500">Hand type</span>
        <span className="text-right text-white">{rating.label}</span>

        <span className="text-gray-500">Rating</span>
        <span className={`text-right font-bold ${cfg.class}`}>{rating.rating}</span>

        <span className="text-gray-500">Double-suited</span>
        <span className="text-right text-white">{rating.doubleSuited ? "✓ Yes" : "No"}</span>

        {rating.topPairRank && (
          <>
            <span className="text-gray-500">Top pair</span>
            <span className="text-right text-white">
              {["2","3","4","5","6","7","8","9","T","J","Q","K","A"][rating.topPairRank - 2]}s
            </span>
          </>
        )}
      </div>

      <p className="text-[11px] italic text-gray-600">
        {rating.doubleSuited
          ? "Double-suited adds significant value — two flush draws possible."
          : rating.singleSuited
          ? "Single-suited — one flush draw available."
          : "Rainbow — position and board texture drive value here."}
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PloBoard.tsx src/components/PloPreflopPanel.tsx
git commit -m "feat(plo): add PloBoard (4-slot) and PloPreflopPanel components"
```

---

### Task 6: Page wiring — tab + conditional rendering

**Files:**
- Modify: `src/app/page.tsx` (additions only — no NLHE code removed)

**Steps:**

- [ ] **Step 1: Add imports at the top of page.tsx**

```tsx
import PloBoard from "@/components/PloBoard";
import PloPreflopPanel from "@/components/PloPreflopPanel";
import { evaluateBestHandPLO } from "@/poker/plo/evaluator";
import { detectDrawsPLO } from "@/poker/plo/draws";
import { calculateOutsPLO } from "@/poker/plo/outs";
import { getHeroCardsForMode } from "@/state/handStore";
```

- [ ] **Step 2: Read `gameType` and `setGameType` from store**

Add alongside the other `useHandStore` reads:
```tsx
const gameType = useHandStore(s => s.gameType);
const setGameType = useHandStore(s => s.setGameType);
```

- [ ] **Step 3: Change `heroCards` derivation to use `getHeroCardsForMode`**

Find this line:
```tsx
const heroCards = useMemo(() => getHeroCards(slots), [slots]);
```

Replace with:
```tsx
const heroCards = useMemo(() => getHeroCardsForMode(slots, gameType), [slots, gameType]);
```

- [ ] **Step 4: Update hero card guards throughout the file**

The existing guard `heroCards.length !== 2` (in the rangeThreat useMemo and the decision/strategy/range panel condition) needs to be gameType-aware. Find each occurrence of `heroCards.length !== 2` and `heroCards.length === 2` and replace:

```tsx
// Replace heroCards.length !== 2 with:
heroCards.length !== (gameType === "plo" ? 4 : 2)

// Replace heroCards.length === 2 with:
heroCards.length === (gameType === "plo" ? 4 : 2)
```

- [ ] **Step 5: Update the `hand` useMemo to use PLO evaluator conditionally**

Find the existing computations memo (the one with `calculateOuts`, `detectDraws`, etc.) and add PLO-conditional evaluation. The cleanest approach: after the existing computation, add PLO overrides if `gameType === "plo"`:

Replace the computation useMemo content with a gameType-aware version:

```tsx
const { outsResult, drawAnalysis, currentHand, decisionResult, strategyResult } = useMemo(() => {
  const outs = gameType === "plo"
    ? calculateOutsPLO(heroCards, board)
    : calculateOuts(heroCards, board);
  const draws = gameType === "plo"
    ? detectDrawsPLO(heroCards, board)
    : detectDraws(heroCards, board);
  const current = heroCards.length > 0
    ? (gameType === "plo"
        ? (board.length >= 3 ? evaluateBestHandPLO(heroCards, board) : null)
        : evaluateBestHand(heroCards, board))
    : null;
  const boardAnalysis = board.length >= 3 ? analyzeBoardTexture(board) : null;
  const decision = board.length >= 3 && amountToCall >= 0
    ? calculateDecision(hand, draws, outs)
    : null;
  const strategy = boardAnalysis
    ? street === "river"
      ? getRiverStrategy(preflopContext, boardAnalysis, spr ?? 0)
      : street === "turn"
        ? getTurnStrategy(preflopContext, boardAnalysis, spr ?? 0)
        : getFlopStrategy(preflopContext, boardAnalysis, spr ?? 0)
    : null;

  return { outsResult: outs, drawAnalysis: draws, currentHand: current, decisionResult: decision, strategyResult: strategy };
}, [heroCards, board, hand, preflopContext, amountToCall, street, spr, gameType]);
```

- [ ] **Step 6: Add NLHE/PLO tab to the header**

Find the header's CASH/TOURNAMENT toggle section and add the game type tab above or before it:

```tsx
{/* Game type tab */}
<div className="flex overflow-hidden rounded border border-[#2A2A35]">
  {(["nlhe", "plo"] as const).map(type => (
    <button
      key={type}
      onClick={() => setGameType(type)}
      className={[
        "px-3 py-1 text-xs font-bold uppercase tracking-widest transition-colors",
        gameType === type
          ? "bg-[#2A2A3F] text-white"
          : "bg-[#1A1A1F] text-gray-500 hover:text-gray-300",
      ].join(" ")}
    >
      {type === "nlhe" ? "Hold'em" : "PLO"}
    </button>
  ))}
</div>
```

- [ ] **Step 7: Swap Board component in left column**

Find `<section ... ><Board /></section>` and replace with:

```tsx
<section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
  {gameType === "plo" ? <PloBoard /> : <Board />}
</section>
```

- [ ] **Step 8: Add PLO pot-max button in Pot Setup**

Find the Bet Size hint line (after the BetSizeButtons render) and add a PLO pot-max button:

```tsx
{gameType === "plo" && amountToCall > 0 && (
  <div className="flex items-center gap-2 pt-1">
    <span className="text-[11px] uppercase tracking-widest text-gray-500">PLO pot-max</span>
    <button
      onClick={() => setAmountToCall(pot + 3 * amountToCall)}
      title="Set call to PLO pot-maximum (pot + 3×call)"
      className="rounded border border-amber-800 bg-[#1A1A1F] px-2 py-1 text-[11px] font-bold text-amber-400 transition-colors hover:bg-amber-900/20"
    >
      {`R ${(pot + 3 * amountToCall).toLocaleString("en-ZA")}`}
    </button>
  </div>
)}
```

- [ ] **Step 9: Add PLO preflop panel in right column**

In the right column, the preflop panel section currently shows NLHE preflop. Add PLO alternative:

Find the `heroCards.length === 2 && board.length === 0` block and wrap with game type:

```tsx
) : heroCards.length === (gameType === "plo" ? 4 : 2) && board.length === 0 ? (
  gameType === "plo" ? (
    <PloPreflopPanel heroCards={heroCards} />
  ) : (
    /* existing NLHE preflop panel — keep exactly as-is */
    <section className="space-y-4 rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
      {/* ... all the existing NLHE preflop content ... */}
    </section>
  )
```

- [ ] **Step 10: Verify TypeScript**

```bash
npx tsc --noEmit
```

Fix any type errors before continuing.

- [ ] **Step 11: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (no regressions).

- [ ] **Step 12: Start dev server and smoke test**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
1. "Hold'em / PLO" tab appears in header
2. Clicking PLO: 4 hero card slots shown, board unchanged
3. Selecting 4 hole cards in PLO shows PloPreflopPanel with rating
4. NLHE tab: everything works exactly as before (2 hero slots, normal panels)
5. PLO decision panel appears when board has 3+ cards (flop)
6. PLO pot-max button appears when `gameType === "plo"` and call > 0

- [ ] **Step 13: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(plo): wire PLO tab, board, preflop panel, and pot-max button into HUD"
```
