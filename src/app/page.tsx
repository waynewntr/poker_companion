"use client";

import { useMemo } from "react";
import type { PreFlopContext } from "@/domain/hand";
import Board from "@/components/Board";
import BetSizeButtons from "@/components/BetSizeButtons";
import CardPicker from "@/components/CardPicker";
import DecisionResultPanel from "@/components/DecisionResult";
import DrawSummary from "@/components/DrawSummary";
import GameContext from "@/components/GameContext";
import MoneyInput from "@/components/MoneyInput";
import RangeThreatPanel from "@/components/RangeThreat";
import StackSummary from "@/components/StackSummary";
import StrategyPanel from "@/components/StrategyPanel";
import { getVillainCombos } from "@/data/archetypeRanges";
import { calculateDecision } from "@/poker/decisionEngine";
import { detectDraws } from "@/poker/draws";
import { evaluateBestHand } from "@/poker/evaluator";
import { calculateOuts } from "@/poker/outs";
import {
  getBoardCards,
  getCurrentStreet,
  getEffectiveStack,
  getHeroCards,
  getSPR,
  SlotName,
  useHandStore,
} from "@/state/handStore";
import { analyzeBoardTexture } from "@/strategy/boardTexture";
import { getFlopStrategy } from "@/strategy/flopStrategy";
import { getRiverStrategy } from "@/strategy/riverStrategy";
import { getTurnStrategy } from "@/strategy/turnStrategy";
import { analyzeVillainRange, type RangeThreat } from "@/strategy/villainRange";

const ALL_SLOTS: SlotName[] = ["hero1", "hero2", "flop1", "flop2", "flop3", "turn", "river"];

export default function Home() {
  const slots = useHandStore((state) => state.slots);
  const pot = useHandStore((state) => state.pot);
  const amountToCall = useHandStore((state) => state.amountToCall);
  const heroStack = useHandStore((state) => state.heroStack);
  const villainStack = useHandStore((state) => state.villainStack);
  const isAllIn = useHandStore((state) => state.isAllIn);
  const gameMode = useHandStore((state) => state.gameMode);
  const heroPosition = useHandStore((state) => state.heroPosition);
  const villainPosition = useHandStore((state) => state.villainPosition);
  const villainArchetype = useHandStore((state) => state.villainArchetype);
  const preflopAggressor = useHandStore((state) => state.preflopAggressor);
  const potType = useHandStore((state) => state.potType);
  const numPlayers = useHandStore((state) => state.numPlayers);

  const setPot = useHandStore((state) => state.setPot);
  const setAmountToCall = useHandStore((state) => state.setAmountToCall);
  const setHeroStack = useHandStore((state) => state.setHeroStack);
  const setVillainStack = useHandStore((state) => state.setVillainStack);
  const setIsAllIn = useHandStore((state) => state.setIsAllIn);
  const setGameMode = useHandStore((state) => state.setGameMode);
  const newHand = useHandStore((state) => state.newHand);

  const heroCards = useMemo(() => getHeroCards(slots), [slots]);
  const board = useMemo(() => getBoardCards(slots), [slots]);
  const street = getCurrentStreet(slots);
  const effectiveStack = getEffectiveStack(heroStack, villainStack);
  const spr = getSPR(effectiveStack, pot);
  const occupiedCount = ALL_SLOTS.filter((slot) => slots[slot] !== null).length;

  const hand = useMemo(
    () => ({
      gameMode,
      heroCards,
      board,
      street,
      // Pot entered by user is pre-bet; add call so engine sees spec pot (villain's bet already in middle)
      pot: pot + amountToCall,
      amountToCall,
      heroStack,
      villainStack,
      isAllIn,
    }),
    [gameMode, heroCards, board, street, pot, amountToCall, heroStack, villainStack, isAllIn],
  );

  const preflopContext: PreFlopContext = useMemo(
    () => ({
      heroPosition,
      villainPosition,
      preflopAggressor,
      potType,
      numPlayers,
    }),
    [heroPosition, villainPosition, preflopAggressor, potType, numPlayers],
  );

  const { outsResult, drawAnalysis, currentHand, decisionResult, strategyResult } = useMemo(() => {
    const outs = calculateOuts(heroCards, board);
    const draws = detectDraws(heroCards, board);
    const current = heroCards.length > 0 ? evaluateBestHand(heroCards, board) : null;
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

    return {
      outsResult: outs,
      drawAnalysis: draws,
      currentHand: current,
      decisionResult: decision,
      strategyResult: strategy,
    };
  }, [heroCards, board, hand, preflopContext, amountToCall, street, spr]);

  const rangeThreat: RangeThreat | null = useMemo(() => {
    if (
      !villainArchetype || !villainPosition ||
      heroCards.length < 2 || board.length < 3 || !currentHand
    ) {
      return null;
    }

    const blocked = [...heroCards, ...board];
    const combos = getVillainCombos(villainArchetype, villainPosition, blocked);

    return analyzeVillainRange(
      combos,
      heroCards,
      board,
      currentHand,
      villainArchetype,
      villainPosition,
    );
  }, [villainArchetype, villainPosition, heroCards, board, currentHand]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Header — full width */}
      <header className="mb-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Poker Odds Companion</p>
            <h1 className="mt-1 text-lg font-black tracking-tight text-white">Local Hold&apos;em HUD</h1>
          </div>
          <button
            onClick={newHand}
            className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-300 transition-colors hover:bg-[#2A2A3F]"
          >
            New Hand
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex overflow-hidden rounded border border-[#2A2A35]">
            {(["cash", "tournament"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setGameMode(mode)}
                className={[
                  "px-3 py-1 text-xs font-bold uppercase tracking-widest transition-colors",
                  gameMode === mode
                    ? "bg-[#2A2A3F] text-white"
                    : "bg-[#1A1A1F] text-gray-500 hover:text-gray-300",
                ].join(" ")}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="text-right text-[11px] uppercase tracking-widest text-gray-500">
            <p>{occupiedCount}/7 cards set</p>
            <p>{street === "preflop" ? "Waiting for flop" : street}</p>
          </div>
        </div>

        {gameMode === "tournament" && (
          <p className="text-[11px] uppercase tracking-widest text-amber-400">Chip-EV only</p>
        )}
      </header>

      {/* Two-column layout: left = entry, right = results */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* LEFT COLUMN — pot setup → hand → card picker → stacks */}
        <div className="flex flex-col gap-4">

          {/* Pot setup sits ABOVE your hand */}
          <section className="space-y-3 rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
            <p className="text-xs uppercase tracking-widest text-gray-500">Pot Setup</p>

            {/* Pot and Call side by side; pot = pre-bet amount (villain's bet NOT yet included) */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <MoneyInput label="Pot" value={pot} onChange={setPot} stacked />
              </div>
              <div className="flex-1">
                <MoneyInput label="Call" value={amountToCall} onChange={setAmountToCall} stacked />
              </div>
              {/* Advances to next street: adds villain's bet + hero's call to the pot */}
              <button
                onClick={() => { setPot(pot + 2 * amountToCall); setAmountToCall(0); }}
                disabled={amountToCall <= 0}
                title="Add villain's bet + your call to pot (advance street)"
                className="mb-0.5 flex h-[38px] w-10 shrink-0 items-center justify-center rounded border border-[#2A2A35] bg-[#1A1A1F] text-lg font-bold text-gray-300 transition-colors hover:bg-[#2A2A3F] disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
            </div>
            <p className="text-[10px] text-gray-600">
              Pot = amount before villain&apos;s bet · Call = villain&apos;s bet · + advances the pot after you call
            </p>

            {pot > 0 && <BetSizeButtons pot={pot + amountToCall} onSelect={setAmountToCall} />}

            <div className="flex items-center gap-3 pt-1">
              <span className="w-16 shrink-0 text-xs uppercase tracking-widest text-gray-400">All-In</span>
              <button
                onClick={() => setIsAllIn(!isAllIn)}
                className={[
                  "h-6 w-10 rounded-full border transition-colors",
                  isAllIn ? "border-blue-500 bg-blue-600" : "border-[#2A2A35] bg-[#0D0D0F]",
                ].join(" ")}
                aria-pressed={isAllIn}
                aria-label="Toggle all-in"
              >
                <span
                  className={[
                    "mx-1 block h-4 w-4 rounded-full bg-white transition-transform",
                    isAllIn ? "translate-x-4" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </div>
          </section>

          <GameContext />

          {/* Your hand + board */}
          <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <Board />
          </section>

          {/* 52-card picker */}
          <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
            <CardPicker />
          </section>

          {/* Stack sizes (optional) */}
          <details className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
            <summary className="cursor-pointer text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300">
              Stack sizes (optional)
            </summary>
            <div className="mt-3 space-y-3">
              <MoneyInput label="My Stack" value={heroStack ?? 0} onChange={(value) => setHeroStack(value || undefined)} />
              <MoneyInput label="Villain" value={villainStack ?? 0} onChange={(value) => setVillainStack(value || undefined)} />
            </div>
          </details>
        </div>

        {/* RIGHT COLUMN — decision + strategy results */}
        <div className="flex flex-col gap-4">
          {heroCards.length === 2 && board.length >= 3 && decisionResult ? (
            <>
              <section className="space-y-4 rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
                <p className="text-xs uppercase tracking-widest text-gray-500">Decision</p>
                <DecisionResultPanel
                  result={decisionResult}
                  currentHand={currentHand?.description}
                  pot={pot}
                  amountToCall={amountToCall}
                />

                <DrawSummary drawAnalysis={drawAnalysis} outsResult={outsResult} />
                <StackSummary />
              </section>

              {strategyResult && (
                <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
                  <StrategyPanel strategy={strategyResult} pot={pot} />
                </section>
              )}

              {rangeThreat && (
                <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
                  <RangeThreatPanel threat={rangeThreat} pot={pot} />
                </section>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#2A2A35] p-10 text-center">
              <p className="text-xs uppercase tracking-widest text-gray-600">Results</p>
              <p className="text-sm text-gray-500">
                {heroCards.length < 2
                  ? "Select your 2 hole cards to begin"
                  : "Enter the flop to see the decision"}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
