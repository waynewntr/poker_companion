import { Card } from "../domain/cards";
import { createDeck, removeCards } from "../domain/deck";
import { evaluateBestHand } from "./evaluator";

export function nextCardProbability(outs: number, street: "flop" | "turn"): number {
  if (outs <= 0) return 0;
  const unseen = street === "flop" ? 47 : 46;
  return Math.min(outs / unseen, 1);
}

export function runoutProbability(outs: number): number {
  if (outs <= 0) return 0;
  return 1 - ((47 - outs) / 47) * ((46 - outs) / 46);
}

// Exact enumeration of all turn+river combinations — valid on flop only
export function enumeratedRunoutProbability(heroCards: Card[], board: Card[]): number {
  if (board.length !== 3) return 0;

  const used = [...heroCards, ...board];
  const remaining = removeCards(createDeck(), used);
  const baseline = evaluateBestHand(heroCards, board);

  let improvements = 0;
  let total = 0;

  for (let i = 0; i < remaining.length; i++) {
    for (let j = i + 1; j < remaining.length; j++) {
      total++;
      const runout = [...board, remaining[i], remaining[j]];
      const result = evaluateBestHand(heroCards, runout);
      if (result.rankValue > baseline.rankValue) improvements++;
    }
  }

  return total > 0 ? improvements / total : 0;
}
