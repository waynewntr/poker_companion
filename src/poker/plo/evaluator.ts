import { Card } from "@/domain/cards";
import { combinations } from "@/domain/deck";
import { evaluateBestHand, HandResult } from "@/poker/evaluator";

export function evaluateBestHandPLO(heroCards: Card[], board: Card[]): HandResult {
  const holePairs = combinations(heroCards, 2);
  const boardTriples = combinations(board, 3);

  let best: HandResult | null = null;

  for (const holePair of holePairs) {
    for (const boardTriple of boardTriples) {
      const result = evaluateBestHand(holePair, boardTriple);
      if (!best || result.rankValue > best.rankValue) {
        best = result;
      }
    }
  }

  return best ?? evaluateBestHand(heroCards.slice(0, 2), board.slice(0, 3));
}