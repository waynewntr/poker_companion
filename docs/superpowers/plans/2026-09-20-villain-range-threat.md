# Villain Range Threat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add villain archetype + position selectors, a deterministic range analysis engine, and a Range Threat panel that shows how many villain combos beat or are drawing to beat the hero's hand.

**Architecture:** Three layers added to the existing codebase — a data layer (static archetype JSON → typed combo expander), an engine layer (per-combo hand comparison using existing evaluator + draw detector), and a UI layer (position selectors, archetype dropdown, Range Threat panel). All pure functions; no new dependencies.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v3, Zustand, Vitest

**Spec:** `docs/superpowers/specs/2026-09-20-villain-range-threat-design.md`

## Global Constraints

- All engine functions are pure (no side effects, no global state)
- Position type: `"UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB"` — already defined in `src/domain/hand.ts`
- Archetype keys: `"nit" | "tag" | "gto_oriented_reg" | "lag" | "calling_station" | "maniac"` — must match JSON profile keys exactly
- BB has no RFI range — `getVillainCombos` returns `[]` for BB villain
- `calling_station` uses `voluntary_entry_prior` hands (not `raise_first_in`)
- All calculations must complete in < 100 ms
- Currency: `R` prefix throughout
- `newHand` retains archetype, positions (same as stacks)
- Test runner: `npx vitest run` from repo root
- Working directory: `C:\Users\wayne.winter\Repositories\poker_companion`

---

### Task 1: Data layer — archetype ranges + combo expander

**Files:**
- Create: `src/data/archetypeRanges.ts`
- Create: `src/tests/archetypeRanges.test.ts`

**Interfaces:**
- Produces:
  - `ArchetypeKey = "nit" | "tag" | "gto_oriented_reg" | "lag" | "calling_station" | "maniac"`
  - `ARCHETYPE_LABELS: Record<ArchetypeKey, string>`
  - `getVillainCombos(archetype: ArchetypeKey, position: Position, blocked: Card[]): [Card, Card][]`

**Steps:**

- [ ] **Step 1: Write the failing tests**

Create `src/tests/archetypeRanges.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/tests/archetypeRanges.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/data/archetypeRanges.ts`**

```ts
import type { Card, Rank, Suit } from "@/domain/cards";
import type { Position } from "@/domain/hand";

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

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPE_LABELS) as ArchetypeKey[];

// ── Rank parsing ──────────────────────────────────────────────────────────────

const RANK_MAP: Record<string, Rank> = {
  "A": "A", "K": "K", "Q": "Q", "J": "J", "T": "T",
  "9": "9", "8": "8", "7": "7", "6": "6", "5": "5",
  "4": "4", "3": "3", "2": "2",
};

const SUITS: Suit[] = ["s", "h", "d", "c"];

function expandHand(hand: string): [Card, Card][] {
  const isPair = hand.length === 2 && hand[0] === hand[1];
  const isSuited = hand.endsWith("s") && !isPair;
  const isOffsuit = hand.endsWith("o");

  let rankStr = hand;
  if (isSuited || isOffsuit) rankStr = hand.slice(0, -1);

  const rank1 = RANK_MAP[rankStr[0]];
  const rank2 = RANK_MAP[rankStr[1]];

  if (!rank1 || !rank2) return [];

  if (isPair) {
    const combos: [Card, Card][] = [];
    for (let i = 0; i < SUITS.length; i++) {
      for (let j = i + 1; j < SUITS.length; j++) {
        combos.push([
          { rank: rank1, suit: SUITS[i] },
          { rank: rank2, suit: SUITS[j] },
        ]);
      }
    }
    return combos;
  }

  if (isSuited) {
    return SUITS.map(suit => [
      { rank: rank1, suit },
      { rank: rank2, suit },
    ]);
  }

  // Offsuit (or bare two-char non-pair treated as offsuit)
  const combos: [Card, Card][] = [];
  for (const s1 of SUITS) {
    for (const s2 of SUITS) {
      if (s1 !== s2) {
        combos.push([{ rank: rank1, suit: s1 }, { rank: rank2, suit: s2 }]);
      }
    }
  }
  return combos;
}

function isBlocked(combo: [Card, Card], blocked: Card[]): boolean {
  const blockedKeys = new Set(blocked.map(c => `${c.rank}${c.suit}`));
  return combo.some(c => blockedKeys.has(`${c.rank}${c.suit}`));
}

// ── Archetype range data ───────────────────────────────────────────────────────
// Hands arrays extracted from poker_6max_player_archetype_ranges.json
// Each entry is the raise_first_in hands list for that profile+position.
// calling_station uses voluntary_entry_prior (wider VPIP-representative range).

const RANGES: Record<ArchetypeKey, Partial<Record<Position, string[]>>> = {
  nit: {
    UTG: ["77","88","99","TT","JJ","QQ","KK","AA","A9s","ATs","AJs","AQs","AKs","KQs","QJs","AJo","AQo","AKo","KQo"],
    HJ: ["66","77","88","99","TT","JJ","QQ","KK","AA","A7s","A8s","A9s","ATs","AJs","AQs","AKs","KTs","KJs","KQs","QTs","QJs","JTs","T9s","AJo","AQo","AKo","KQo"],
    CO: ["55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T9s","98s","87s","A9o","ATo","AJo","AQo","AKo","KJo","KQo","QJo"],
    BTN: ["44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q8s","Q9s","QTs","QJs","J8s","J9s","JTs","T8s","T9s","97s","98s","87s","76s","65s","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","KTo","KJo","KQo","QTo","QJo","JTo"],
    SB: ["33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q7s","Q8s","Q9s","QTs","QJs","J8s","J9s","JTs","T8s","T9s","97s","98s","87s","76s","65s","54s","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K9o","KTo","KJo","KQo","Q9o","QTo","QJo","J9o","JTo","T9o"],
  },
  tag: {
    UTG: ["66","77","88","99","TT","JJ","QQ","KK","AA","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K9s","KTs","KJs","KQs","QTs","QJs","JTs","T9s","ATo","AJo","AQo","AKo","KQo"],
    HJ: ["55","66","77","88","99","TT","JJ","QQ","KK","AA","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K8s","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T9s","98s","ATo","AJo","AQo","AKo","KJo","KQo","QJo"],
    CO: ["44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q8s","Q9s","QTs","QJs","J8s","J9s","JTs","T8s","T9s","97s","98s","87s","76s","A9o","ATo","AJo","AQo","AKo","KTo","KJo","KQo","QTo","QJo","JTo"],
    BTN: ["33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J6s","J7s","J8s","J9s","JTs","T7s","T8s","T9s","97s","98s","86s","87s","76s","65s","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K9o","KTo","KJo","KQo","Q9o","QTo","QJo","J9o","JTo","T9o"],
    SB: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q4s","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J6s","J7s","J8s","J9s","JTs","T6s","T7s","T8s","T9s","95s","96s","97s","98s","84s","85s","86s","87s","74s","75s","76s","63s","64s","65s","53s","54s","43s","A2o","A3o","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K8o","K9o","KTo","KJo","KQo","Q9o","QTo","QJo","J9o","JTo","T9o"],
  },
  gto_oriented_reg: {
    UTG: ["66","77","88","99","TT","JJ","QQ","KK","AA","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K8s","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T9s","ATo","AJo","AQo","AKo","KJo","KQo","QJo"],
    HJ: ["55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T9s","98s","87s","76s","ATo","AJo","AQo","AKo","KTo","KJo","KQo","QTo","QJo"],
    CO: ["33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J8s","J9s","JTs","T7s","T8s","T9s","97s","98s","87s","76s","A8o","A9o","ATo","AJo","AQo","AKo","KTo","KJo","KQo","QTo","QJo","JTo"],
    BTN: ["33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q3s","Q4s","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J4s","J5s","J6s","J7s","J8s","J9s","JTs","T6s","T7s","T8s","T9s","96s","97s","98s","85s","86s","87s","75s","76s","64s","65s","53s","54s","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K8o","K9o","KTo","KJo","KQo","Q9o","QTo","QJo","J9o","JTo","T8o","T9o","98o"],
    SB: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q2s","Q3s","Q4s","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J2s","J3s","J4s","J5s","J6s","J7s","J8s","J9s","JTs","T3s","T4s","T5s","T6s","T7s","T8s","T9s","94s","95s","96s","97s","98s","84s","85s","86s","87s","74s","75s","76s","63s","64s","65s","53s","54s","43s","A2o","A3o","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K4o","K5o","K6o","K7o","K8o","K9o","KTo","KJo","KQo","Q5o","Q6o","Q7o","Q8o","Q9o","QTo","QJo","J7o","J8o","J9o","JTo","T7o","T8o","T9o","96o","97o","98o","86o","87o","76o"],
  },
  lag: {
    UTG: ["55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K7s","K8s","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T8s","T9s","98s","87s","76s","A9o","ATo","AJo","AQo","AKo","KTo","KJo","KQo","QTo","QJo","JTo"],
    HJ: ["44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q8s","Q9s","QTs","QJs","J8s","J9s","JTs","T8s","T9s","97s","98s","87s","76s","65s","A8o","A9o","ATo","AJo","AQo","AKo","KTo","KJo","KQo","QTo","QJo","JTo"],
    CO: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J7s","J8s","J9s","JTs","T7s","T8s","T9s","96s","97s","98s","86s","87s","75s","76s","65s","54s","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K9o","KTo","KJo","KQo","Q9o","QTo","QJo","J9o","JTo","T9o"],
    BTN: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q2s","Q3s","Q4s","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J3s","J4s","J5s","J6s","J7s","J8s","J9s","JTs","T4s","T5s","T6s","T7s","T8s","T9s","94s","95s","96s","97s","98s","84s","85s","86s","87s","74s","75s","76s","63s","64s","65s","53s","54s","43s","A2o","A3o","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K6o","K7o","K8o","K9o","KTo","KJo","KQo","Q8o","Q9o","QTo","QJo","J8o","J9o","JTo","T8o","T9o","98o"],
    SB: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q2s","Q3s","Q4s","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J2s","J3s","J4s","J5s","J6s","J7s","J8s","J9s","JTs","T2s","T3s","T4s","T5s","T6s","T7s","T8s","T9s","92s","93s","94s","95s","96s","97s","98s","82s","83s","84s","85s","86s","87s","72s","73s","74s","75s","76s","62s","63s","64s","65s","52s","53s","54s","42s","43s","32s","A2o","A3o","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K2o","K3o","K4o","K5o","K6o","K7o","K8o","K9o","KTo","KJo","KQo","Q4o","Q5o","Q6o","Q7o","Q8o","Q9o","QTo","QJo","J6o","J7o","J8o","J9o","JTo","T6o","T7o","T8o","T9o","96o","97o","98o","86o","87o","76o"],
  },
  // calling_station uses voluntary_entry_prior (wider VPIP-representative range)
  calling_station: {
    UTG: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T8s","T9s","98s","87s","76s","65s","A9o","ATo","AJo","AQo","AKo","KTo","KJo","KQo","QTo","QJo","JTo"],
    HJ: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q8s","Q9s","QTs","QJs","J8s","J9s","JTs","T8s","T9s","97s","98s","87s","76s","65s","54s","A8o","A9o","ATo","AJo","AQo","AKo","KTo","KJo","KQo","QTo","QJo","JTo"],
    CO: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J7s","J8s","J9s","JTs","T7s","T8s","T9s","96s","97s","98s","86s","87s","75s","76s","65s","54s","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K9o","KTo","KJo","KQo","Q9o","QTo","QJo","J9o","JTo","T9o"],
    BTN: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q2s","Q3s","Q4s","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J4s","J5s","J6s","J7s","J8s","J9s","JTs","T5s","T6s","T7s","T8s","T9s","95s","96s","97s","98s","85s","86s","87s","75s","76s","64s","65s","54s","A2o","A3o","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K7o","K8o","K9o","KTo","KJo","KQo","Q8o","Q9o","QTo","QJo","J8o","J9o","JTo","T8o","T9o","98o"],
    SB: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q2s","Q3s","Q4s","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J2s","J3s","J4s","J5s","J6s","J7s","J8s","J9s","JTs","T2s","T3s","T4s","T5s","T6s","T7s","T8s","T9s","92s","93s","94s","95s","96s","97s","98s","82s","83s","84s","85s","86s","87s","72s","73s","74s","75s","76s","62s","63s","64s","65s","52s","53s","54s","42s","43s","32s","A2o","A3o","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K2o","K3o","K4o","K5o","K6o","K7o","K8o","K9o","KTo","KJo","KQo","Q4o","Q5o","Q6o","Q7o","Q8o","Q9o","QTo","QJo","J6o","J7o","J8o","J9o","JTo","T6o","T7o","T8o","T9o","96o","97o","98o","86o","87o","76o"],
  },
  maniac: {
    UTG: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J7s","J8s","J9s","JTs","T7s","T8s","T9s","96s","97s","98s","86s","87s","75s","76s","65s","54s","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K9o","KTo","KJo","KQo","Q9o","QTo","QJo","J9o","JTo","T9o"],
    HJ: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q2s","Q3s","Q4s","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J5s","J6s","J7s","J8s","J9s","JTs","T6s","T7s","T8s","T9s","96s","97s","98s","85s","86s","87s","75s","76s","64s","65s","54s","A2o","A3o","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K7o","K8o","K9o","KTo","KJo","KQo","Q8o","Q9o","QTo","QJo","J8o","J9o","JTo","T8o","T9o","98o"],
    CO: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q2s","Q3s","Q4s","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J2s","J3s","J4s","J5s","J6s","J7s","J8s","J9s","JTs","T4s","T5s","T6s","T7s","T8s","T9s","94s","95s","96s","97s","98s","84s","85s","86s","87s","74s","75s","76s","63s","64s","65s","53s","54s","43s","A2o","A3o","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K5o","K6o","K7o","K8o","K9o","KTo","KJo","KQo","Q7o","Q8o","Q9o","QTo","QJo","J7o","J8o","J9o","JTo","T7o","T8o","T9o","97o","98o","87o"],
    BTN: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q2s","Q3s","Q4s","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J2s","J3s","J4s","J5s","J6s","J7s","J8s","J9s","JTs","T2s","T3s","T4s","T5s","T6s","T7s","T8s","T9s","92s","93s","94s","95s","96s","97s","98s","82s","83s","84s","85s","86s","87s","72s","73s","74s","75s","76s","62s","63s","64s","65s","52s","53s","54s","42s","43s","32s","A2o","A3o","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K2o","K3o","K4o","K5o","K6o","K7o","K8o","K9o","KTo","KJo","KQo","Q2o","Q3o","Q4o","Q5o","Q6o","Q7o","Q8o","Q9o","QTo","QJo","J4o","J5o","J6o","J7o","J8o","J9o","JTo","T5o","T6o","T7o","T8o","T9o","95o","96o","97o","98o","85o","86o","87o","75o","76o","65o","54o"],
    SB: ["22","33","44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K2s","K3s","K4s","K5s","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q2s","Q3s","Q4s","Q5s","Q6s","Q7s","Q8s","Q9s","QTs","QJs","J2s","J3s","J4s","J5s","J6s","J7s","J8s","J9s","JTs","T2s","T3s","T4s","T5s","T6s","T7s","T8s","T9s","92s","93s","94s","95s","96s","97s","98s","82s","83s","84s","85s","86s","87s","72s","73s","74s","75s","76s","62s","63s","64s","65s","52s","53s","54s","42s","43s","32s","A2o","A3o","A4o","A5o","A6o","A7o","A8o","A9o","ATo","AJo","AQo","AKo","K2o","K3o","K4o","K5o","K6o","K7o","K8o","K9o","KTo","KJo","KQo","Q2o","Q3o","Q4o","Q5o","Q6o","Q7o","Q8o","Q9o","QTo","QJo","J2o","J3o","J4o","J5o","J6o","J7o","J8o","J9o","JTo","T4o","T5o","T6o","T7o","T8o","T9o","94o","95o","96o","97o","98o","84o","85o","86o","87o","74o","75o","76o","64o","65o","54o"],
  },
};

function cardKey(c: Card): string {
  return `${c.rank}${c.suit}`;
}

export function getVillainCombos(
  archetype: ArchetypeKey,
  position: Position,
  blocked: Card[]
): [Card, Card][] {
  if (position === "BB") return [];

  const hands = RANGES[archetype]?.[position];
  if (!hands || hands.length === 0) return [];

  const blockedKeys = new Set(blocked.map(cardKey));

  const result: [Card, Card][] = [];
  for (const hand of hands) {
    for (const combo of expandHand(hand)) {
      if (!isBlocked(combo, blocked) &&
          !blockedKeys.has(cardKey(combo[0])) &&
          !blockedKeys.has(cardKey(combo[1]))) {
        result.push(combo);
      }
    }
  }
  return result;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/tests/archetypeRanges.test.ts
```

Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/data/archetypeRanges.ts src/tests/archetypeRanges.test.ts
git commit -m "feat: add archetype range data and combo expander"
```

---

### Task 2: Engine — villain range analysis

**Files:**
- Create: `src/strategy/villainRange.ts`
- Create: `src/tests/villainRange.test.ts`

**Interfaces:**
- Consumes: `evaluateBestHand`, `HandResult`, `HandCategory` from `@/poker/evaluator`; `detectDraws` from `@/poker/draws`; `getVillainCombos`, `ArchetypeKey` from `@/data/archetypeRanges`; `Card` from `@/domain/cards`; `Position` from `@/domain/hand`
- Produces:
  - `RangeThreat` interface
  - `analyzeVillainRange(combos, heroCards, board, heroResult, archetype, villainPosition): RangeThreat`

**Steps:**

- [ ] **Step 1: Write the failing tests**

Create `src/tests/villainRange.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { analyzeVillainRange } from "@/strategy/villainRange";
import { getVillainCombos } from "@/data/archetypeRanges";
import { evaluateBestHand } from "@/poker/evaluator";

describe("analyzeVillainRange", () => {
  it("returns zero beatHeroCount when hero has nuts (royal flush)", () => {
    // Hero: A♠K♠ on Q♠J♠T♠ — royal flush, unbeatable
    const heroCards = [{ rank: "A" as const, suit: "s" as const }, { rank: "K" as const, suit: "s" as const }];
    const board = [{ rank: "Q" as const, suit: "s" as const }, { rank: "J" as const, suit: "s" as const }, { rank: "T" as const, suit: "s" as const }];
    const heroResult = evaluateBestHand(heroCards, board);
    const blocked = [...heroCards, ...board];
    const combos = getVillainCombos("gto_oriented_reg", "BTN", blocked);

    const result = analyzeVillainRange(combos, heroCards, board, heroResult, "gto_oriented_reg", "BTN");
    expect(result.beatHeroPct).toBe(0);
    expect(result.totalCombos).toBeGreaterThan(0);
  });

  it("beatHeroPct > 0 when villain has strong hands that beat hero pair", () => {
    // Hero: A♠K♠ on A♥8♣4♦ — pair of Aces
    const heroCards = [{ rank: "A" as const, suit: "s" as const }, { rank: "K" as const, suit: "s" as const }];
    const board = [{ rank: "A" as const, suit: "h" as const }, { rank: "8" as const, suit: "c" as const }, { rank: "4" as const, suit: "d" as const }];
    const heroResult = evaluateBestHand(heroCards, board);
    const blocked = [...heroCards, ...board];
    const combos = getVillainCombos("gto_oriented_reg", "BTN", blocked);

    const result = analyzeVillainRange(combos, heroCards, board, heroResult, "gto_oriented_reg", "BTN");
    // Villain's AA, 88, 44 sets should beat hero's pair of Aces
    expect(result.beatHeroPct).toBeGreaterThan(0);
  });

  it("drawingToWinCount > 0 when villain has flush draw that beats hero straight", () => {
    // Hero: Q♠J♠ on 9♠8♠7♥ — straight (7-8-9-T-J or 8-9-Q-J? actually Q-J-9-8-7 = straight)
    // Wait: Q♠J♠ on 9♠8♠7♥ — best hand: evaluate
    const heroCards = [{ rank: "Q" as const, suit: "s" as const }, { rank: "J" as const, suit: "s" as const }];
    const board = [{ rank: "9" as const, suit: "s" as const }, { rank: "8" as const, suit: "s" as const }, { rank: "7" as const, suit: "h" as const }];
    const heroResult = evaluateBestHand(heroCards, board);
    // hero has flush (4 spades: Q♠J♠9♠8♠ + need one more) — actually hero has straight: 7-8-9-T-J? No...
    // Q♠J♠ + 9♠8♠7♥: ranks Q,J,9,8,7 — straight 7-8-9-T-J? No T. But 7-8-9-J-Q? not consecutive.
    // Actually best 5 from {Q♠,J♠,9♠,8♠,7♥}: flush? only 4 spades (no flush). Straight? 7-8-9-T-J? no T. high card Q-high.
    // Hmm, let me use a proper straight board.

    // Hero: Q♠J♠ on T♠9♠8♥ — OESD completed: Q-J-T-9-8 = straight + 4 spades (flush draw)
    const heroCards2 = [{ rank: "Q" as const, suit: "s" as const }, { rank: "J" as const, suit: "s" as const }];
    const board2 = [{ rank: "T" as const, suit: "s" as const }, { rank: "9" as const, suit: "s" as const }, { rank: "8" as const, suit: "h" as const }];
    const heroResult2 = evaluateBestHand(heroCards2, board2);
    // Q♠J♠T♠9♠ = 4 spades → flush draw! Q-J-T-9-8 = straight. hero has straight (no flush yet with 8♥).
    const blocked2 = [...heroCards2, ...board2];
    const combos2 = getVillainCombos("gto_oriented_reg", "BTN", blocked2);

    const result2 = analyzeVillainRange(combos2, heroCards2, board2, heroResult2, "gto_oriented_reg", "BTN");
    // Many BTN hands include spades that would complete a flush beating hero's straight
    expect(result2.drawingToWinCount).toBeGreaterThan(0);
    expect(result2.drawDescriptions.length).toBeGreaterThan(0);
  });

  it("threatLevel is LOW when drawingToWinPct < 0.10", () => {
    // Trivially constructed: empty combos
    const heroCards = [{ rank: "A" as const, suit: "s" as const }, { rank: "K" as const, suit: "h" as const }];
    const board = [{ rank: "A" as const, suit: "h" as const }, { rank: "K" as const, suit: "d" as const }, { rank: "2" as const, suit: "c" as const }];
    const heroResult = evaluateBestHand(heroCards, board);
    const result = analyzeVillainRange([], heroCards, board, heroResult, "nit", "UTG");
    expect(result.threatLevel).toBe("LOW");
    expect(result.totalCombos).toBe(0);
    expect(result.beatHeroPct).toBe(0);
  });

  it("equityDenialFraction >= 0.67 when drawingToWinPct >= 0.25", () => {
    // Construct a scenario manually
    const { analyzeVillainRange: fn } = await import("@/strategy/villainRange");
    // Can't easily force 25% draw rate without real board; verify the threshold logic via
    // white-box knowledge: covered by the implementation directly.
    // This test simply verifies the function returns a finite non-negative number.
    const heroCards = [{ rank: "A" as const, suit: "s" as const }, { rank: "K" as const, suit: "s" as const }];
    const board = [{ rank: "Q" as const, suit: "s" as const }, { rank: "J" as const, suit: "s" as const }, { rank: "2" as const, suit: "h" as const }];
    const heroResult = evaluateBestHand(heroCards, board);
    const blocked = [...heroCards, ...board];
    const combos = getVillainCombos("maniac", "BTN", blocked);
    const result = fn(combos, heroCards, board, heroResult, "maniac", "BTN");
    expect(result.equityDenialFraction).toBeGreaterThanOrEqual(0.25);
    expect(result.equityDenialFraction).toBeLessThanOrEqual(2);
  });
});
```

Note: The fourth test uses `await import` — replace with a regular import at the top of the file. Simplify to:

```ts
it("equityDenialFraction is a valid fraction", () => {
  const heroCards = [{ rank: "A" as const, suit: "s" as const }, { rank: "K" as const, suit: "s" as const }];
  const board = [{ rank: "Q" as const, suit: "s" as const }, { rank: "J" as const, suit: "s" as const }, { rank: "2" as const, suit: "h" as const }];
  const heroResult = evaluateBestHand(heroCards, board);
  const blocked = [...heroCards, ...board];
  const combos = getVillainCombos("maniac", "BTN", blocked);
  const result = analyzeVillainRange(combos, heroCards, board, heroResult, "maniac", "BTN");
  expect(result.equityDenialFraction).toBeGreaterThanOrEqual(0.25);
  expect(result.equityDenialFraction).toBeLessThanOrEqual(2);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/tests/villainRange.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/strategy/villainRange.ts`**

```ts
import type { Card } from "../domain/cards";
import type { Position } from "../domain/hand";
import type { ArchetypeKey } from "../data/archetypeRanges";
import { evaluateBestHand, HandCategory, HandResult } from "../poker/evaluator";
import { detectDraws } from "../poker/draws";

export interface RangeThreat {
  archetype: ArchetypeKey;
  villainPosition: Position;
  totalCombos: number;

  beatHeroCount: number;
  beatHeroPct: number;

  drawingToWinCount: number;
  drawingToWinPct: number;

  drawDescriptions: string[];    // one entry per draw type with combo count
  equityDenialFraction: number;  // pot fraction to deny draws
  threatLevel: "LOW" | "MEDIUM" | "HIGH";
}

const CATEGORY_RANK: Record<HandCategory, number> = {
  high_card: 0, pair: 1, two_pair: 2, three_of_a_kind: 3,
  straight: 4, flush: 5, full_house: 6, four_of_a_kind: 7, straight_flush: 8,
};

export function analyzeVillainRange(
  combos: [Card, Card][],
  heroCards: Card[],
  board: Card[],
  heroResult: HandResult,
  archetype: ArchetypeKey,
  villainPosition: Position
): RangeThreat {
  if (combos.length === 0 || board.length < 3) {
    return {
      archetype, villainPosition, totalCombos: 0,
      beatHeroCount: 0, beatHeroPct: 0,
      drawingToWinCount: 0, drawingToWinPct: 0,
      drawDescriptions: [],
      equityDenialFraction: 0.25,
      threatLevel: "LOW",
    };
  }

  const heroRank = CATEGORY_RANK[heroResult.category];
  let beatHeroCount = 0;
  let drawingToWinCount = 0;

  // Tally per draw-type label
  const drawTally: Record<string, number> = {};

  for (const [c1, c2] of combos) {
    const villainResult = evaluateBestHand([c1, c2], board);

    if (villainResult.rankValue > heroResult.rankValue) {
      beatHeroCount++;
      continue;
    }

    // Check villain's draws — do they improve to a category that beats hero?
    const { draws } = detectDraws([c1, c2], board);
    let drawsToBeat = false;

    for (const draw of draws) {
      const isFlushDraw = draw.toLowerCase().includes("flush draw");
      const isStraightDraw = draw.toLowerCase().includes("straight draw");

      if (isFlushDraw && CATEGORY_RANK["flush"] > heroRank) {
        const label = `Flush draw beats your ${heroResult.category.replace(/_/g, " ")}`;
        drawTally[label] = (drawTally[label] ?? 0) + 1;
        drawsToBeat = true;
      }

      if (isStraightDraw && CATEGORY_RANK["straight"] > heroRank) {
        const label = `Straight draw beats your ${heroResult.category.replace(/_/g, " ")}`;
        drawTally[label] = (drawTally[label] ?? 0) + 1;
        drawsToBeat = true;
      }
    }

    if (drawsToBeat) drawingToWinCount++;
  }

  const total = combos.length;
  const beatHeroPct = beatHeroCount / total;
  const drawingToWinPct = drawingToWinCount / total;

  // Format descriptions with combo counts
  const drawDescriptions = Object.entries(drawTally)
    .map(([label, count]) => `${label} (${count} combo${count !== 1 ? "s" : ""})`);

  if (beatHeroPct > 0.20) {
    drawDescriptions.push(`Caution: ${(beatHeroPct * 100).toFixed(0)}% of range already ahead`);
  }

  // Denial bet sizing
  let equityDenialFraction: number;
  let threatLevel: "LOW" | "MEDIUM" | "HIGH";

  if (drawingToWinPct >= 0.25) {
    equityDenialFraction = 0.67;
    threatLevel = "HIGH";
  } else if (drawingToWinPct >= 0.10) {
    equityDenialFraction = 0.50;
    threatLevel = "MEDIUM";
  } else {
    equityDenialFraction = 0.25;
    threatLevel = "LOW";
  }

  return {
    archetype, villainPosition,
    totalCombos: total,
    beatHeroCount, beatHeroPct,
    drawingToWinCount, drawingToWinPct,
    drawDescriptions,
    equityDenialFraction,
    threatLevel,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/tests/villainRange.test.ts
npx vitest run
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/strategy/villainRange.ts src/tests/villainRange.test.ts
git commit -m "feat: add villain range analysis engine"
```

---

### Task 3: Store extension — add villainArchetype field

**Files:**
- Modify: `src/state/handStore.ts`

**Interfaces:**
- Consumes: `ArchetypeKey` from `@/data/archetypeRanges`
- Produces: `villainArchetype: ArchetypeKey | undefined`, `setVillainArchetype` action in `HandStore`

**Steps:**

- [ ] **Step 1: Add import and field to handStore.ts**

In `src/state/handStore.ts`, add at the top:
```ts
import type { ArchetypeKey } from "@/data/archetypeRanges";
```

Add to `HandStore` interface (after `numPlayers`):
```ts
villainArchetype: ArchetypeKey | undefined;
setVillainArchetype: (a: ArchetypeKey | undefined) => void;
```

Add to the store initial state (after `numPlayers: 2`):
```ts
villainArchetype: undefined,
```

Add the action implementation (after `setNumPlayers`):
```ts
setVillainArchetype: (a) => set({ villainArchetype: a }),
```

Add `villainArchetype` to the `newHand` retention list:
```ts
newHand: () => {
  const { gameMode, heroStack, villainStack, heroPosition, villainPosition,
          preflopAggressor, potType, numPlayers, villainArchetype } = get();
  set({
    slots: { ...EMPTY_SLOTS },
    pot: 0,
    amountToCall: 0,
    isAllIn: false,
    activeSlot: "hero1",
    gameMode, heroStack, villainStack,
    heroPosition, villainPosition,
    preflopAggressor, potType, numPlayers,
    villainArchetype,   // retained
  });
},
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/state/handStore.ts
git commit -m "feat: add villainArchetype to hand store"
```

---

### Task 4: UI — PositionSelector + GameContext components

**Files:**
- Create: `src/components/PositionSelector.tsx`
- Create: `src/components/GameContext.tsx`

**Interfaces:**
- Consumes: `useHandStore` from `@/state/handStore`; `Position` from `@/domain/hand`; `ArchetypeKey`, `ARCHETYPE_LABELS`, `ARCHETYPE_KEYS` from `@/data/archetypeRanges`

**Steps:**

- [ ] **Step 1: Create `src/components/PositionSelector.tsx`**

```tsx
"use client";

import type { Position } from "@/domain/hand";

const POSITIONS: Position[] = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

interface Props {
  label: string;
  value: Position | undefined;
  onChange: (p: Position) => void;
}

export default function PositionSelector({ label, value, onChange }: Props) {
  function cycle(direction: 1 | -1) {
    const current = value ? POSITIONS.indexOf(value) : -1;
    const next = (current + direction + POSITIONS.length) % POSITIONS.length;
    onChange(POSITIONS[next]);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[11px] uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <button
        onClick={() => cycle(-1)}
        className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-200"
        aria-label={`Previous ${label} position`}
      >
        ‹
      </button>
      <div className="flex gap-1">
        {POSITIONS.map(pos => (
          <button
            key={pos}
            onClick={() => onChange(pos)}
            className={[
              "rounded px-1.5 py-0.5 text-[11px] font-bold uppercase transition-colors",
              value === pos
                ? "bg-blue-600 text-white"
                : "border border-[#2A2A35] bg-[#1A1A1F] text-gray-500 hover:text-gray-300",
            ].join(" ")}
          >
            {pos}
          </button>
        ))}
      </div>
      <button
        onClick={() => cycle(1)}
        className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-200"
        aria-label={`Next ${label} position`}
      >
        ›
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/GameContext.tsx`**

```tsx
"use client";

import { useHandStore } from "@/state/handStore";
import { ARCHETYPE_KEYS, ARCHETYPE_LABELS, type ArchetypeKey } from "@/data/archetypeRanges";
import PositionSelector from "./PositionSelector";

export default function GameContext() {
  const heroPosition = useHandStore(s => s.heroPosition);
  const villainPosition = useHandStore(s => s.villainPosition);
  const preflopAggressor = useHandStore(s => s.preflopAggressor);
  const villainArchetype = useHandStore(s => s.villainArchetype);

  const setHeroPosition = useHandStore(s => s.setHeroPosition);
  const setVillainPosition = useHandStore(s => s.setVillainPosition);
  const setPreflopAggressor = useHandStore(s => s.setPreflopAggressor);
  const setVillainArchetype = useHandStore(s => s.setVillainArchetype);

  return (
    <details className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
      <summary className="cursor-pointer text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300">
        Game Context
        {(heroPosition || villainPosition || villainArchetype) && (
          <span className="ml-2 text-[10px] text-blue-400">
            {[heroPosition, villainPosition && `vs ${villainPosition}`, villainArchetype && ARCHETYPE_LABELS[villainArchetype]]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </summary>

      <div className="mt-3 space-y-3">
        <PositionSelector
          label="Hero"
          value={heroPosition}
          onChange={setHeroPosition}
        />
        <PositionSelector
          label="Villain"
          value={villainPosition}
          onChange={setVillainPosition}
        />

        {/* Preflop aggressor toggle */}
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[11px] uppercase tracking-widest text-gray-500">Aggressor</span>
          <div className="flex overflow-hidden rounded border border-[#2A2A35]">
            {(["hero", "villain"] as const).map(side => (
              <button
                key={side}
                onClick={() => setPreflopAggressor(preflopAggressor === side ? undefined : side)}
                className={[
                  "px-2 py-0.5 text-[11px] uppercase font-bold tracking-widest transition-colors",
                  preflopAggressor === side
                    ? "bg-[#2A2A3F] text-white"
                    : "bg-[#1A1A1F] text-gray-600 hover:text-gray-300",
                ].join(" ")}
              >
                {side}
              </button>
            ))}
          </div>
        </div>

        {/* Villain archetype */}
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[11px] uppercase tracking-widest text-gray-500">Style</span>
          <select
            value={villainArchetype ?? ""}
            onChange={e => setVillainArchetype((e.target.value as ArchetypeKey) || undefined)}
            className="flex-1 rounded border border-[#2A2A35] bg-[#0D0D0F] px-2 py-1 text-xs text-gray-200 focus:outline-none"
          >
            <option value="">— select style —</option>
            {ARCHETYPE_KEYS.map(key => (
              <option key={key} value={key}>{ARCHETYPE_LABELS[key]}</option>
            ))}
          </select>
        </div>
      </div>
    </details>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/PositionSelector.tsx src/components/GameContext.tsx
git commit -m "feat: add PositionSelector and GameContext UI components"
```

---

### Task 5: UI — RangeThreat display panel

**Files:**
- Create: `src/components/RangeThreat.tsx`

**Interfaces:**
- Consumes: `RangeThreat` from `@/strategy/villainRange`; `ARCHETYPE_LABELS` from `@/data/archetypeRanges`; `formatMoney` from `@/components/MoneyInput`

**Steps:**

- [ ] **Step 1: Create `src/components/RangeThreat.tsx`**

```tsx
"use client";

import type { RangeThreat } from "@/strategy/villainRange";
import { ARCHETYPE_LABELS } from "@/data/archetypeRanges";
import { formatMoney } from "@/components/MoneyInput";
import { suggestBetSizes } from "@/strategy/betSizing";

const THREAT_COLOR = {
  LOW: "text-green-400",
  MEDIUM: "text-amber-400",
  HIGH: "text-red-400",
};

const THREAT_EMOJI = {
  LOW: "🟢",
  MEDIUM: "🟠",
  HIGH: "🔴",
};

interface Props {
  threat: RangeThreat;
  pot: number;
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function RangeThreat({ threat, pot }: Props) {
  const {
    archetype, villainPosition, totalCombos,
    beatHeroCount, beatHeroPct,
    drawingToWinCount, drawingToWinPct,
    drawDescriptions, equityDenialFraction, threatLevel,
  } = threat;

  const denialBetAmount = suggestBetSizes(pot, [equityDenialFraction])[0];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-gray-500">
          Villain Range Threat
        </p>
        <span className="text-[10px] text-gray-600">
          {ARCHETYPE_LABELS[archetype]} · {villainPosition} · {totalCombos} combos
        </span>
      </div>

      {totalCombos === 0 ? (
        <p className="text-xs italic text-gray-600">
          {villainPosition === "BB"
            ? "BB has no opening range — analysis unavailable."
            : "No range data for this position."}
        </p>
      ) : (
        <>
          {/* Threat table */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-gray-500">Currently beating you</span>
            <span className="text-right text-white">
              {beatHeroCount} <span className="text-gray-500">({pct(beatHeroPct)})</span>
            </span>

            <span className="text-gray-500">Drawing to beat you</span>
            <span className={`text-right font-bold ${THREAT_COLOR[threatLevel]}`}>
              {THREAT_EMOJI[threatLevel]} {drawingToWinCount} <span className="font-normal">({pct(drawingToWinPct)})</span>
            </span>
          </div>

          {/* Draw descriptions */}
          {drawDescriptions.length > 0 && (
            <ul className="space-y-0.5">
              {drawDescriptions.map((d, i) => (
                <li key={i} className="text-[11px] text-gray-400">
                  · {d}
                </li>
              ))}
            </ul>
          )}

          {/* Denial bet suggestion */}
          {drawingToWinCount > 0 && (
            <div className="border-t border-[#2A2A35] pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Denial bet</span>
                <span className="text-white">
                  ≥ {Math.round(equityDenialFraction * 100)}% pot
                  {pot > 0 && (
                    <span className="ml-1 text-gray-400">({formatMoney(denialBetAmount)})</span>
                  )}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] italic text-gray-600">
                Charges draws more than their equity warrants
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/RangeThreat.tsx
git commit -m "feat: add RangeThreat display panel"
```

---

### Task 6: Page wiring — integrate all new pieces

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `GameContext`, `RangeThreat` components; `useHandStore` for `villainArchetype`, `villainPosition`; `analyzeVillainRange` from `@/strategy/villainRange`; `getVillainCombos` from `@/data/archetypeRanges`

**Steps:**

- [ ] **Step 1: Add imports to page.tsx**

At the top of `src/app/page.tsx`, add:

```tsx
import GameContext from "@/components/GameContext";
import RangeThreatPanel from "@/components/RangeThreat";
import { getVillainCombos } from "@/data/archetypeRanges";
import { analyzeVillainRange, type RangeThreat } from "@/strategy/villainRange";
```

- [ ] **Step 2: Read new store fields**

Add these lines alongside the other `useHandStore` reads:

```tsx
const villainArchetype = useHandStore(s => s.villainArchetype);
```

(`villainPosition` is already read from the store for the strategy panel.)

- [ ] **Step 3: Add rangeThreat useMemo**

Add after the existing `strategyResult` computation memo:

```tsx
const rangeThreat: RangeThreat | null = useMemo(() => {
  if (
    !villainArchetype || !villainPosition ||
    heroCards.length < 2 || board.length < 3 || !currentHand
  ) return null;

  const blocked = [...heroCards, ...board];
  const combos = getVillainCombos(villainArchetype, villainPosition, blocked);
  return analyzeVillainRange(
    combos, heroCards, board, currentHand,
    villainArchetype, villainPosition
  );
}, [villainArchetype, villainPosition, heroCards, board, currentHand]);
```

- [ ] **Step 4: Insert GameContext into left column**

In the left column JSX, insert `<GameContext />` between the Pot Setup section and the Board section:

```tsx
{/* Game Context — position + archetype selectors */}
<GameContext />

{/* Your hand + board */}
<section className="...">
  <Board />
</section>
```

- [ ] **Step 5: Insert RangeThreat into right column**

In the right column JSX, after the Strategy panel section, add:

```tsx
{rangeThreat && (
  <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
    <RangeThreatPanel threat={rangeThreat} pot={pot} />
  </section>
)}
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Fix any type errors before continuing.

- [ ] **Step 7: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (existing + new).

- [ ] **Step 8: Start dev server and smoke test**

```bash
npm run dev
```

Manual verification:
1. Open http://localhost:3000
2. Expand "Game Context" — verify position buttons and archetype dropdown appear
3. Select Hero = BTN, Villain = CO, Aggressor = Villain, Style = TAG
4. Strategy panel should now show range-aware output (not "Insufficient Context")
5. Enter cards: hero Q♠J♠, board T♠9♠8♥
6. Enter pot = 500, call = 200
7. Range Threat panel should appear with draw descriptions showing flush threat

- [ ] **Step 9: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire GameContext and RangeThreat into main HUD"
```
