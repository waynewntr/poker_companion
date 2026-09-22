import type { PreFlopContext } from "../domain/hand";
import type { BoardAnalysis } from "./boardTexture";
import type { StrategyConfidence, StrategyResult, StrategyStyle } from "./rangeContext";
import { estimateRangeAdvantage } from "./rangeAdvantage";
import { estimateNutAdvantage } from "./nutAdvantage";

// TODO: Refine recommendations based on preflopAction and preflopActionSize

export function getTurnStrategy(
  context: PreFlopContext,
  board: BoardAnalysis,
  spr: number,
): StrategyResult {
  const rangeAdvantage = estimateRangeAdvantage(context, board);
  const nutAdvantage = estimateNutAdvantage(context, board);

  let confidence: StrategyConfidence =
    context.numPlayers > 2 || !context.preflopAggressor || !context.heroPosition || !context.villainPosition
      ? "LOW"
      : "MEDIUM";

  let style: StrategyStyle;
  let sizes: number[];
  let explanation: string;

  if (confidence === "LOW") {
    style = "INSUFFICIENT_CONTEXT";
    sizes = [0.5, 0.75];
    explanation = context.numPlayers > 2
      ? "Multiway pot — bet less frequently with a stronger range than heads-up."
      : "Insufficient position context for a reliable turn recommendation.";
  } else if (nutAdvantage === "HERO" && spr < 3) {
    style = "OVERBET_CANDIDATE";
    sizes = [1.0, 1.5];
    explanation = "Modern baseline: low SPR with nut advantage creates overbet candidates on the turn.";
  } else if (board.dynamism === "STATIC" && rangeAdvantage === "HERO") {
    style = "SMALL_FREQUENT";
    sizes = [0.25, 0.5];
    explanation = "Modern baseline: static boards with range advantage continue with frequent small bets.";
  } else if (board.dynamism === "VERY_DYNAMIC") {
    style = "POLARIZED";
    sizes = [0.67, 1.0];
    explanation = "Modern baseline: dynamic turns polarize between value and bluffs.";
  } else {
    style = "MIXED";
    sizes = [0.5, 0.75];
    explanation = "Modern baseline: turn play mixes value bets, draws, and checks.";
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