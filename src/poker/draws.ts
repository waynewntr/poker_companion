import { Card, RANK_VALUES, Suit } from "../domain/cards";
import { evaluateBestHand, HandCategory } from "./evaluator";

export interface DrawAnalysis {
  draws: string[];
  hasMadeHand: boolean;
}

const ALL_STRAIGHTS: number[][] = [
  [14, 5, 4, 3, 2],
  [6, 5, 4, 3, 2],
  [7, 6, 5, 4, 3],
  [8, 7, 6, 5, 4],
  [9, 8, 7, 6, 5],
  [10, 9, 8, 7, 6],
  [11, 10, 9, 8, 7],
  [12, 11, 10, 9, 8],
  [13, 12, 11, 10, 9],
  [14, 13, 12, 11, 10],
];

const MADE_HAND_CATEGORIES: HandCategory[] = [
  "pair", "two_pair", "three_of_a_kind", "straight",
  "flush", "full_house", "four_of_a_kind", "straight_flush",
];

export function detectDraws(heroCards: Card[], board: Card[]): DrawAnalysis {
  if (board.length < 3) return { draws: [], hasMadeHand: false };

  const all = [...heroCards, ...board];
  const current = evaluateBestHand(heroCards, board);
  const hasMadeHand = MADE_HAND_CATEGORIES.includes(current.category);
  const draws: string[] = [];

  // Flush draw: exactly 4 cards of the same suit, hero contributes, not already a flush
  if (current.category !== "flush" && current.category !== "straight_flush") {
    const suitGroups: Record<Suit, Card[]> = { s: [], h: [], d: [], c: [] };
    for (const c of all) suitGroups[c.suit].push(c);

    for (const [suit, cards] of Object.entries(suitGroups) as [Suit, Card[]][]) {
      if (cards.length === 4 && heroCards.some(c => c.suit === suit)) {
        const heroMax = Math.max(
          ...heroCards.filter(c => c.suit === suit).map(c => RANK_VALUES[c.rank])
        );
        draws.push(heroMax === 14 ? "Nut flush draw" : "Flush draw");
      }
    }
  }

  // Straight draws: scan all possible straights for 4-card combinations
  if (current.category !== "straight" && current.category !== "straight_flush") {
    const allRankVals = new Set(all.map(c => RANK_VALUES[c.rank]));
    const heroRankVals = new Set(heroCards.map(c => RANK_VALUES[c.rank]));
    let oesd = 0;
    let gutshots = 0;

    for (const straight of ALL_STRAIGHTS) {
      const present = straight.filter(r => allRankVals.has(r));
      const missing = straight.filter(r => !allRankVals.has(r));
      if (present.length !== 4 || missing.length !== 1) continue;
      if (!straight.some(r => heroRankVals.has(r))) continue; // hero must contribute

      const missingIdx = straight.indexOf(missing[0]);
      if (missingIdx === 0 || missingIdx === 4) oesd++;
      else gutshots++;
    }

    if (gutshots >= 2 && oesd === 0) draws.push("Double-gutshot straight draw");
    else if (oesd > 0) draws.push("Open-ended straight draw");
    else if (gutshots > 0) draws.push("Gutshot straight draw");
  }

  // Overcard: hero card beats all board cards, board has no pair with that rank
  if (current.category === "high_card") {
    const boardRankVals = board.map(c => RANK_VALUES[c.rank]);
    const maxBoard = Math.max(...boardRankVals);
    for (const hc of heroCards) {
      const hv = RANK_VALUES[hc.rank];
      if (hv > maxBoard && !boardRankVals.includes(hv)) {
        draws.push(hv === 14 ? "Ace overcard" : `${hc.rank}-high overcard`);
      }
    }
  }

  return { draws: [...new Set(draws)], hasMadeHand };
}
