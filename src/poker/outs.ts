import { Card } from "../domain/cards";
import { createDeck, hasNoDuplicates, removeCards } from "../domain/deck";
import { evaluateBestHand } from "./evaluator";

export interface OutsResult {
  outs: Card[];
  count: number;
  labels: string[];
}

export function calculateOuts(heroCards: Card[], board: Card[]): OutsResult {
  if (board.length < 3 || board.length >= 5 || !hasNoDuplicates([...heroCards, ...board])) {
    return { outs: [], count: 0, labels: [] };
  }

  const used = [...heroCards, ...board];
  const unseen = removeCards(createDeck(), used);
  const baseline = evaluateBestHand(heroCards, board);
  const outs: Card[] = [];
  const labels: string[] = [];

  for (const candidate of unseen) {
    const newBoard = [...board, candidate];
    const improved = evaluateBestHand(heroCards, newBoard);
    if (improved.rankValue > baseline.rankValue) {
      outs.push(candidate);
      labels.push(improved.description);
    }
  }

  return { outs, count: outs.length, labels };
}
