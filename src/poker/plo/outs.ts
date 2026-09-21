import { Card } from "@/domain/cards";
import { createDeck, hasNoDuplicates, removeCards } from "@/domain/deck";
import { OutsResult } from "@/poker/outs";
import { evaluateBestHandPLO } from "./evaluator";
import { HandCategory } from "../evaluator";

const CATEGORY_RANK: Record<HandCategory, number> = {
  high_card: 0,
  pair: 1,
  two_pair: 2,
  three_of_a_kind: 3,
  straight: 4,
  flush: 5,
  full_house: 6,
  four_of_a_kind: 7,
  straight_flush: 8,
};

const DRAW_COMPLETING_CATEGORIES = new Set<HandCategory>(["straight", "flush", "straight_flush"]);

export function calculateOutsPLO(heroCards: Card[], board: Card[]): OutsResult {
  if (board.length < 3 || board.length >= 5 || !hasNoDuplicates([...heroCards, ...board])) {
    return { outs: [], count: 0, drawOuts: [], labels: [] };
  }

  const used = [...heroCards, ...board];
  const unseen = removeCards(createDeck(), used);
  const baseline = evaluateBestHandPLO(heroCards, board);
  const outs: Card[] = [];
  const drawOuts: Card[] = [];
  const labels: string[] = [];

  for (const candidate of unseen) {
    const newBoard = [...board, candidate];
    const improved = evaluateBestHandPLO(heroCards, newBoard);

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