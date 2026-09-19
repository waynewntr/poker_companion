"use client";

import { useMemo } from "react";
import type { PreFlopContext } from "@/domain/hand";
import Board from "@/components/Board";
import BetSizeButtons from "@/components/BetSizeButtons";
import CardPicker from "@/components/CardPicker";
import DecisionResultPanel from "@/components/DecisionResult";
import DrawSummary from "@/components/DrawSummary";
import MoneyInput from "@/components/MoneyInput";
import StackSummary from "@/components/StackSummary";
import StrategyPanel from "@/components/StrategyPanel";
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

  const heroCards = getHeroCards(slots);
  const board = getBoardCards(slots);
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
      pot,
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 py-6">
      <header className="space-y-3">
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

      <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <Board />
      </section>

      <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
        <CardPicker />
      </section>

      <section className="space-y-3 rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
        <p className="text-xs uppercase tracking-widest text-gray-500">Pot Setup</p>
        <MoneyInput label="Pot" value={pot} onChange={setPot} />
        <MoneyInput label="Call" value={amountToCall} onChange={setAmountToCall} />

        {pot > 0 && <BetSizeButtons pot={pot} onSelect={setAmountToCall} />}

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

      <details className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
        <summary className="cursor-pointer text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300">
          Stack sizes (optional)
        </summary>
        <div className="mt-3 space-y-3">
          <MoneyInput label="My Stack" value={heroStack ?? 0} onChange={(value) => setHeroStack(value || undefined)} />
          <MoneyInput label="Villain" value={villainStack ?? 0} onChange={(value) => setVillainStack(value || undefined)} />
        </div>
      </details>

      {board.length >= 3 && decisionResult && (
        <section className="space-y-4 rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
          <p className="text-xs uppercase tracking-widest text-gray-500">Decision</p>
          <DecisionResultPanel result={decisionResult} />

          {currentHand && (
            <p className="text-xs text-gray-500">
              Current hand: <span className="text-gray-300">{currentHand.description}</span>
            </p>
          )}

          <DrawSummary drawAnalysis={drawAnalysis} outsResult={outsResult} />
          <StackSummary />
        </section>
      )}

      {board.length >= 3 && strategyResult && (
        <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
          <StrategyPanel strategy={strategyResult} pot={pot} />
        </section>
      )}
    </main>
  );
}
