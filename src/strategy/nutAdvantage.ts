import type { PreFlopContext } from "../domain/hand";
import type { BoardAnalysis } from "./boardTexture";
import type { Advantage } from "./rangeContext";

export function estimateNutAdvantage(
  context: PreFlopContext,
  board: BoardAnalysis,
): Advantage {
  if (!context.preflopAggressor || !context.heroPosition || !context.villainPosition) {
    return "NEUTRAL";
  }

  const aggressorIsHero = context.preflopAggressor === "hero";

  if (board.dynamism === "STATIC" || board.dynamism === "SEMI_DYNAMIC") {
    return aggressorIsHero ? "HERO" : "VILLAIN";
  }

  return "NEUTRAL";
}