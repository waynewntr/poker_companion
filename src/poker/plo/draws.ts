import { Card, RANK_VALUES, Suit } from "@/domain/cards";
import { DrawAnalysis } from "@/poker/draws";
import { HandCategory } from "@/poker/evaluator";
import { evaluateBestHandPLO } from "@/poker/plo/evaluator";

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
  "pair",
  "two_pair",
  "three_of_a_kind",
  "straight",
  "flush",
  "full_house",
  "four_of_a_kind",
  "straight_flush",
];

const SUITS: Suit[] = ["s", "h", "d", "c"];

function countBySuit(cards: Card[]): Record<Suit, number> {
  const counts: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
  for (const card of cards) {
    counts[card.suit]++;
  }
  return counts;
}

export function detectDrawsPLO(heroCards: Card[], board: Card[]): DrawAnalysis {
  if (board.length < 3) return { draws: [], hasMadeHand: false };

  const current = evaluateBestHandPLO(heroCards, board);
  const hasMadeHand = MADE_HAND_CATEGORIES.includes(current.category);

  if (board.length >= 5) return { draws: [], hasMadeHand };

  const draws: string[] = [];

  if (
    current.category !== "flush" &&
    current.category !== "full_house" &&
    current.category !== "four_of_a_kind" &&
    current.category !== "straight_flush"
  ) {
    const heroSuitCounts = countBySuit(heroCards);
    const boardSuitCounts = countBySuit(board);

    for (const suit of SUITS) {
      if (heroSuitCounts[suit] >= 2 && boardSuitCounts[suit] === 2) {
        const heroCardsOfSuit = heroCards.filter((card) => card.suit === suit);
        const maxHeroRank = Math.max(...heroCardsOfSuit.map((card) => RANK_VALUES[card.rank]));
        draws.push(maxHeroRank === 14 ? "Nut flush draw" : "Flush draw");
      }
    }
  }

  if (
    current.category !== "straight" &&
    current.category !== "flush" &&
    current.category !== "full_house" &&
    current.category !== "four_of_a_kind" &&
    current.category !== "straight_flush"
  ) {
    const heroRankVals = new Set(heroCards.map((card) => RANK_VALUES[card.rank]));
    const boardRankVals = new Set(board.map((card) => RANK_VALUES[card.rank]));
    const allRankVals = new Set([...heroRankVals, ...boardRankVals]);
    let oesd = 0;
    let gutshots = 0;

    for (const straight of ALL_STRAIGHTS) {
      const present = straight.filter((rank) => allRankVals.has(rank));
      const missing = straight.filter((rank) => !allRankVals.has(rank));
      if (present.length !== 4 || missing.length !== 1) continue;

      const heroContributes = present.filter((rank) => heroRankVals.has(rank));
      if (heroContributes.length !== 2) continue;

      const missingIdx = straight.indexOf(missing[0]);
      if (missingIdx === 0 || missingIdx === 4) oesd++;
      else gutshots++;
    }

    if (gutshots >= 2 && oesd === 0) draws.push("Double-gutshot straight draw");
    else if (oesd > 0) draws.push("Open-ended straight draw");
    else if (gutshots > 0) draws.push("Gutshot straight draw");
  }

  return { draws: [...new Set(draws)], hasMadeHand };
}
