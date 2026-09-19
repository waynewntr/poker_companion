export type { Position, PotType, PreFlopContext } from "../domain/hand";

export type Advantage = "HERO" | "VILLAIN" | "NEUTRAL";

export type StrategyStyle =
  | "SMALL_FREQUENT"
  | "MIXED"
  | "CHECK_MORE"
  | "POLARIZED"
  | "OVERBET_CANDIDATE"
  | "INSUFFICIENT_CONTEXT";

export type StrategyConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface StrategyResult {
  boardTexture: string[];
  rangeAdvantage: Advantage;
  nutAdvantage: Advantage;
  style: StrategyStyle;
  suggestedBetSizes: number[];
  confidence: StrategyConfidence;
  explanation: string;
}