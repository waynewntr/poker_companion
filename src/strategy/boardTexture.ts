import { Card, RANK_VALUES, Suit } from "../domain/cards";

export interface BoardAnalysis {
  paired: boolean;
  monotone: boolean;
  twoTone: boolean;
  rainbow: boolean;
  connectedness: "LOW" | "MEDIUM" | "HIGH";
  straightPotential: "LOW" | "MEDIUM" | "HIGH";
  flushPotential: "LOW" | "MEDIUM" | "HIGH";
  dynamism: "STATIC" | "SEMI_DYNAMIC" | "DYNAMIC" | "VERY_DYNAMIC";
  labels: string[];
}

function suitCounts(cards: Card[]): Record<Suit, number> {
  const counts: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
  for (const c of cards) counts[c.suit]++;
  return counts;
}

function rankCounts(cards: Card[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const c of cards) {
    const v = RANK_VALUES[c.rank];
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

// Number of distinct straight combinations that can be made with the board ranks
function countStraightCombinations(rankVals: number[]): number {
  const ALL_STRAIGHTS: number[][] = [
    [14, 5, 4, 3, 2], [6, 5, 4, 3, 2], [7, 6, 5, 4, 3],
    [8, 7, 6, 5, 4], [9, 8, 7, 6, 5], [10, 9, 8, 7, 6],
    [11, 10, 9, 8, 7], [12, 11, 10, 9, 8], [13, 12, 11, 10, 9],
    [14, 13, 12, 11, 10],
  ];
  const valSet = new Set(rankVals);
  let count = 0;
  for (const s of ALL_STRAIGHTS) {
    if (s.filter(r => valSet.has(r)).length >= 3) count++;
  }
  return count;
}

export function analyzeBoardTexture(board: Card[]): BoardAnalysis {
  if (board.length < 3) {
    return {
      paired: false, monotone: false, twoTone: false, rainbow: false,
      connectedness: "LOW", straightPotential: "LOW", flushPotential: "LOW",
      dynamism: "STATIC", labels: [],
    };
  }

  const suits = suitCounts(board);
  const ranks = rankCounts(board);
  const rankVals = board.map(c => RANK_VALUES[c.rank]);
  const uniqueSuits = Object.values(suits).filter(v => v > 0).length;
  const maxSuitCount = Math.max(...Object.values(suits));

  const paired = Object.values(ranks).some(v => v >= 2);
  const monotone = uniqueSuits === 1;
  const twoTone = uniqueSuits === 2;
  const rainbow = uniqueSuits >= 3;

  // Flush potential: how close to a flush
  const flushPotential: "LOW" | "MEDIUM" | "HIGH" =
    monotone ? "HIGH" : maxSuitCount >= 2 ? "MEDIUM" : "LOW";

  // Connectedness: how close together the ranks are
  const sortedRanks = [...rankVals].sort((a, b) => a - b);
  const span = sortedRanks[sortedRanks.length - 1] - sortedRanks[0];
  const gaps = sortedRanks.slice(1).map((r, i) => r - sortedRanks[i]);
  const maxGap = Math.max(...gaps);

  const connectedness: "LOW" | "MEDIUM" | "HIGH" =
    span <= 4 && maxGap <= 2 ? "HIGH"
    : span <= 7 || maxGap <= 3 ? "MEDIUM"
    : "LOW";

  // Straight potential: how many 5-card straights include 3+ board cards
  const straightCombos = countStraightCombinations(rankVals);
  const straightPotential: "LOW" | "MEDIUM" | "HIGH" =
    straightCombos >= 4 ? "HIGH" : straightCombos >= 2 ? "MEDIUM" : "LOW";

  // Dynamism
  const dynamism: "STATIC" | "SEMI_DYNAMIC" | "DYNAMIC" | "VERY_DYNAMIC" =
    (connectedness === "HIGH" && (twoTone || monotone)) ? "VERY_DYNAMIC"
    : (connectedness === "HIGH" || (connectedness === "MEDIUM" && (twoTone || monotone))) ? "DYNAMIC"
    : (connectedness === "MEDIUM" || twoTone) ? "SEMI_DYNAMIC"
    : "STATIC";

  // Human-readable labels
  const labels: string[] = [];
  if (paired) labels.push("Paired");
  if (monotone) labels.push("Monotone");
  else if (twoTone) labels.push("Two-Tone");
  else labels.push("Rainbow");
  if (dynamism === "STATIC") labels.push("Dry");
  else if (dynamism === "VERY_DYNAMIC") labels.push("Very Dynamic");
  else if (dynamism === "DYNAMIC") labels.push("Dynamic");
  else labels.push("Semi-Dynamic");

  return { paired, monotone, twoTone, rainbow, connectedness, straightPotential, flushPotential, dynamism, labels };
}
