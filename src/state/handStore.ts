import { create } from "zustand";
import { Card, cardKey } from "@/domain/cards";
import type { ArchetypeKey } from "@/data/archetypeRanges";
import { GameMode, Street, Position, PotType } from "@/domain/hand";

export type SlotName =
  | "hero1" | "hero2" | "hero3" | "hero4"
  | "flop1" | "flop2" | "flop3"
  | "turn" | "river";

const SLOT_ORDER: SlotName[] = [
  "hero1", "hero2", "flop1", "flop2", "flop3", "turn", "river",
];

const NLHE_SLOT_ORDER: SlotName[] = ["hero1", "hero2", "flop1", "flop2", "flop3", "turn", "river"];
const PLO_SLOT_ORDER: SlotName[] = ["hero1", "hero2", "hero3", "hero4", "flop1", "flop2", "flop3", "turn", "river"];

export interface HandStore {
  // Card slots
  slots: Record<SlotName, Card | null>;

  // Money
  pot: number;
  amountToCall: number;
  heroStack: number | undefined;
  villainStack: number | undefined;
  isAllIn: boolean;

  // Game settings
  gameMode: GameMode;
  gameType: "nlhe" | "plo";

  // Strategy context
  heroPosition: Position | undefined;
  villainPosition: Position | undefined;
  villainArchetype: ArchetypeKey | undefined;
  preflopAggressor: "hero" | "villain" | undefined;
  potType: PotType | undefined;
  numPlayers: number;

  // UI state
  activeSlot: SlotName | null;

  // Actions
  selectCard: (card: Card) => void;
  clearSlot: (slot: SlotName) => void;
  setActiveSlot: (slot: SlotName | null) => void;
  setPot: (v: number) => void;
  setAmountToCall: (v: number) => void;
  setHeroStack: (v: number | undefined) => void;
  setVillainStack: (v: number | undefined) => void;
  setIsAllIn: (v: boolean) => void;
  setGameMode: (mode: GameMode) => void;
  setGameType: (t: "nlhe" | "plo") => void;
  setHeroPosition: (p: Position | undefined) => void;
  setVillainPosition: (p: Position | undefined) => void;
  setVillainArchetype: (a: ArchetypeKey | undefined) => void;
  setPreflopAggressor: (a: "hero" | "villain" | undefined) => void;
  setPotType: (t: PotType | undefined) => void;
  setNumPlayers: (n: number) => void;
  newHand: () => void;
}

const EMPTY_SLOTS: Record<SlotName, Card | null> = {
  hero1: null, hero2: null, hero3: null, hero4: null,
  flop1: null, flop2: null, flop3: null,
  turn: null, river: null,
};

export const useHandStore = create<HandStore>((set, get) => ({
  slots: { ...EMPTY_SLOTS },
  pot: 0,
  amountToCall: 0,
  heroStack: undefined,
  villainStack: undefined,
  isAllIn: false,
  gameMode: "cash",
  gameType: "nlhe",
  heroPosition: undefined,
  villainPosition: undefined,
  villainArchetype: undefined,
  preflopAggressor: undefined,
  potType: undefined,
  numPlayers: 2,
  activeSlot: "hero1",

  selectCard: (card: Card) => {
    const { activeSlot, slots } = get();
    if (!activeSlot) return;

    // Block duplicate card selection
    const usedKeys = new Set(
      Object.values(slots)
        .filter((c): c is Card => c !== null)
        .map(cardKey)
    );
    if (usedKeys.has(cardKey(card))) return;

    const newSlots = { ...slots, [activeSlot]: card };

    // Auto-advance to next empty slot
    const slotOrder = get().gameType === "plo" ? PLO_SLOT_ORDER : NLHE_SLOT_ORDER;
    const currentIdx = slotOrder.indexOf(activeSlot);
    let nextSlot: SlotName | null = null;
    for (let i = currentIdx + 1; i < slotOrder.length; i++) {
      if (newSlots[slotOrder[i]] === null) {
        nextSlot = slotOrder[i];
        break;
      }
    }

    set({ slots: newSlots, activeSlot: nextSlot });
  },

  clearSlot: (slot: SlotName) => {
    const { slots } = get();
    set({ slots: { ...slots, [slot]: null }, activeSlot: slot });
  },

  setActiveSlot: (slot) => set({ activeSlot: slot }),
  setPot: (v) => set({ pot: Math.max(0, v) }),
  setAmountToCall: (v) => set({ amountToCall: Math.max(0, v) }),
  setHeroStack: (v) => set({ heroStack: v }),
  setVillainStack: (v) => set({ villainStack: v }),
  setIsAllIn: (v) => set({ isAllIn: v }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setGameType: (t) => {
    const { gameMode, heroStack, villainStack, heroPosition, villainPosition, preflopAggressor, potType, numPlayers, villainArchetype } = get();
    set({
      slots: { ...EMPTY_SLOTS },
      pot: 0,
      amountToCall: 0,
      isAllIn: false,
      activeSlot: "hero1",
      gameType: t,
      gameMode,
      heroStack,
      villainStack,
      heroPosition,
      villainPosition,
      preflopAggressor,
      potType,
      numPlayers,
      villainArchetype,
    });
  },
  setHeroPosition: (p) => set({ heroPosition: p }),
  setVillainPosition: (p) => set({ villainPosition: p }),
  setVillainArchetype: (a) => set({ villainArchetype: a }),
  setPreflopAggressor: (a) => set({ preflopAggressor: a }),
  setPotType: (t) => set({ potType: t }),
  setNumPlayers: (n) => set({ numPlayers: n }),

  newHand: () => {
    const { gameMode, gameType, heroStack, villainStack, heroPosition, villainPosition, villainArchetype, preflopAggressor, potType, numPlayers } = get();
    set({
      slots: { ...EMPTY_SLOTS },
      pot: 0,
      amountToCall: 0,
      isAllIn: false,
      activeSlot: "hero1",
      // Retain settings
      gameMode,
      heroStack,
      villainStack,
      heroPosition,
      villainPosition,
      villainArchetype,
      preflopAggressor,
      potType,
      numPlayers,
      gameType,
    });
  },
}));

// Selector helpers (pure functions — call outside of Zustand to avoid re-renders)
export function getHeroCards(slots: Record<SlotName, Card | null>): Card[] {
  return [slots.hero1, slots.hero2].filter((c): c is Card => c !== null);
}

export function getHeroCardsForMode(
  slots: Record<SlotName, Card | null>,
  gameType: "nlhe" | "plo"
): Card[] {
  if (gameType === "plo") {
    return [slots.hero1, slots.hero2, slots.hero3, slots.hero4].filter((c): c is Card => c !== null);
  }
  return [slots.hero1, slots.hero2].filter((c): c is Card => c !== null);
}

export function getBoardCards(slots: Record<SlotName, Card | null>): Card[] {
  return [slots.flop1, slots.flop2, slots.flop3, slots.turn, slots.river]
    .filter((c): c is Card => c !== null);
}

export function getAllUsedCards(slots: Record<SlotName, Card | null>): Card[] {
  return Object.values(slots).filter((c): c is Card => c !== null);
}

export function getCurrentStreet(slots: Record<SlotName, Card | null>): Street {
  const board = getBoardCards(slots);
  if (board.length >= 5) return "river";
  if (board.length >= 4) return "turn";
  if (board.length >= 3) return "flop";
  return "preflop";
}

export function getEffectiveStack(
  heroStack: number | undefined,
  villainStack: number | undefined
): number | undefined {
  if (heroStack !== undefined && villainStack !== undefined) {
    return Math.min(heroStack, villainStack);
  }
  return undefined;
}

export function getSPR(
  effectiveStack: number | undefined,
  pot: number
): number | undefined {
  if (effectiveStack === undefined || pot <= 0) return undefined;
  return effectiveStack / pot;
}
