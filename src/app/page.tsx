"use client";

import { useMemo, useState } from "react";
import type { PreFlopContext } from "@/domain/hand";
import Board from "@/components/Board";
import BetSizeButtons from "@/components/BetSizeButtons";
import CardPicker from "@/components/CardPicker";
import DecisionResultPanel from "@/components/DecisionResult";
import DrawSummary from "@/components/DrawSummary";
import GameContext from "@/components/GameContext";
import MoneyInput from "@/components/MoneyInput";
import PloBoard from "@/components/PloBoard";
import PloPreflopPanel from "@/components/PloPreflopPanel";
import RangeThreatPanel from "@/components/RangeThreat";
import StackSummary from "@/components/StackSummary";
import StrategyPanel from "@/components/StrategyPanel";
import { getVillainCombos, handToType, isHandInRange, ARCHETYPE_LABELS } from "@/data/archetypeRanges";
import { getPreflopAdvice } from "@/data/preflopRanges";
import PreflopAdvicePanel from "@/components/PreflopAdvicePanel";
import { calculateDecision } from "@/poker/decisionEngine";
import { detectDraws } from "@/poker/draws";
import { evaluateBestHand } from "@/poker/evaluator";
import { calculateOuts } from "@/poker/outs";
import { detectDrawsPLO } from "@/poker/plo/draws";
import { evaluateBestHandPLO } from "@/poker/plo/evaluator";
import { calculateOutsPLO } from "@/poker/plo/outs";
import {
  getBoardCards,
  getCurrentStreet,
  getEffectiveStack,
  getHeroCardsForMode,
  getSPR,
  SlotName,
  useHandStore,
  convertAmount,
} from "@/state/handStore";
import { analyzeBoardTexture } from "@/strategy/boardTexture";
import { getFlopStrategy } from "@/strategy/flopStrategy";
import { getRiverStrategy } from "@/strategy/riverStrategy";
import { getTurnStrategy } from "@/strategy/turnStrategy";
import { analyzeVillainRange, type RangeThreat } from "@/strategy/villainRange";

const NLHE_SLOTS: SlotName[] = ["hero1", "hero2", "flop1", "flop2", "flop3", "turn", "river"];
const PLO_SLOTS: SlotName[] = ["hero1", "hero2", "hero3", "hero4", "flop1", "flop2", "flop3", "turn", "river"];

export default function Home() {
  const slots = useHandStore((state) => state.slots);
  const pot = useHandStore((state) => state.pot);
  const amountToCall = useHandStore((state) => state.amountToCall);
  const heroStack = useHandStore((state) => state.heroStack);
  const villainStack = useHandStore((state) => state.villainStack);
  const isAllIn = useHandStore((state) => state.isAllIn);
  const gameMode = useHandStore((state) => state.gameMode);
  const gameType = useHandStore((state) => state.gameType);
  const heroPosition = useHandStore((state) => state.heroPosition);
  const villainPosition = useHandStore((state) => state.villainPosition);
  const villainArchetype = useHandStore((state) => state.villainArchetype);
  const preflopAggressor = useHandStore((state) => state.preflopAggressor);
  const preflopAction = useHandStore((state) => state.preflopAction);
  const preflopActionSize = useHandStore((state) => state.preflopActionSize);
  const potType = useHandStore((state) => state.potType);
  const numPlayers = useHandStore((state) => state.numPlayers);
  const amountUnit = useHandStore((state) => state.amountUnit);

  const setPot = useHandStore((state) => state.setPot);
  const setAmountToCall = useHandStore((state) => state.setAmountToCall);
  const setHeroStack = useHandStore((state) => state.setHeroStack);
  const setVillainStack = useHandStore((state) => state.setVillainStack);
  const setIsAllIn = useHandStore((state) => state.setIsAllIn);
  const setGameMode = useHandStore((state) => state.setGameMode);
  const setGameType = useHandStore((state) => state.setGameType);
  const newHand = useHandStore((state) => state.newHand);
  const setAmountUnit = useHandStore((state) => state.setAmountUnit);

  // Blind amounts persist for the session but are table meta, not hand state
  const [smallBlind, setSmallBlind] = useState(0);
  const [bigBlind, setBigBlind] = useState(0);

  const requiredHeroCards = gameType === "plo" ? 4 : 2;
  const visibleSlots = gameType === "plo" ? PLO_SLOTS : NLHE_SLOTS;

  const heroCards = useMemo(() => getHeroCardsForMode(slots, gameType), [slots, gameType]);
  const board = useMemo(() => getBoardCards(slots), [slots]);
  const street = getCurrentStreet(slots);
  const effectiveStack = getEffectiveStack(heroStack, villainStack);
  const spr = getSPR(effectiveStack, pot);
  const occupiedCount = visibleSlots.filter((slot) => slots[slot] !== null).length;

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
      preflopAction,
      preflopActionSize,
      potType,
      numPlayers,
    }),
    [heroPosition, villainPosition, preflopAggressor, preflopAction, preflopActionSize, potType, numPlayers],
  );

  const { outsResult, drawAnalysis, currentHand, decisionResult, strategyResult } = useMemo(() => {
    const outs = gameType === "plo"
      ? calculateOutsPLO(heroCards, board)
      : calculateOuts(heroCards, board);
    const draws = gameType === "plo"
      ? detectDrawsPLO(heroCards, board)
      : detectDraws(heroCards, board);
    const current = heroCards.length > 0
      ? gameType === "plo" && board.length >= 3
        ? evaluateBestHandPLO(heroCards, board)
        : gameType === "nlhe"
          ? evaluateBestHand(heroCards, board)
          : null
      : null;
    const boardAnalysis = board.length >= 3 ? analyzeBoardTexture(board) : null;

    const decision = gameType === "nlhe" && board.length >= 3 && amountToCall >= 0
      ? calculateDecision(hand, draws, outs)
      : null;

    const strategy = gameType === "nlhe" && boardAnalysis
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
  }, [heroCards, board, hand, preflopContext, amountToCall, street, spr, gameType]);

  const rangeThreat: RangeThreat | null = useMemo(() => {
    if (
      gameType !== "nlhe" ||
      !villainArchetype || !villainPosition ||
      heroCards.length !== requiredHeroCards || board.length < 3 || !currentHand
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
  }, [villainArchetype, villainPosition, heroCards, board, currentHand, requiredHeroCards]);

  const preflopAdvice = useMemo(
    () => getPreflopAdvice(preflopAction, heroPosition, villainPosition, villainArchetype ?? undefined),
    [preflopAction, heroPosition, villainPosition, villainArchetype]
  );

  // When RANGE_REQUIRED fires but villain range is loaded, compute equity directly from the range
  const activeDecision = useMemo(() => {
    if (!decisionResult || decisionResult.signal !== "RANGE_REQUIRED" || !rangeThreat || rangeThreat.totalCombos === 0) {
      return { result: decisionResult, equityLabel: "Draw probability" };
    }
    // Hero wins against every combo that doesn't beat them
    const heroEquity = 1 - rangeThreat.beatHeroPct;
    const margin = heroEquity - decisionResult.requiredEquity;
    const signal = margin >= 0.02 ? "CALL" : margin <= -0.02 ? "FOLD" : "CLOSE";
    const archLabel = ARCHETYPE_LABELS[rangeThreat.archetype] ?? rangeThreat.archetype;
    return {
      result: {
        ...decisionResult,
        signal: signal as "CALL" | "FOLD" | "CLOSE",
        comparisonProbability: heroEquity,
        margin,
        reason: `Your hand beats ${((1 - rangeThreat.beatHeroPct) * 100).toFixed(0)}% of the ${archLabel} ${rangeThreat.villainPosition} range (${rangeThreat.totalCombos} combos).`,
      },
      equityLabel: "Range equity",
    };
  }, [decisionResult, rangeThreat]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Header — full width */}
      <header className="sticky top-0 z-10 bg-[#0D0D0F] mb-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Poker Odds Companion</p>
            <h1 className="mt-1 text-lg font-black tracking-tight text-white">Local Poker HUD</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAmountUnit(amountUnit === "R" ? "BB" : "R")}
              className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-300 transition-colors hover:bg-[#2A2A3F]"
              title="Toggle unit between R and BB"
            >
              {amountUnit}
            </button>
            <button
              onClick={newHand}
              className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-300 transition-colors hover:bg-[#2A2A3F]"
            >
              New Hand
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded border border-[#2A2A35]">
              {(["nlhe", "plo"] as const).map((type) => (
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
          </div>
          <div className="text-right text-[11px] uppercase tracking-widest text-gray-500">
            <p>{occupiedCount}/{visibleSlots.length} cards set</p>
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
                <MoneyInput label="Pot" value={pot} onChange={setPot} stacked bigBlind={bigBlind} amountUnit={amountUnit} />
              </div>
              <div className="flex-1 relative">
                <MoneyInput label="Call" value={amountToCall} onChange={setAmountToCall} stacked bigBlind={bigBlind} amountUnit={amountUnit} />
                {amountToCall > 0 && (
                  <button
                    onClick={() => setAmountToCall(0)}
                    title="Clear call amount"
                    className="absolute right-2 top-[22px] text-gray-500 hover:text-gray-200 text-sm leading-none"
                  >
                    ×
                  </button>
                )}
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

            {pot > 0 && <BetSizeButtons pot={pot + amountToCall} onSelect={setAmountToCall} bigBlind={bigBlind} amountUnit={amountUnit} />}

            {gameType === "plo" && amountToCall > 0 && pot > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-widest text-gray-500">PLO pot-max</span>
                <button
                  onClick={() => setAmountToCall(pot + 3 * amountToCall)}
                  title="Set call to PLO pot-maximum"
                  className="rounded border border-amber-800 bg-[#1A1A1F] px-2 py-1 text-[11px] font-bold text-amber-400 transition-colors hover:bg-amber-900/20"
                >
                  {amountUnit === "BB" && bigBlind > 0
                    ? `${convertAmount(pot + 3 * amountToCall, "R", "BB", bigBlind).toFixed(2)} BB`
                    : `R ${(pot + 3 * amountToCall).toLocaleString("en-ZA")}`}
                </button>
              </div>
            )}

            {/* Blind quick-add buttons + All-In toggle on one row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Small blind */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-widest text-gray-500">SB</span>
                <div className="flex items-center rounded border border-[#2A2A35] bg-[#0D0D0F] px-2 py-1 gap-0.5">
                  <span className="text-gray-500 text-xs">R</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={smallBlind === 0 ? "" : smallBlind.toLocaleString("en-ZA")}
                    onChange={e => { const v = e.target.value.replace(/\D/g, ""); setSmallBlind(v ? parseInt(v, 10) : 0); }}
                    placeholder="0"
                    className="w-12 bg-transparent text-xs text-white outline-none"
                    aria-label="Small blind amount"
                  />
                </div>
                <button
                  onClick={() => setPot(pot + smallBlind)}
                  disabled={smallBlind <= 0}
                  title="Add small blind to pot"
                  className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-2 py-1 text-[11px] font-bold text-gray-300 transition-colors hover:bg-[#2A2A3F] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  +SB
                </button>
              </div>

              {/* Big blind */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-widest text-gray-500">BB</span>
                <div className="flex items-center rounded border border-[#2A2A35] bg-[#0D0D0F] px-2 py-1 gap-0.5">
                  <span className="text-gray-500 text-xs">R</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bigBlind === 0 ? "" : bigBlind.toLocaleString("en-ZA")}
                    onChange={e => { const v = e.target.value.replace(/\D/g, ""); setBigBlind(v ? parseInt(v, 10) : 0); }}
                    placeholder="0"
                    className="w-12 bg-transparent text-xs text-white outline-none"
                    aria-label="Big blind amount"
                  />
                </div>
                <button
                  onClick={() => setPot(pot + bigBlind)}
                  disabled={bigBlind <= 0}
                  title="Add big blind to pot"
                  className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-2 py-1 text-[11px] font-bold text-gray-300 transition-colors hover:bg-[#2A2A3F] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  +BB
                </button>
              </div>

              {/* All-In toggle */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[11px] uppercase tracking-widest text-gray-400">All-In</span>
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
            </div>
          </section>

          <GameContext />

          {/* Your hand + board */}
          <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            {gameType === "plo" ? <PloBoard /> : <Board />}
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
              <MoneyInput label="My Stack" value={heroStack ?? 0} onChange={(value) => setHeroStack(value || undefined)} bigBlind={bigBlind} amountUnit={amountUnit} />
              <MoneyInput label="Villain" value={villainStack ?? 0} onChange={(value) => setVillainStack(value || undefined)} bigBlind={bigBlind} amountUnit={amountUnit} />
            </div>
          </details>
        </div>

        {/* RIGHT COLUMN — decision + strategy results */}
        <div className="flex flex-col gap-4">
          {preflopAdvice && (
            <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
              <PreflopAdvicePanel
                advice={preflopAdvice}
                preflopActionSize={preflopActionSize}
                bigBlind={bigBlind}
                amountUnit={amountUnit}
                heroPosition={heroPosition}
                villainPosition={villainPosition}
              />
            </section>
          )}
          {heroCards.length === requiredHeroCards && board.length >= 3 && decisionResult ? (
            <>
              <section className="space-y-4 rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
                <p className="text-xs uppercase tracking-widest text-gray-500">Decision</p>
                <DecisionResultPanel
                  result={activeDecision.result ?? decisionResult}
                  currentHand={currentHand?.description}
                  pot={pot}
                  amountToCall={amountToCall}
                  equityLabel={activeDecision.equityLabel}
                  bigBlind={bigBlind}
                  amountUnit={amountUnit}
                />

                <DrawSummary drawAnalysis={drawAnalysis} outsResult={outsResult} />
                <StackSummary bigBlind={bigBlind} amountUnit={amountUnit} />
              </section>

              {strategyResult && (
                <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
                  <StrategyPanel strategy={strategyResult} pot={pot} bigBlind={bigBlind} amountUnit={amountUnit} />
                </section>
              )}

              {rangeThreat && (
                <section className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
                  <RangeThreatPanel threat={rangeThreat} pot={pot} />
                </section>
              )}
            </>
          ) : heroCards.length === requiredHeroCards && board.length === 0 && !preflopAction ? (
            gameType === "plo" ? (
              <PloPreflopPanel heroCards={heroCards} />
            ) : (
              /* Preflop suggestion — shown as soon as both hole cards are selected */
              <section className="space-y-4 rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
                <p className="text-xs uppercase tracking-widest text-gray-500">
                  Preflop — Modern Baseline
                </p>
                {(() => {
                  const handType = handToType(heroCards[0], heroCards[1]);
                  if (!heroPosition) {
                    return (
                      <p className="text-sm italic text-gray-500">
                        Set your position in Game Context to see an opening recommendation.
                      </p>
                    );
                  }
                  if (heroPosition === "BB") {
                    return (
                      <p className="text-sm italic text-gray-500">
                        BB has no opening range — adjust to blind defence context.
                      </p>
                    );
                  }
                  const inRange = isHandInRange("gto_oriented_reg", heroPosition, heroCards[0], heroCards[1]);
                  // Modern Balanced Reg open-raise sizing by position (in BB)
                  const OPEN_BB: Record<string, number> = { UTG: 2.25, HJ: 2.25, CO: 2.5, BTN: 2.5, SB: 3 };
                  const multiplier = OPEN_BB[heroPosition] ?? 2.5;
                  const openAmount = bigBlind > 0 ? Math.round(multiplier * bigBlind / 5) * 5 : null;

                  // 3-bet sizing: IP = 3× facing open, OOP = 4× facing open
                  const POSTFLOP_RANK: Record<string, number> = { BB: 0, SB: 1, UTG: 2, HJ: 3, CO: 4, BTN: 5 };
                  const heroRank = POSTFLOP_RANK[heroPosition] ?? 2.5;
                  const villainRank = villainPosition ? (POSTFLOP_RANK[villainPosition] ?? 2.5) : null;
                  const isIP = villainRank !== null ? heroRank > villainRank : null;
                  const raiseMultiplier = isIP === true ? 3 : isIP === false ? 4 : 3.5;
                  const raiseAmount = amountToCall > 0 ? Math.round(raiseMultiplier * amountToCall / 5) * 5 : null;
                  const posLabel = isIP === true ? "IP" : isIP === false ? "OOP" : "";

                  return (
                    <>
                      <div className={`text-3xl font-black ${inRange ? "text-green-500" : "text-red-500"}`}>
                        {inRange ? "🟢 OPEN" : "🔴 FOLD"}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <span className="text-gray-500">Hand</span>
                        <span className="text-right font-mono text-white">{handType}</span>
                        <span className="text-gray-500">Position</span>
                        <span className="text-right text-white">{heroPosition}</span>
                        <span className="text-gray-500">Baseline</span>
                        <span className="text-right text-gray-400">Modern Balanced Reg</span>
                        {inRange && (
                          <>
                            <span className="text-gray-500">Suggested open</span>
                            <span className="flex items-center justify-end gap-2 text-right text-white">
                              {openAmount !== null
                                ? amountUnit === "BB" && bigBlind > 0
                                  ? `${convertAmount(openAmount, "R", "BB", bigBlind).toFixed(2)}bb (${multiplier}×BB)`
                                  : `R ${openAmount.toLocaleString("en-ZA")} (${multiplier}×BB)`
                                : `${multiplier}× BB`}
                              {openAmount !== null && (
                                <button
                                  onClick={() => setPot(pot + openAmount)}
                                  title="Add suggested open to pot"
                                  className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-1.5 py-0.5 text-[11px] font-bold text-gray-300 transition-colors hover:bg-[#2A2A3F]"
                                >
                                  +
                                </button>
                              )}
                            </span>

                            {raiseAmount !== null && (
                              <>
                                <span className="text-gray-500">
                                  Suggested raise
                                  {posLabel && <span className="ml-1 text-gray-600">({posLabel})</span>}
                                </span>
                                <span className="flex items-center justify-end gap-2 text-right text-white">
                                  {amountUnit === "BB" && bigBlind > 0
                                    ? `${convertAmount(raiseAmount, "R", "BB", bigBlind).toFixed(2)}bb (${raiseMultiplier}×)`
                                    : `R ${raiseAmount.toLocaleString("en-ZA")} (${raiseMultiplier}×)`}
                                  <button
                                    onClick={() => setPot(pot + raiseAmount)}
                                    title="Add suggested raise to pot"
                                    className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-1.5 py-0.5 text-[11px] font-bold text-gray-300 transition-colors hover:bg-[#2A2A3F]"
                                  >
                                    +
                                  </button>
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      <p className="text-[11px] italic text-gray-600">
                        {inRange
                          ? `${handType} is in the Modern Balanced Reg open-raise range from ${heroPosition}.`
                          : `${handType} is outside the Modern Balanced Reg open-raise range from ${heroPosition}.`}
                      </p>
                    </>
                  );
                })()}
              </section>
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#2A2A35] p-10 text-center">
              <p className="text-xs uppercase tracking-widest text-gray-600">Results</p>
              <p className="text-sm text-gray-500">
                {heroCards.length < requiredHeroCards
                  ? `Select your ${requiredHeroCards} hole cards to begin`
                  : "Enter the flop to see the decision"}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
