import type { PreFlopContext } from "../domain/hand";
import type { BoardAnalysis } from "./boardTexture";
import type { StrategyConfidence, StrategyResult, StrategyStyle } from "./rangeContext";
import { estimateRangeAdvantage } from "./rangeAdvantage";
import { estimateNutAdvantage } from "./nutAdvantage";

// TODO: Refine recommendations based on preflopAction and preflopActionSize

export function getRiverStrategy(
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
      : "Insufficient position context for a reliable river recommendation.";
  } else if (nutAdvantage === "HERO" && rangeAdvantage === "HERO" && spr < 2) {
    style = "OVERBET_CANDIDATE";
    sizes = [1.0, 1.5, 2.0];
    explanation = "Low SPR with nut and range advantage — strong overbet candidate on the river.";
  } else if (nutAdvantage === "HERO" && rangeAdvantage === "HERO") {
    style = "OVERBET_CANDIDATE";
    sizes = [1.0, 1.5, 2.0];
    explanation = "Modern baseline: range and nut advantage open up river overbet candidates.";
  } else if (nutAdvantage === "HERO") {
    style = "POLARIZED";
    sizes = [0.75, 1.0];
    explanation = "Modern baseline: river nut advantage supports polarized value and bluff bets.";
  } else {
    style = "MIXED";
    sizes = [0.5, 0.75];
    explanation = "Modern baseline: river play mixes value bets, bluffs, and bluff-catchers.";
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