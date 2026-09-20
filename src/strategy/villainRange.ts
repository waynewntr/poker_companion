import { evaluateBestHand } from "@/poker/evaluator";
import { detectDraws } from "@/poker/draws";
import type { ArchetypeKey } from "@/data/archetypeRanges";
import type { Card } from "@/domain/cards";
import type { Position } from "@/domain/hand";
import type { HandCategory, HandResult } from "@/poker/evaluator";

export interface RangeThreat {
  archetype: ArchetypeKey;
  villainPosition: Position;
  totalCombos: number;
  beatHeroCount: number;
  beatHeroPct: number;
  drawingToWinCount: number;
  drawingToWinPct: number;
  drawDescriptions: string[];
  equityDenialFraction: number;
  threatLevel: "LOW" | "MEDIUM" | "HIGH";
}

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

const RANK_VALUES_MAP: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

function getHighestRankInSuit(cards: Card[], suit: Card["suit"]): number {
  const ranks = cards.filter(card => card.suit === suit).map(card => RANK_VALUES_MAP[card.rank] ?? 0);
  return ranks.length > 0 ? Math.max(...ranks) : 0;
}

function getFourCardFlushSuit(cards: Card[]): Card["suit"] | undefined {
  const suitCounts: Record<Card["suit"], number> = { s: 0, h: 0, d: 0, c: 0 };
  for (const card of cards) {
    suitCounts[card.suit] += 1;
  }

  return (Object.entries(suitCounts) as [Card["suit"], number][]).find(([, count]) => count === 4)?.[0];
}

function createZeroThreat(archetype: ArchetypeKey, villainPosition: Position): RangeThreat {
  return {
    archetype,
    villainPosition,
    totalCombos: 0,
    beatHeroCount: 0,
    beatHeroPct: 0,
    drawingToWinCount: 0,
    drawingToWinPct: 0,
    drawDescriptions: [],
    equityDenialFraction: 0.25,
    threatLevel: "LOW",
  };
}

function drawTypeFromLabel(label: string): "flush" | "straight" | null {
  const normalized = label.toLowerCase();
  if (normalized.includes("flush draw")) return "flush";
  if (normalized.includes("straight draw")) return "straight";
  return null;
}

function qualifiesAsDrawToBeatHero(drawType: "flush" | "straight", heroCategory: HandCategory): boolean {
  return CATEGORY_RANK[drawType] > CATEGORY_RANK[heroCategory];
}

export function analyzeVillainRange(
  combos: [Card, Card][],
  heroCards: Card[],
  board: Card[],
  heroResult: HandResult,
  archetype: ArchetypeKey,
  villainPosition: Position
): RangeThreat {
  if (combos.length === 0 || board.length < 3) {
    return createZeroThreat(archetype, villainPosition);
  }

  const totalCombos = combos.length;
  const drawCounts = new Map<string, number>();

  let beatHeroCount = 0;
  let drawingToWinCount = 0;

  for (const combo of combos) {
    const villainResult = evaluateBestHand([combo[0], combo[1]], board);

    if (villainResult.rankValue > heroResult.rankValue) {
      beatHeroCount++;
      continue;
    }

    const analysis = detectDraws([combo[0], combo[1]], board);
    let comboHasQualifyingDraw = false;

    for (const drawLabel of analysis.draws) {
      const drawType = drawTypeFromLabel(drawLabel);
      if (!drawType) continue;

      let countsAsThreat = false;

      if (drawType === "flush" && heroResult.category === "flush") {
        const villainCards = [combo[0], combo[1], ...board];
        const flushSuit = getFourCardFlushSuit(villainCards);
        if (flushSuit) {
          const villainHigh = getHighestRankInSuit(villainCards, flushSuit);
          const heroHigh = getHighestRankInSuit([...heroCards, ...board], flushSuit);
          if (villainHigh > heroHigh) {
            countsAsThreat = true;
          }
        }
      } else if (drawType === "straight" && heroResult.category === "straight") {
        countsAsThreat = true;
      } else if (qualifiesAsDrawToBeatHero(drawType, heroResult.category)) {
        countsAsThreat = true;
      }

      if (!countsAsThreat) continue;

      comboHasQualifyingDraw = true;
      const normalizedLabel = drawType === "flush" ? "Flush draw" : "Straight draw";
      drawCounts.set(normalizedLabel, (drawCounts.get(normalizedLabel) ?? 0) + 1);
    }

    if (comboHasQualifyingDraw) {
      drawingToWinCount++;
    }
  }

  const beatHeroPct = beatHeroCount / totalCombos;
  const drawingToWinPct = drawingToWinCount / totalCombos;

  const drawDescriptions = Array.from(drawCounts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, count]) => `${label}: ${count} combo${count === 1 ? "" : "s"}`);

  if (beatHeroPct > 0.2) {
    drawDescriptions.push(`Caution: ${(beatHeroPct * 100).toFixed(0)}% of range already ahead`);
  }

  let equityDenialFraction = 0.25;
  let threatLevel: RangeThreat["threatLevel"] = "LOW";

  if (drawingToWinPct >= 0.25) {
    equityDenialFraction = 0.67;
    threatLevel = "HIGH";
  } else if (drawingToWinPct >= 0.1) {
    equityDenialFraction = 0.5;
    threatLevel = "MEDIUM";
  }

  return {
    archetype,
    villainPosition,
    totalCombos,
    beatHeroCount,
    beatHeroPct,
    drawingToWinCount,
    drawingToWinPct,
    drawDescriptions,
    equityDenialFraction,
    threatLevel,
  };
}