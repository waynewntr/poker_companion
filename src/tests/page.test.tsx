import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArchetypeKey } from "@/data/archetypeRanges";
import type { Card } from "@/domain/cards";
import type { GameMode, Position, PotType } from "@/domain/hand";
import type { SlotName } from "@/state/handStore";

interface FakeState {
  slots: Record<SlotName, Card | null>;
  pot: number;
  amountToCall: number;
  heroStack: number | undefined;
  villainStack: number | undefined;
  isAllIn: boolean;
  gameMode: GameMode;
  heroPosition: Position | undefined;
  villainPosition: Position | undefined;
  villainArchetype: ArchetypeKey | undefined;
  preflopAggressor: "hero" | "villain" | undefined;
  potType: PotType | undefined;
  numPlayers: number;
  activeSlot: SlotName | null;
  setPot: ReturnType<typeof vi.fn>;
  setAmountToCall: ReturnType<typeof vi.fn>;
  setHeroStack: ReturnType<typeof vi.fn>;
  setVillainStack: ReturnType<typeof vi.fn>;
  setIsAllIn: ReturnType<typeof vi.fn>;
  setGameMode: ReturnType<typeof vi.fn>;
  newHand: ReturnType<typeof vi.fn>;
}

const { fakeState } = vi.hoisted(() => ({
  fakeState: {
    slots: {
      hero1: null,
      hero2: null,
      flop1: null,
      flop2: null,
      flop3: null,
      turn: null,
      river: null,
    } as Record<SlotName, Card | null>,
    pot: 0,
    amountToCall: 0,
    heroStack: undefined,
    villainStack: undefined,
    isAllIn: false,
    gameMode: "cash",
    heroPosition: undefined,
    villainPosition: undefined,
    villainArchetype: undefined,
    preflopAggressor: undefined,
    potType: undefined,
    numPlayers: 2,
    activeSlot: "hero1",
    setPot: vi.fn(),
    setAmountToCall: vi.fn(),
    setHeroStack: vi.fn(),
    setVillainStack: vi.fn(),
    setIsAllIn: vi.fn(),
    setGameMode: vi.fn(),
    newHand: vi.fn(),
  } as FakeState,
}));

const mockThreat = {
  archetype: "TAG",
  villainPosition: "CO",
  totalCombos: 10,
  beatHeroCount: 2,
  beatHeroPct: 0.2,
  drawingToWinCount: 3,
  drawingToWinPct: 0.3,
  drawDescriptions: ["Flush draw: 3 combos"],
  equityDenialFraction: 0.5,
  threatLevel: "HIGH" as const,
};

vi.mock("@/components/RangeThreat", () => ({
  default: ({ pot }: { threat: unknown; pot: number }) => createElement("div", null, `RangeThreatMock pot=${pot}`),
}));

vi.mock("@/state/handStore", async () => {
  const actual = await vi.importActual<typeof import("@/state/handStore")>("@/state/handStore");

  return {
    ...actual,
    useHandStore: <T,>(selector: (state: FakeState) => T) => selector(fakeState),
  };
});

vi.mock("@/strategy/villainRange", async () => ({
  analyzeVillainRange: vi.fn(() => mockThreat),
}));

import Home from "@/app/page";

function makeCard(rank: Card["rank"], suit: Card["suit"]): Card {
  return { rank, suit };
}

function resetStore() {
  fakeState.slots = {
    hero1: null,
    hero2: null,
    flop1: null,
    flop2: null,
    flop3: null,
    turn: null,
    river: null,
  };
  fakeState.pot = 0;
  fakeState.amountToCall = 0;
  fakeState.heroStack = undefined;
  fakeState.villainStack = undefined;
  fakeState.isAllIn = false;
  fakeState.gameMode = "cash";
  fakeState.heroPosition = undefined;
  fakeState.villainPosition = undefined;
  fakeState.villainArchetype = undefined;
  fakeState.preflopAggressor = undefined;
  fakeState.potType = undefined;
  fakeState.numPlayers = 2;
  fakeState.activeSlot = "hero1";
}

describe("Home page wiring", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  it("renders the Game Context section", () => {
    const html = renderToStaticMarkup(createElement(Home));

    expect(html).toContain("Game Context");
  });

  it("passes the user-entered pot to the range threat panel", () => {
    fakeState.slots = {
      hero1: makeCard("Q", "s"),
      hero2: makeCard("J", "s"),
      flop1: makeCard("T", "s"),
      flop2: makeCard("9", "s"),
      flop3: makeCard("8", "h"),
      turn: null,
      river: null,
    };
    fakeState.pot = 500;
    fakeState.amountToCall = 200;
    fakeState.heroPosition = "BTN";
    fakeState.villainPosition = "CO";
    fakeState.villainArchetype = "tag";
    fakeState.preflopAggressor = "villain";
    fakeState.potType = "srp";
    fakeState.numPlayers = 2;

    const html = renderToStaticMarkup(createElement(Home));

    expect(html).toContain("RangeThreatMock pot=500");
    expect(html).not.toContain("RangeThreatMock pot=700");
  });
});