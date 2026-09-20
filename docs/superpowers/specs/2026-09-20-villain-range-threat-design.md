# Villain Range Threat — Design Document

**Date:** 2026-09-20  
**Feature:** Villain archetype range analysis + position selectors  
**Parent spec:** `docs/superpowers/specs/2026-09-19-poker-companion-design.md`

---

## 1. Purpose

Extend the Poker Odds Companion with a villain-facing layer that answers:

> **Given the type of player I'm facing and their position, what portion of their range currently beats me, and what portion is drawing to beat me — and how much should I bet to deny those draws?**

This turns the app from a pure pot-odds calculator into a lightweight range-awareness training tool. All computation is deterministic — no LLM, no internet.

---

## 2. New UI Elements

### 2a. Game Context section (left column, between Pot Setup and Your Hand)

A collapsible panel containing:
- **Hero position** — 6 buttons (UTG HJ CO BTN SB BB) with `←` / `→` cycle arrows for fast tap, plus a hidden dropdown for direct selection
- **Villain position** — same layout
- **Preflop aggressor** — two-button toggle: Hero | Villain (wires into existing `preflopAggressor` store field)
- **Villain style** — dropdown: Nit / TAG / Modern Balanced Reg / LAG / Calling Station / Maniac

These selections persist across `New Hand` (same as game mode and stacks).

### 2b. Range Threat panel (right column, below Strategy panel)

Appears when: `heroCards.length === 2 && board.length >= 3 && villainArchetype selected && villainPosition selected`.

```
VILLAIN RANGE THREAT          (TAG · BTN · 472 combos)

Currently beating you      3 combos    0.6%   🟢
Drawing to beat you       24 combos    5.1%   🟠

  Flush draw — A-high flush beats your straight  (9 combos)
  Higher straight draw  (15 combos)

Denial bet:  ≥ 33% pot  (R 165)
```

Traffic light for draw threat:
- 🔴 ≥ 25% drawing → high equity threat, price out or reconsider bet size
- 🟠 10–25% → moderate threat
- 🟢 < 10% → low threat

---

## 3. New Files

```
src/
  data/
    archetypeRanges.ts   — typed constants + combo-expander from the JSON

  strategy/
    villainRange.ts      — pure engine: expand range, filter blocks, analyse vs hero

  components/
    GameContext.tsx       — position + archetype selectors
    PositionSelector.tsx  — reusable ← buttons + dropdown for one position
    RangeThreat.tsx       — range threat display panel
```

---

## 4. Data Layer — `src/data/archetypeRanges.ts`

### 4a. Archetype keys (TypeScript union)

```ts
export type ArchetypeKey =
  | "nit" | "tag" | "gto_oriented_reg" | "lag"
  | "calling_station" | "maniac";

export const ARCHETYPE_LABELS: Record<ArchetypeKey, string> = {
  nit: "Nit",
  tag: "TAG",
  gto_oriented_reg: "Modern Balanced Reg",
  lag: "LAG",
  calling_station: "Calling Station",
  maniac: "Maniac",
};
```

### 4b. Raw range data

The JSON file you provided is imported and its `profiles` object is re-exported as a typed constant. `hands` arrays from each position's `raise_first_in` entry are used directly — they are already fully expanded hand strings (e.g. `"A9s"`, `"KQo"`, `"77"`).

For `calling_station`, when a `voluntary_entry_prior` is present, use that for the archetype prior (wider entry range reflects their actual VPIP). The `raise_first_in` entry is used when they have actually raised.

### 4c. Combo expansion

```ts
// Expand a hand string into all specific 2-card combinations
function expandHand(hand: string): [Card, Card][]
```

Rules:
- `"AA"` → 6 pair combos: (A♠A♥), (A♠A♦), (A♠A♣), (A♥A♦), (A♥A♣), (A♦A♣)
- `"AKs"` → 4 suited combos: (A♠K♠), (A♥K♥), (A♦K♦), (A♣K♣)
- `"AKo"` → 12 offsuit combos: all (Ax Ky) where x ≠ y
- `"A9s+"` means A9s, ATs, AJs, AQs, AKs — the `+` suffix is already pre-expanded in the `hands` array, so no suffix parsing is needed

### 4d. Exported function

```ts
export function getVillainCombos(
  archetype: ArchetypeKey,
  position: Position,
  blocked: Card[]          // hero cards + board cards
): [Card, Card][]
```

Returns all combos from the archetype's range for that position, minus any combo that uses a card in `blocked`.

If no range exists for that position/archetype (e.g. BB has no RFI range), returns an empty array.

---

## 5. Engine — `src/strategy/villainRange.ts`

### 5a. Result type

```ts
export interface RangeThreat {
  archetype: ArchetypeKey;
  villainPosition: Position;
  totalCombos: number;

  beatHeroCount: number;
  beatHeroPct: number;       // beatHeroCount / totalCombos

  drawingToWinCount: number;
  drawingToWinPct: number;

  drawDescriptions: string[]; // human-readable, one per draw type found

  equityDenialFraction: number; // suggested bet as fraction of pot (0–2)
  threatLevel: "LOW" | "MEDIUM" | "HIGH";
}
```

### 5b. Main function

```ts
export function analyzeVillainRange(
  combos: [Card, Card][],
  heroCards: Card[],
  board: Card[],
  heroResult: HandResult,
  archetype: ArchetypeKey,
  villainPosition: Position
): RangeThreat
```

### 5c. Per-combo analysis (O(combos) — no nested enumeration)

For each combo:

**Step 1 — Currently beating hero?**
```
villainResult = evaluateBestHand(combo, board)
if villainResult.rankValue > heroResult.rankValue → beatHeroCount++
```

**Step 2 — Drawing to beat hero?** (only if villain doesn't already beat hero)

Check using the same `detectDraws(combo, board)` function that already exists:
- If villain has `"Flush draw"` or `"Nut flush draw"`:
  - A completed flush beats any non-flush hand hero holds
  - If hero also has a flush: check if villain's highest flush-suit card > hero's highest flush-suit card
- If villain has `"Open-ended straight draw"` or `"Gutshot straight draw"`:
  - Completing the straight: compare the high card of villain's best straight vs hero's current hand rank value
  - If villain's completing straight rankValue > hero's rankValue → drawing threat

Tally draw descriptions by category (de-duplicate across combos):
```
"Flush draw beating your straight (N combos)"
"Higher straight draw (N combos)"
"Full house draw beating your flush (N combos)"
```

**Step 3 — Denial bet formula**

```
drawingToWinPct = drawingToWinCount / totalCombos

if drawingToWinPct >= 0.25 → equityDenialFraction = 0.67, threatLevel = "HIGH"
if drawingToWinPct >= 0.10 → equityDenialFraction = 0.50, threatLevel = "MEDIUM"
else                        → equityDenialFraction = 0.25, threatLevel = "LOW"
```

Also: if `beatHeroPct > 0.20` → append to drawDescriptions: `"Caution: >20% of range already ahead"`

---

## 6. Zustand Store — new fields

Extend `HandStore` in `src/state/handStore.ts`:

```ts
villainArchetype: ArchetypeKey | undefined;
setVillainArchetype: (a: ArchetypeKey | undefined) => void;
```

The existing `heroPosition`, `villainPosition`, `preflopAggressor` fields already exist in the store — they just need UI exposure. `newHand` retains all context fields (same as existing stacks/positions).

---

## 7. Position Selector Component — `PositionSelector.tsx`

```
[← ]  [ UTG ]  [ HJ ]  [ CO ]  [ BTN ]  [ SB ]  [ BB ]  [ → ]
```

Props:
- `label: string` ("Hero" or "Villain")
- `value: Position | undefined`
- `onChange: (p: Position) => void`

Active button highlighted. `←` / `→` cycle through the 6 positions (wrapping). All buttons + arrows remain visible (no hidden dropdown — keeps the UI fast at the table).

---

## 8. Page Wiring — `src/app/page.tsx`

### New useMemo

```ts
const rangeThreat = useMemo(() => {
  if (
    !villainArchetype || !villainPosition ||
    heroCards.length < 2 || board.length < 3 || !currentHand
  ) return null;

  const blocked = [...heroCards, ...board];
  const combos = getVillainCombos(villainArchetype, villainPosition, blocked);
  if (combos.length === 0) return null;

  return analyzeVillainRange(
    combos, heroCards, board, currentHand,
    villainArchetype, villainPosition
  );
}, [villainArchetype, villainPosition, heroCards, board, currentHand]);
```

### Layout change

Left column gains a **Game Context** section (collapsible `<details>`) between Pot Setup and Your Hand:
```
Pot Setup → [Game Context] → Your Hand → Card Picker → Stacks
```

Right column gains **Range Threat** below Strategy:
```
Decision → Strategy → [Range Threat]
```

---

## 9. Limitations

- Only opening/RFI ranges are modelled. Calling and 3-bet ranges are out of scope for V1.
- BB has no range in the JSON (no RFI from BB in unstraddled play) — if villain is BB, the panel shows a note and no analysis.
- `calling_station` uses the `voluntary_entry_prior` (wider entry range) as it better reflects their VPIP.
- Draw detection uses the same heuristic engine as hero draws — it is not exact enumeration. If villain has an unusual two-card draw scenario it may be missed.
- This module carries the same "Modern baseline" label caveat as the strategy module — ranges are archetype priors, not exact population data.

---

## 10. Acceptance Criteria

- [ ] Position selectors (hero + villain) visible and functional
- [ ] Archetype dropdown shows all 6 profiles
- [ ] Selections persist across New Hand
- [ ] Range Threat panel appears when archetype + villain position + board set
- [ ] Correct combo count shown (after blocking hero cards and board)
- [ ] "Currently beating you" count verified for a known hand
- [ ] Draw descriptions appear for flush and straight draw threats
- [ ] Denial bet fraction updates with draw %
- [ ] BB villain shows a note (no RFI range available)
- [ ] All calculations complete in < 100 ms
- [ ] Existing tests still pass
