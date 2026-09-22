# Preflop Action System Implementation Plan

**Date:** 2026-09-21  
**Scope:** Replace binary aggressor selection with rich preflop action + sizing context, add sticky header, add R/BB unit toggle  
**Status:** Active  

## Overview

This plan replaces the binary `preflopAggressor` ("hero" | "villain") toggle with a full preflop action system that captures:
- **Action type** (Open Raise, Limp, Call Open, 3-Bet, 4-Bet, ISO Raise, Squeeze, Fold, etc.)
- **Action sizing** (multiplier like "3.5x BB" or "2.5x open", absolute amount, or null for Limp/Call/Fold)
- **Currency unit toggle** (R vs BB) that converts all money displays and inputs
- **Sticky header** to keep controls visible during scroll

## Global Constraints

1. **Preflop action state**:
   - Store in handStore as `preflopAction` (type) + `preflopActionSize` (sizing string or null)
   - New types: "OPEN_RAISE" | "LIMP" | "CALL_OPEN" | "THREE_BET" | "FOUR_BET" | "ISO_RAISE" | "SQUEEZE" | "FOLD" | undefined
   - Sizing format: either a string like "3.5x BB", "2.5x open", "50" (absolute), or null
   - When newHand() is called, reset both to undefined/null

2. **Currency unit toggle**:
   - Add `amountUnit: "R" | "BB"` to handStore (default "R")
   - Conversion function: `convertAmount(value: number, fromUnit: "R" | "BB", toUnit: "R" | "BB", bigBlind: number): number`
   - All money display components check this flag before rendering
   - BigBlind value (from inputs) is the conversion reference
   - Toggle persists for the session

3. **UI Layout**:
   - Header (`<header>`) becomes `sticky top-0 z-10 bg-[#0D0D0F]` (or match page bg)
   - GameContext panel replaces "Aggressor" toggle with "Preflop Action" section containing:
     - Action dropdown (select action type)
     - Sizing input (appears conditionally: show for raises, hide for Limp/Call/Fold)
   - Unit toggle in header (right side, near "New Hand" button)

4. **Affected Components**:
   - handStore.ts: new state + actions
   - GameContext.tsx: replace aggressor UI with action + sizing controls
   - page.tsx: add sticky positioning to header, integrate unit toggle
   - MoneyInput.tsx: use amountUnit flag for display/input
   - BetSizeButtons.tsx: display in selected unit
   - All strategy modules continue to use preflopContext but now fed from new action fields

5. **Testing**:
   - State stores action + sizing correctly
   - Unit conversion round-trips (R → BB → R = original value)
   - Sticky header stays visible when scrolling left column
   - All money values display in selected unit without losing precision
   - newHand() clears action + sizing + unit stays persistent
   - Switching game type (NLHE ↔ PLO) preserves action context

## Implementation Tasks

### Task 1: Update handStore with preflop action + unit state
- **Scope:** Extend handStore.ts with new fields and actions
- **Changes:**
  - Add `preflopAction` type definition
  - Add `preflopActionSize` string field
  - Add `amountUnit: "R" | "BB"` field (default "R")
  - Add setters: `setPreflopAction()`, `setPreflopActionSize()`, `setAmountUnit()`
  - Add `convertAmount()` utility function
  - Update `newHand()` to reset action + sizing (keep unit)
  - Update `setGameType()` to preserve action context
- **Test:** Store + convert amounts; verify newHand clears action; verify unit persists
- **Files:** src/state/handStore.ts

### Task 2: Refactor GameContext to show action + sizing controls
- **Scope:** Replace aggressor toggle with action selector + sizing input
- **Changes:**
  - Remove "Aggressor" button group
  - Add "Preflop Action" section with:
    - Dropdown selector for action type (curated list)
    - Conditional sizing input (text field with placeholder "e.g., 3.5x BB")
    - Helper text showing recommended range if available
  - Wire to new handStore state
  - Show selected action + sizing in the summary line
- **Test:** Action selection updates state; sizing input shows/hides correctly; summary updates
- **Files:** src/components/GameContext.tsx

### Task 3: Make header sticky + add unit toggle
- **Scope:** Position header sticky and add R/BB unit toggle button
- **Changes:**
  - Add `sticky top-0 z-10 bg-[#0D0D0F]` to `<header>` (or inherit page bg)
  - Add unit toggle button in header (right side, next to "New Hand" or in a separate row)
  - Toggle shows current unit, clicking switches between "R" and "BB"
  - Wire to `amountUnit` state
- **Test:** Header stays visible when scrolling; toggle switches unit; other controls respond
- **Files:** src/app/page.tsx

### Task 4: Wire unit conversions in money inputs + displays
- **Scope:** Update MoneyInput, BetSizeButtons, and all money displays to use amountUnit
- **Changes:**
  - MoneyInput: display label includes unit suffix (e.g., "Pot (R)" or "Pot (BB)")
  - On input, store the raw value (e.g., if user enters "100" in BB mode, store 100 in R internally using bigBlind as reference)
  - On display, convert stored R value to selected unit
  - BetSizeButtons: show amounts in selected unit
  - StackSummary, SPR display: use selected unit
  - Preserve user-entered raw value; conversion happens only at display time
- **Test:** Enter value in R, toggle to BB, toggle back; value round-trips; no precision loss
- **Files:** src/components/MoneyInput.tsx, src/components/BetSizeButtons.tsx, src/components/StackSummary.tsx (or relevant display files)

### Task 5: Update strategy modules to consume preflopAction context
- **Scope:** Adapt flopStrategy, turnStrategy, riverStrategy to use new action data
- **Changes:**
  - Pass `preflopAction` + `preflopActionSize` via `preflopContext`
  - Modules can now apply more granular recommendations based on exact action (e.g., 3-bet vs open raise)
  - For now: no logic change required, just consume the new fields when available
  - Strategy recommendations remain unchanged unless action warrants refinement
- **Test:** Strategy still calculates correctly; breakage in postflop logic is caught by existing tests
- **Files:** src/strategy/flopStrategy.ts, src/strategy/turnStrategy.ts, src/strategy/riverStrategy.ts, src/domain/hand.ts (PreFlopContext type)

### Task 6: Full integration test + UI polish
- **Scope:** Test all flows together; ensure no regressions
- **Changes:**
  - Test new hand → set positions → select action → enter sizing → toggle unit → observe all displays update
  - Test sticky header scrolling behavior
  - Test unit toggle persistence across hands
  - Verify all tests pass (existing test suite)
  - Polish: ensure colors, spacing, and feedback match existing design
- **Test:** Full user flow works end-to-end; no broken components; existing tests pass
- **Files:** src/tests/page.test.tsx (or create new integration test)

## Notes

- **Decision: Action List Scope** — Start with core actions (Open Raise, Limp, Call, 3-Bet, 4-Bet, ISO Raise, Squeeze, Fold). Additional actions can be added later without state schema changes.
- **Decision: Sizing Format** — String field ("3.5x BB", "2.5x open", "50") allows flexibility; parsing deferred to display logic.
- **Decision: BigBlind as Conversion Reference** — User provides bigBlind amount in Pot Setup; all R ↔ BB conversions use this value.
- **Non-Goal:** Historical action ranges from your JSON data are noted for future refinement; for now, action + sizing are captured but not used to filter strategy recommendations.

## Completion Criteria

- ✅ All tasks complete + pass review
- ✅ No regressions in existing tests
- ✅ Preflop action + sizing captured and persisted in store
- ✅ Unit toggle works end-to-end (all displays convert correctly)
- ✅ Sticky header visible during scroll
- ✅ Deployment ready (no TODOs or placeholders in code)
