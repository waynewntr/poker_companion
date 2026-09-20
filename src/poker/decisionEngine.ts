import { PokerHand } from "../domain/hand";
import { DrawAnalysis } from "./draws";
import { evaluateBestHand, HandCategory } from "./evaluator";
import { OutsResult } from "./outs";
import { calculatePotOdds } from "./potOdds";
import { calculateImpliedOdds, ImpliedOddsResult } from "./impliedOdds";
import { nextCardProbability, enumeratedRunoutProbability } from "./probability";

export type DecisionSignal = "CALL" | "FOLD" | "CLOSE" | "RANGE_REQUIRED";

export interface DecisionResult {
  signal: DecisionSignal;
  requiredEquity: number;
  comparisonProbability?: number;
  margin?: number;
  reason: string;
  impliedOdds?: ImpliedOddsResult;
}

// Hands weak enough that equity vs opponent is genuinely uncertain
const RANGE_REQUIRED_CATEGORIES: HandCategory[] = [
  "pair", "two_pair", "three_of_a_kind", "straight",
];

// Hands strong enough that calling is almost always correct
const STRONG_MADE_CATEGORIES: HandCategory[] = [
  "flush", "full_house", "four_of_a_kind", "straight_flush",
];

export function calculateDecision(
  hand: PokerHand,
  drawAnalysis: DrawAnalysis,
  outsResult: OutsResult
): DecisionResult {
  const { pot, amountToCall, heroStack, villainStack, isAllIn, street } = hand;

  if (amountToCall <= 0) {
    return { signal: "CALL", requiredEquity: 0, reason: "No cost to continue." };
  }

  const { requiredEquity } = calculatePotOdds(pot, amountToCall);

const MARGIN_THRESHOLD = 0.02;

  if (drawAnalysis.hasMadeHand && drawAnalysis.draws.length === 0 && hand.heroCards.length > 0 && hand.board.length >= 3) {
    const { category } = evaluateBestHand(hand.heroCards, hand.board);

    if (STRONG_MADE_CATEGORIES.includes(category)) {
      return {
        signal: "CALL",
        requiredEquity,
        reason: "Strong made hand — consider raising. Opponent range required for exact equity.",
      };
    }

    if (RANGE_REQUIRED_CATEGORIES.includes(category)) {
      return {
        signal: "RANGE_REQUIRED",
        requiredEquity,
        reason: "Made hand — opponent range required for reliable equity calculation.",
      };
    }
  }

  let comparisonProbability: number;
  if (isAllIn && street === "flop") {
    comparisonProbability = enumeratedRunoutProbability(hand.heroCards, hand.board);
  } else {
    comparisonProbability = nextCardProbability(
      outsResult.drawOuts.length,
      street === "flop" ? "flop" : "turn"
    );
  }

  const margin = comparisonProbability - requiredEquity;

  const effectiveStack =
    heroStack !== undefined && villainStack !== undefined
      ? Math.min(heroStack, villainStack)
      : undefined;

  const impliedOdds = calculateImpliedOdds(pot, amountToCall, comparisonProbability, effectiveStack);

  let signal: DecisionSignal;
  let reason: string;

  if (margin >= MARGIN_THRESHOLD) {
    signal = "CALL";
    reason = `Draw probability (${(comparisonProbability * 100).toFixed(1)}%) exceeds required equity (${(requiredEquity * 100).toFixed(1)}%).`;
  } else if (margin <= -MARGIN_THRESHOLD) {
    signal = "FOLD";
    reason = `Draw probability (${(comparisonProbability * 100).toFixed(1)}%) is below required equity (${(requiredEquity * 100).toFixed(1)}%).`;
  } else {
    signal = "CLOSE";
    reason = `Margin ±${(Math.abs(margin) * 100).toFixed(1)}% — implied odds may determine the correct play.`;
  }

  return { signal, requiredEquity, comparisonProbability, margin, reason, impliedOdds };
}
