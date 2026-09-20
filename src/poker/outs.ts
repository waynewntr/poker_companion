import { Card } from "../domain/cards";
import { createDeck, hasNoDuplicates, removeCards } from "../domain/deck";
import { evaluateBestHand, HandCategory } from "./evaluator";

export interface OutsResult {
  outs: Card[];      // all category-improvement cards (shown as raw count in UI)
  count: number;
  drawOuts: Card[];  // only flush/straight/SF completions (used for probability)
  labels: string[];
}

const CATEGORY_RANK: Record<HandCategory, number> = {
  high_card: 0, pair: 1, two_pair: 2, three_of_a_kind: 3,
  straight: 4, flush: 5, full_house: 6, four_of_a_kind: 7, straight_flush: 8,
};

const DRAW_COMPLETING_CATEGORIES = new Set<HandCategory>([
  "straight", "flush", "straight_flush",
]);

export function calculateOuts(heroCards: Card[], board: Card[]): OutsResult {
  if (board.length < 3 || board.length >= 5 || !hasNoDuplicates([...heroCards, ...board])) {
    return { outs: [], count: 0, drawOuts: [], labels: [] };
  }

  const used = [...heroCards, ...board];
  const unseen = removeCards(createDeck(), used);
  const baseline = evaluateBestHand(heroCards, board);
  const outs: Card[] = [];
  const drawOuts: Card[] = [];
  const labels: string[] = [];

  for (const candidate of unseen) {
    const newBoard = [...board, candidate];
    const improved = evaluateBestHand(heroCards, newBoard);
    // Only count genuine category improvements — same-category kicker changes excluded
    if (CATEGORY_RANK[improved.category] > CATEGORY_RANK[baseline.category]) {
      outs.push(candidate);
      labels.push(improved.description);
      if (DRAW_COMPLETING_CATEGORIES.has(improved.category)) {
        drawOuts.push(candidate);
      }
    }
  }

  return { outs, count: outs.length, drawOuts, labels };
}
