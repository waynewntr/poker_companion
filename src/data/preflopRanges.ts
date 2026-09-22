import type { Position } from "@/domain/hand";
import type { ArchetypeKey } from "@/data/archetypeRanges";
import type { PreflopAction } from "@/state/handStore";

export interface PreflopAdvice {
  suggestedAction: string;
  sizing: string;
  valueRange: string[];
  mixRange: string[];
  adjustmentNote?: string;
}

// ── VS Single Limper ──────────────────────────────────────────────────────────

const VS_SINGLE_LIMPER_RANGES: Partial<Record<Position, string[]>> = {
  HJ: ["77","88","99","TT","JJ","QQ","KK","AA","A9s","ATs","AJs","AQs","AKs","KTs","KJs","KQs","QTs","QJs","JTs","T9s","AJo","AQo","AKo","KQo"],
  CO: ["66","77","88","99","TT","JJ","QQ","KK","AA","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K8s","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T9s","98s","ATo","AJo","AQo","AKo","KJo","KQo","QJo"],
  BTN: ["44","55","66","77","88","99","TT","JJ","QQ","KK","AA","A2s","A3s","A4s","A5s","A6s","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K6s","K7s","K8s","K9s","KTs","KJs","KQs","Q9s","QTs","QJs","J9s","JTs","T9s","98s","87s","76s","A9o","ATo","AJo","AQo","AKo","KTo","KJo","KQo","QTo","QJo","JTo"],
  SB: ["66","77","88","99","TT","JJ","QQ","KK","AA","A8s","A9s","ATs","AJs","AQs","AKs","KTs","KJs","KQs","QTs","QJs","JTs","T9s","AJo","AQo","AKo","KQo"],
  BB: ["66","77","88","99","TT","JJ","QQ","KK","AA","A7s","A8s","A9s","ATs","AJs","AQs","AKs","K9s","KTs","KJs","KQs","QTs","QJs","JTs","T9s","98s","AJo","AQo","AKo","KQo"],
};

// ── VS Open Raise Matrix (opener → hero → { three_bet, mix }) ─────────────────

type ThreeBetEntry = { three_bet: string[]; mix: string[] };

const VS_OPEN_RAISE_MATRIX: Partial<Record<Position, Partial<Record<Position, ThreeBetEntry>>>> = {
  UTG: {
    HJ:  { three_bet: ["QQ","KK","AA","AKs","AKo","AQs"],                                                                               mix: ["JJ","AJs","A5s"] },
    CO:  { three_bet: ["JJ","QQ","KK","AA","AKs","AKo","AQs"],                                                                           mix: ["TT","AJs","A5s","A4s"] },
    BTN: { three_bet: ["JJ","QQ","KK","AA","AQs","AKs","AKo"],                                                                           mix: ["TT","AJs","ATs","A5s","A4s","KQs"] },
    SB:  { three_bet: ["JJ","QQ","KK","AA","AQs","AKs","AKo"],                                                                           mix: ["TT","AJs","A5s","A4s","KQs"] },
    BB:  { three_bet: ["QQ","KK","AA","AKs","AKo","AQs"],                                                                                mix: ["JJ","TT","AJs","A5s","A4s","KQs"] },
  },
  HJ: {
    CO:  { three_bet: ["JJ","QQ","KK","AA","AQs","AKs","AKo"],                                                                           mix: ["TT","AJs","ATs","A5s","A4s","KQs","AQo"] },
    BTN: { three_bet: ["TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"],                                                    mix: ["99","ATs","A5s","A4s","KJs","QJs"] },
    SB:  { three_bet: ["TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"],                                                    mix: ["99","ATs","A5s","A4s","KJs"] },
    BB:  { three_bet: ["JJ","QQ","KK","AA","AQs","AKs","AKo"],                                                                           mix: ["TT","99","AJs","ATs","A5s","A4s","KQs","KJs"] },
  },
  CO: {
    BTN: { three_bet: ["TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"],                                                    mix: ["99","88","ATs","A2s","A3s","A4s","A5s","KJs","QJs","JTs","T9s","65s","AJo","KQo"] },
    SB:  { three_bet: ["TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"],                                                    mix: ["99","88","ATs","A2s","A3s","A4s","A5s","KJs","QJs","JTs","T9s","AJo","KQo"] },
    BB:  { three_bet: ["JJ","QQ","KK","AA","AQs","AKs","AKo"],                                                                           mix: ["TT","99","AJs","ATs","A2s","A3s","A4s","A5s","KQs","KJs","QJs","JTs","T9s"] },
  },
  BTN: {
    SB:  { three_bet: ["99","TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"],                                               mix: ["88","77","ATs","A2s","A3s","A4s","A5s","KJs","KTs","QJs","QTs","JTs","T9s","AJo","KQo"] },
    BB:  { three_bet: ["TT","JJ","QQ","KK","AA","AJs","AQs","AKs","AQo","AKo","KQs"],                                                    mix: ["99","88","ATs","A2s","A3s","A4s","A5s","KJs","QJs","JTs","T9s","98s","AJo","KQo"] },
  },
  SB: {
    BB:  { three_bet: ["99","TT","JJ","QQ","KK","AA","ATs","AJs","AQs","AKs","AQo","AKo","KQs"],                                         mix: ["88","77","A2s","A3s","A4s","A5s","KJs","KTs","QJs","QTs","JTs","T9s","98s","AJo","KQo"] },
  },
};

// ── Villain Archetype Adjustments ─────────────────────────────────────────────

const ADJUSTMENTS: Record<ArchetypeKey, string> = {
  nit:               "Tighten — reduce bluff 3-bets; respect tighter opening ranges.",
  tag:               "Baseline — no adjustment needed.",
  gto_oriented_reg:  "Baseline — no adjustment needed.",
  lag:               "Widen — add value and selected semi-bluff 3-bets.",
  calling_station:   "Tighten and linearize — their raise is usually far stronger than their VPIP.",
  maniac:            "Widen value — widen value 3-bets; reduce weak bluffs if they rarely fold.",
};

// ── Lookup function ───────────────────────────────────────────────────────────

export function getPreflopAdvice(
  villainAction: PreflopAction,
  heroPosition: Position | undefined,
  villainPosition: Position | undefined,
  villainArchetype?: ArchetypeKey
): PreflopAdvice | null {
  if (villainAction === "LIMP") {
    if (!heroPosition) return null;
    const range = VS_SINGLE_LIMPER_RANGES[heroPosition];
    if (!range) return null;

    const sizing = heroPosition === "SB" || heroPosition === "BB"
      ? "5bb (OOP)"
      : "4bb (in-position)";

    return {
      suggestedAction: "ISO Raise",
      sizing,
      valueRange: range,
      mixRange: [],
      ...(villainArchetype !== undefined && { adjustmentNote: ADJUSTMENTS[villainArchetype] }),
    };
  }

  if (villainAction === "OPEN_RAISE") {
    if (!heroPosition || !villainPosition) return null;
    const entry = VS_OPEN_RAISE_MATRIX[villainPosition]?.[heroPosition];
    if (!entry) return null;

    return {
      suggestedAction: "3-Bet (value) / Call (mix)",
      sizing: "3.0–3.5x in-position / 4.0–4.5x OOP",
      valueRange: entry.three_bet,
      mixRange: entry.mix,
      ...(villainArchetype !== undefined && { adjustmentNote: ADJUSTMENTS[villainArchetype] }),
    };
  }

  if (villainAction === "SQUEEZE") {
    return {
      suggestedAction: "Squeeze",
      sizing: "~4x opener in-position / ~5x OOP (+ 1x per caller)",
      valueRange: [],
      mixRange: [],
      adjustmentNote: "Use a stronger value range than vs single opener. Prefer blocker and suited hands with strong postflop playability.",
    };
  }

  return null;
}
