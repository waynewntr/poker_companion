Status: done

Commits: feat(plo): extend store with gameType, hero3/hero4 slots, getHeroCardsForMode

Tests: npx tsc --noEmit (pass); npx vitest run (pass: 16 files, 127 tests)

Concerns: any future test fixtures or mock stores that model slots as Record<SlotName, Card | null> must include hero3 and hero4 now that SlotName is widened for PLO.
