import { PokerHand } from "../domain/hand";
import { DrawAnalysis } from "./draws";
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

const MARGIN_THRESHOLD = 0.02;

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

  if (drawAnalysis.hasMadeHand && outsResult.count < 3) {
    return {
      signal: "RANGE_REQUIRED",
      requiredEquity,
      reason: "Made hand — opponent range required for reliable equity calculation.",
    };
  }

  let comparisonProbability: number;
  if (isAllIn && street === "flop") {
    comparisonProbability = enumeratedRunoutProbability(hand.heroCards, hand.board);
  } else {
    comparisonProbability = nextCardProbability(
      outsResult.count,
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
