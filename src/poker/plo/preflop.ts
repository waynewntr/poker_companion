import { Card, RANK_VALUES } from "@/domain/cards";

export interface PLOHandRating {
  rating: "Premium" | "Strong" | "Playable" | "Marginal";
  label: string;
  doubleSuited: boolean;
  singleSuited: boolean;
  hasAce: boolean;
  topPairRank?: number;
}

function countBy<T extends string | number>(values: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[String(value)] = (counts[String(value)] ?? 0) + 1;
  }
  return counts;
}

function longestRun(ranks: number[]): number {
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let best = 1;
  let run = 1;

  for (let i = 1; i < uniqueRanks.length; i++) {
    if (uniqueRanks[i - 1] - uniqueRanks[i] === 1) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  if (uniqueRanks.includes(14)) {
    const wheelRanks = uniqueRanks.map((rank) => (rank === 14 ? 1 : rank)).sort((a, b) => b - a);
    let wheelBest = 1;
    let wheelRun = 1;
    for (let i = 1; i < wheelRanks.length; i++) {
      if (wheelRanks[i - 1] - wheelRanks[i] === 1) {
        wheelRun++;
        wheelBest = Math.max(wheelBest, wheelRun);
      } else {
        wheelRun = 1;
      }
    }
    best = Math.max(best, wheelBest);
  }

  return best;
}

export function ratePloHand(cards: Card[]): PLOHandRating {
  const ranks = cards.map((card) => RANK_VALUES[card.rank]).sort((a, b) => b - a);
  const suits = cards.map((card) => card.suit);
  const suitCounts = countBy(suits);
  const suitCountValues = Object.values(suitCounts);
  const doubleSuited = suitCountValues.filter((count) => count >= 2).length >= 2;
  const singleSuited = !doubleSuited && suitCountValues.some((count) => count >= 2);
  const hasAce = ranks.includes(14);

  const rankCounts = countBy(ranks);
  const pairRanks = Object.entries(rankCounts)
    .filter(([, count]) => count >= 2)
    .map(([rank]) => Number(rank))
    .sort((a, b) => b - a);
  const topPairRank = pairRanks[0];
  const secondPairRank = pairRanks[1];
  const uniqueRanks = [...new Set(ranks)];

  const maxRun = longestRun(ranks);
  const isRundown = maxRun >= 4;
  const isSemiRundown = maxRun >= 3;
  const connectedAce = hasAce && isSemiRundown;

  if (topPairRank === 14) {
    if (doubleSuited) {
      return {
        rating: "Premium",
        label: "Double-suited Aces",
        doubleSuited,
        singleSuited,
        hasAce,
        topPairRank,
      };
    }

    return {
      rating: "Strong",
      label: "Aces",
      doubleSuited,
      singleSuited,
      hasAce,
      topPairRank,
    };
  }

  if (doubleSuited && isRundown) {
    return {
      rating: "Premium",
      label: "Double-suited rundown",
      doubleSuited,
      singleSuited,
      hasAce,
      topPairRank,
    };
  }

  if (topPairRank && topPairRank >= 12 && doubleSuited) {
    return {
      rating: "Strong",
      label: "High pair double-suited",
      doubleSuited,
      singleSuited,
      hasAce,
      topPairRank,
    };
  }

  if (isRundown && doubleSuited) {
    return {
      rating: "Strong",
      label: "Double-suited rundown",
      doubleSuited,
      singleSuited,
      hasAce,
      topPairRank,
    };
  }

  if (isRundown && singleSuited && uniqueRanks[0] >= 11) {
    return {
      rating: "Strong",
      label: "Single-suited rundown (broadway)",
      doubleSuited,
      singleSuited,
      hasAce,
      topPairRank,
    };
  }

  if (topPairRank && topPairRank >= 11 && (isSemiRundown || singleSuited)) {
    return {
      rating: "Playable",
      label: "High pair with support",
      doubleSuited,
      singleSuited,
      hasAce,
      topPairRank,
    };
  }

  if (connectedAce && (singleSuited || doubleSuited)) {
    return {
      rating: "Playable",
      label: "Suited ace with connectivity",
      doubleSuited,
      singleSuited,
      hasAce,
      topPairRank,
    };
  }

  if (isSemiRundown && (doubleSuited || singleSuited)) {
    return {
      rating: "Playable",
      label: "Connected suited hand",
      doubleSuited,
      singleSuited,
      hasAce,
      topPairRank,
    };
  }

  return {
    rating: "Marginal",
    label: "Uncoordinated / weak",
    doubleSuited,
    singleSuited,
    hasAce,
    topPairRank,
  };
}