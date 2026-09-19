import type { PreFlopContext } from "../domain/hand";
import type { BoardAnalysis } from "./boardTexture";
import type { Advantage } from "./rangeContext";

export function estimateRangeAdvantage(
  context: PreFlopContext,
  board: BoardAnalysis,
): Advantage {
  if (!context.heroPosition || !context.villainPosition || !context.preflopAggressor) {
    return "NEUTRAL";
  }

  const aggressorIsHero = context.preflopAggressor === "hero";

  if (aggressorIsHero) {
    if (board.dynamism === "STATIC") return "HERO";
    if (board.dynamism === "SEMI_DYNAMIC") return "HERO";
    if (board.dynamism === "DYNAMIC") return "NEUTRAL";
    return "VILLAIN";
  }

  if (board.dynamism === "STATIC") return "VILLAIN";
  if (board.dynamism === "SEMI_DYNAMIC") return "VILLAIN";
  if (board.dynamism === "DYNAMIC") return "NEUTRAL";
  return "HERO";
}