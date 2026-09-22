import type { PreFlopContext } from "../domain/hand";
import type { BoardAnalysis } from "./boardTexture";
import type { StrategyConfidence, StrategyResult, StrategyStyle } from "./rangeContext";
import { estimateRangeAdvantage } from "./rangeAdvantage";
import { estimateNutAdvantage } from "./nutAdvantage";

// eslint-disable-next-line @typescript-eslint/no-unused-vars

function getConfidence(context: PreFlopContext, board: BoardAnalysis): StrategyConfidence {
  if (context.numPlayers > 2) return "LOW";
  if (!context.heroPosition || !context.villainPosition || !context.preflopAggressor) return "LOW";
  if (board.dynamism === "STATIC") return "HIGH";
  if (board.dynamism === "SEMI_DYNAMIC") return "HIGH";
  return "MEDIUM";
}

export function getFlopStrategy(
  context: PreFlopContext,
  board: BoardAnalysis,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _spr: number,
): StrategyResult {
  const confidence = getConfidence(context, board);
  const rangeAdvantage = estimateRangeAdvantage(context, board);
  const nutAdvantage = estimateNutAdvantage(context, board);

  let style: StrategyStyle;
  let sizes: number[];
  let explanation: string;

  if (confidence === "LOW") {
    style = "INSUFFICIENT_CONTEXT";
    sizes = [0.33, 0.5];
    explanation = context.numPlayers > 2
      ? "Modern baseline: multiway pots use a narrower betting range and lower frequency."
      : "Modern baseline: insufficient position or aggressor context for a reliable flop recommendation.";
  } else if (board.dynamism === "STATIC" && rangeAdvantage === "HERO") {
    style = "SMALL_FREQUENT";
    sizes = [0.25, 0.33];
    explanation = "Modern baseline: dry boards with range advantage support small, frequent bets.";
  } else if (board.dynamism === "SEMI_DYNAMIC") {
    style = "MIXED";
    sizes = [0.33, 0.5];
    explanation = "Modern baseline: semi-dynamic boards mix checks and medium sizing.";
  } else if (nutAdvantage === "HERO" && board.dynamism !== "VERY_DYNAMIC") {
    style = "POLARIZED";
    sizes = [0.67, 1.0];
    explanation = "Modern baseline: nut advantage supports polarized betting with larger sizing.";
  } else if (board.dynamism === "DYNAMIC" || board.dynamism === "VERY_DYNAMIC") {
    style = "CHECK_MORE";
    sizes = [0.5, 0.75];
    explanation = "Modern baseline: dynamic boards check more often and bet larger when continuing.";
  } else {
    style = "MIXED";
    sizes = [0.33, 0.5];
    explanation = "Modern baseline: balanced situations mix checks with medium bets.";
  }

  return {
    boardTexture: board.labels,
    rangeAdvantage,
    nutAdvantage,
    style,
    suggestedBetSizes: sizes,
    confidence,
    explanation,
  };
}