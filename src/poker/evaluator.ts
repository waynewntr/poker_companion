import { Card, RANK_VALUES, RANK_NAMES } from "../domain/cards";
import { combinations } from "../domain/deck";

export type HandCategory =
  | "high_card" | "pair" | "two_pair" | "three_of_a_kind"
  | "straight" | "flush" | "full_house" | "four_of_a_kind"
  | "straight_flush";

export interface HandResult {
  category: HandCategory;
  description: string;
  rankValue: number;
}

function rankName(v: number): string {
  return RANK_NAMES[v] ?? String(v);
}

function rankPlural(v: number): string {
  if (v === 6) return "Sixes";
  return rankName(v) + "s";
}

// Returns the high-card value of the straight, or false if not a straight
function straightHighCard(sortedDesc: number[]): number | false {
  if (
    sortedDesc[0] === 14 && sortedDesc[1] === 5 &&
    sortedDesc[2] === 4 && sortedDesc[3] === 3 && sortedDesc[4] === 2
  ) return 5;
  for (let i = 0; i < 4; i++) {
    if (sortedDesc[i] - sortedDesc[i + 1] !== 1) return false;
  }
  return sortedDesc[0];
}

function encodeRanks(ranks: number[]): number {
  return ranks.reduce((acc, r) => acc * 15 + r, 0);
}

function evaluate5Card(cards: Card[]): HandResult {
  const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const straightHigh = straightHighCard(ranks);
  const isStraight = straightHigh !== false;

  const counts: Record<number, number> = {};
  for (const r of ranks) counts[r] = (counts[r] ?? 0) + 1;
  const groups = Object.entries(counts)
    .map(([r, c]) => ({ rank: Number(r), count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  if (isFlush && isStraight) {
    const h = straightHigh as number;
    return {
      category: "straight_flush",
      description: h === 14 ? "Royal Flush" : `Straight Flush, ${rankName(h)} high`,
      rankValue: 8_000_000 + h,
    };
  }
  if (groups[0].count === 4) {
    return {
      category: "four_of_a_kind",
      description: `Four of a Kind, ${rankPlural(groups[0].rank)}`,
      rankValue: 7_000_000 + groups[0].rank * 100 + (groups[1]?.rank ?? 0),
    };
  }
  if (groups[0].count === 3 && groups[1]?.count === 2) {
    return {
      category: "full_house",
      description: `Full House, ${rankPlural(groups[0].rank)} full of ${rankPlural(groups[1].rank)}`,
      rankValue: 6_000_000 + groups[0].rank * 100 + groups[1].rank,
    };
  }
  if (isFlush) {
    return {
      category: "flush",
      description: `${rankName(ranks[0])}-high Flush`,
      rankValue: 5_000_000 + encodeRanks(ranks),
    };
  }
  if (isStraight) {
    const h = straightHigh as number;
    return {
      category: "straight",
      description: `Straight, ${rankName(h)} high`,
      rankValue: 4_000_000 + h,
    };
  }
  if (groups[0].count === 3) {
    const kickers = groups.filter(g => g.count === 1).map(g => g.rank);
    return {
      category: "three_of_a_kind",
      description: `Three of a Kind, ${rankPlural(groups[0].rank)}`,
      rankValue: 3_000_000 + groups[0].rank * 1000 + encodeRanks(kickers),
    };
  }
  if (groups[0].count === 2 && groups[1]?.count === 2) {
    return {
      category: "two_pair",
      description: `Two Pair, ${rankPlural(groups[0].rank)} and ${rankPlural(groups[1].rank)}`,
      rankValue: 2_000_000 + groups[0].rank * 1000 + groups[1].rank * 100 + (groups[2]?.rank ?? 0),
    };
  }
  if (groups[0].count === 2) {
    const kickers = groups.filter(g => g.count === 1).map(g => g.rank);
    return {
      category: "pair",
      description: `Pair of ${rankPlural(groups[0].rank)}`,
      rankValue: 1_000_000 + groups[0].rank * 10_000 + encodeRanks(kickers),
    };
  }
  return {
    category: "high_card",
    description: `${rankName(ranks[0])}-high`,
    rankValue: encodeRanks(ranks),
  };
}

export function evaluateBestHand(heroCards: Card[], board: Card[]): HandResult {
  const all = [...heroCards, ...board];

  if (all.length < 5) {
    const ranks = all.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const counts: Record<number, number> = {};
    for (const r of ranks) counts[r] = (counts[r] ?? 0) + 1;
    const groups = Object.entries(counts)
      .map(([r, c]) => ({ rank: Number(r), count: c }))
      .sort((a, b) => b.count - a.count || b.rank - a.rank);
    if (groups[0]?.count >= 2) {
      return {
        category: "pair",
        description: `Pair of ${rankPlural(groups[0].rank)}`,
        rankValue: 1_000_000 + groups[0].rank * 10_000,
      };
    }
    return {
      category: "high_card",
      description: `${RANK_NAMES[ranks[0]] ?? ranks[0]}-high`,
      rankValue: ranks[0] ?? 0,
    };
  }

  const hands = all.length === 5 ? [all] : combinations(all, 5);
  let best: HandResult | null = null;
  for (const hand of hands) {
    const r = evaluate5Card(hand);
    if (!best || r.rankValue > best.rankValue) best = r;
  }
  return best!;
}
