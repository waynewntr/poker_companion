# Preflop Advice Panel Implementation Plan

**Date:** 2026-09-22
**Branch:** feature/poker-companion-v1
**Scope:** When the user selects a villain's preflop action + positions, show the recommended hero response (range + sizing) in the right-column results area, driven by the preflop JSON ranges data.

## Global Constraints

1. **Data source:** The JSON ranges (attached by user in brainstorm session) are embedded as typed TypeScript constants in `src/data/preflopRanges.ts`. The three action families are:
   - `vs_single_limper` — villain LIMP → lookup by hero position
   - `vs_open_raise` — villain OPEN_RAISE → lookup by villain position then hero position
   - `vs_raise_and_caller` — villain SQUEEZE action → guidance text only

2. **Action label rename:** The "Action" label in GameContext becomes **"Villain's Action"** — the dropdown already exists, just rename the label text.

3. **Lookup function signature:**
   ```ts
   getPreflopAdvice(
     villainAction: PreflopAction,
     heroPosition: Position | undefined,
     villainPosition: Position | undefined,
     villainArchetype?: ArchetypeKey
   ): PreflopAdvice | null
   ```
   Returns `null` when insufficient context (e.g., action needs positions that aren't set).

4. **PreflopAdvice return type:**
   ```ts
   interface PreflopAdvice {
     suggestedAction: string;          // e.g., "ISO Raise" or "3-Bet"
     sizing: string;                   // e.g., "4bb in-position / 5bb OOP"
     valueRange: string[];             // explicit hand list e.g. ["QQ","KK","AA","AKs"]
     mixRange: string[];               // optional mix/semi-bluff hands
     adjustmentNote?: string;          // player-type adjustment from villainArchetype
   }
   ```

5. **Component placement:** `PreflopAdvicePanel` renders in the **right column** of page.tsx. It appears whenever `preflopAction` + `heroPosition` are both set (no board cards required). It lives above StrategyPanel when both would show.

6. **Styling:** Match existing dark-theme panel style. Use the same section wrapper (`rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4`) as StrategyPanel. Ranges displayed as compact comma-separated text.

7. **No new state:** Advice is derived purely from existing state (`preflopAction`, `heroPosition`, `villainPosition`, `villainArchetype`). No store changes.

8. **Testing:**
   - Unit tests for `getPreflopAdvice()` covering all three action families
   - Coverage: LIMP + hero position, OPEN_RAISE + positions, missing context returns null, player-type adjustment applied
   - All existing 163 tests must continue to pass

## Tasks

### Task 1: Create `src/data/preflopRanges.ts`
Encode the preflop JSON data as typed constants and export `getPreflopAdvice()`.

**Exact data to encode (from user's attached JSON `poker_preflop_action_response_ranges_explicit.json`):**

```
vs_single_limper.sizing = { in_position: "4bb", out_of_position: "5bb", extra_limper_rule: "Add about 1bb per additional limper." }

vs_single_limper.hero_ranges:
  HJ: { approx_pct: "12-17", range: ["77","88","99","TT","JJ","QQ","KK","AA","A9s","ATs","AJs","AQs","AKs","KTs","KJs","KQs","QTs","QJs","JTs","T9s","AJo","AQo","AKo","KQo"] }
  CO: { approx_pct: "18-22", range: ["66","77","88","99","TT","JJ","QQ","KK","AA","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K8s","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T9s","98s","ATo","AJo","AQo","AKo","KJo","KQo","QJo"] }
  BTN: { approx_pct: "22-30", range: ["44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T9s","98s","87s","76s","A9o","ATo","AJo","AQo","AKo","KTo","KJo","KQo","QTo","QJo","JTo"] }
  SB: { approx_pct: "14-20", range: ["66","77","88","99","TT","JJ","QQ","KK","AA","A8s","A9s","ATs","AJs","AQs","AKs","KTs","KJs","KQs","QTs","QJs","JTs","T9s","AJo","AQo","AKo","KQo"] }
  BB: { approx_pct: "16-22", range: ["66","77","88","99","TT","JJ","QQ","KK","AA","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K9s","KTs","KJs","KQs","QTs","QJs","JTs","T9s","98s","AJo","AQo","AKo","KQo"] }

vs_open_raise.sizing = { in_position: "3.0-3.5x open", out_of_position: "4.0-4.5x open" }

vs_open_raise.response_matrix (opener → responder → { three_bet_explicit, mix_explicit }):
  UTG → HJ: 3bet=["QQ","KK","AA","AKs","AKo","AQs"] mix=["JJ","AJs","A5s"]
  UTG → CO: 3bet=["JJ","QQ","KK","AA","AKs","AKo","AQs"] mix=["TT","AJs","A5s","A4s"]
  UTG → BTN: 3bet=["JJ","QQ","KK","AA","AQs","AKs","AKo"] mix=["TT","AJs","ATs","A5s","A4s","KQs"]
  UTG → SB: 3bet=["JJ","QQ","KK","AA","AQs","AKs","AKo"] mix=["TT","AJs","A5s","A4s","KQs"]
  UTG → BB: 3bet=["QQ","KK","AA","AKs","AKo","AQs"] mix=["JJ","TT","AJs","A5s","A4s","KQs"]
  HJ → CO: 3bet=["JJ","QQ","KK","AA","AQs","AKs","AKo"] mix=["TT","AJs","ATs","A5s","A4s","KQs","AQo"]
  HJ → BTN: 3bet=["TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"] mix=["99","ATs","A5s","A4s","KJs","QJs"]
  HJ → SB: 3bet=["TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"] mix=["99","ATs","A5s","A4s","KJs"]
  HJ → BB: 3bet=["JJ","QQ","KK","AA","AQs","AKs","AKo"] mix=["TT","99","AJs","ATs","A5s","A4s","KQs","KJs"]
  CO → BTN: 3bet=["TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"] mix=["99","88","ATs","A2s","A3s","A4s","A5s","KJs","QJs","JTs","T9s","65s","AJo","KQo"]
  CO → SB: 3bet=["TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"] mix=["99","88","ATs","A2s","A3s","A4s","A5s","KJs","QJs","JTs","T9s","AJo","KQo"]
  CO → BB: 3bet=["JJ","QQ","KK","AA","AQs","AKs","AKo"] mix=["TT","99","AJs","ATs","A2s","A3s","A4s","A5s","KQs","KJs","QJs","JTs","T9s"]
  BTN → SB: 3bet=["99","TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"] mix=["88","77","ATs","A2s","A3s","A4s","A5s","KJs","KTs","QJs","QTs","JTs","T9s","AJo","KQo"]
  BTN → BB: 3bet=["TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"] mix=["99","88","ATs","A2s","A3s","A4s","A5s","KJs","QJs","JTs","T9s","98s","AJo","KQo"]
  SB → BB: 3bet=["99","TT","JJ","QQ","KK","AA","ATs","AJs","AQs","AKs","AQo","AKo","KQs"] mix=["88","77","A2s","A3s","A4s","A5s","KJs","KTs","QJs","QTs","JTs","T9s","98s","AJo","KQo"]

player_type_adjustments:
  nit: "TIGHTEN — Reduce bluff 3-bets; respect tighter opening ranges."
  tag: "BASELINE"
  lag: "WIDEN — Widen value and selected semi-bluff 3-bets."
  calling_station: "TIGHTEN_AND_LINEARIZE — Their raise is usually far stronger than their VPIP."
  maniac: "WIDEN_VALUE — Widen value 3-bets; reduce weak bluffs if they rarely fold."

vs_raise_and_caller.guidance = "Use a stronger value range than versus a single opener. Prefer blocker hands and suited hands with strong postflop playability. Exact squeeze ranges depend strongly on opener position, caller position, rake, stack depth and tendencies."
vs_raise_and_caller.sizing = { in_position: "about 4x opener + 1x opener per caller", out_of_position: "about 5x opener + 1x opener per caller" }
```

**getPreflopAdvice logic:**
- If villainAction = "LIMP": look up `vs_single_limper.hero_ranges[heroPosition]`. If heroPosition undefined or no entry: return null. suggestedAction = "ISO Raise". sizing = based on position (heroPosition behind villain = in-position → "4bb", SB/BB = out-of-position → "5bb"). Apply adjustments from villainArchetype.
- If villainAction = "OPEN_RAISE": look up `vs_open_raise.response_matrix[villainPosition][heroPosition]`. If either position undefined or no entry: return null. suggestedAction = "3-Bet (value) / Call (mix)". sizing = "3.0-3.5x in-position / 4.0-4.5x OOP". Apply player-type adjustments.
- If villainAction = "SQUEEZE": return guidance text. suggestedAction = "Squeeze". sizing from vs_raise_and_caller.sizing.
- All other actions (THREE_BET, FOUR_BET, CALL_OPEN, FOLD, ISO_RAISE): return null (no data for these).

**Files:** `src/data/preflopRanges.ts` (new), `src/tests/preflopRanges.test.ts` (new)

**Tests:** getPreflopAdvice() for all paths: LIMP + heroPosition, OPEN_RAISE + both positions, missing context → null, player-type adjustment applied, SQUEEZE returns guidance.

### Task 2: Create `PreflopAdvicePanel` component + wire into page
Two small changes in one task: create the display component and add it to page.tsx, plus rename the GameContext label.

**PreflopAdvicePanel (`src/components/PreflopAdvicePanel.tsx`):**
- Props: `{ advice: PreflopAdvice }` (imported from preflopRanges)
- Renders in section with same wrapper style as StrategyPanel: `rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4`
- Title row: "Preflop Response" label (same `text-xs uppercase tracking-widest text-gray-500` style)
- Content:
  - "Suggested action" → `advice.suggestedAction` (white text)
  - "Sizing" → `advice.sizing` (gray-300)
  - "Value range" → comma-separated `advice.valueRange` (green-400, small text, wraps)
  - "Mix / bluff range" → comma-separated `advice.mixRange` (amber-400, small text, wraps) — only if mixRange.length > 0
  - "Adjustment" → `advice.adjustmentNote` (gray-500 italic) — only if present
- No collapsible/toggle needed; always expanded

**page.tsx changes:**
- Import `getPreflopAdvice` from `@/data/preflopRanges`
- Import `PreflopAdvicePanel` from `@/components/PreflopAdvicePanel`
- Read `preflopAction`, `heroPosition`, `villainPosition`, `villainArchetype` from handStore (already read)
- Compute `preflopAdvice` in useMemo: `getPreflopAdvice(preflopAction, heroPosition, villainPosition, villainArchetype ?? undefined)`
- In right column, render before StrategyPanel:
  ```tsx
  {preflopAdvice && (
    <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
      <PreflopAdvicePanel advice={preflopAdvice} />
    </section>
  )}
  ```

**GameContext.tsx change:**
- Find the label `"Action"` for the preflop action selector and rename to `"Villain's Action"`
- Find the ACTION_LABELS record and give actions human-readable labels:
  - OPEN_RAISE → "Open Raise"
  - LIMP → "Limp"
  - CALL_OPEN → "Call Open"
  - THREE_BET → "3-Bet"
  - FOUR_BET → "4-Bet"
  - ISO_RAISE → "ISO Raise"
  - SQUEEZE → "Squeeze"
  - FOLD → "Fold"

**Files:** `src/components/PreflopAdvicePanel.tsx` (new), `src/app/page.tsx`, `src/components/GameContext.tsx`

**Tests:** Run existing suite `npm test` — all 163 tests must pass. No new component tests required (pure display component with no logic).
