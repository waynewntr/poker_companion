"use client";

import type { Card } from "@/domain/cards";
import { ratePloHand } from "@/poker/plo/preflop";
import type { PLOHandRating } from "@/poker/plo/preflop";

const RATING_CONFIG: Record<PLOHandRating["rating"], { emoji: string; className: string; action: string }> = {
  Premium: { emoji: "🟢", className: "text-green-500", action: "OPEN / 3-BET" },
  Strong: { emoji: "🟡", className: "text-yellow-400", action: "OPEN" },
  Playable: { emoji: "🟠", className: "text-amber-400", action: "OPEN (position-dependent)" },
  Marginal: { emoji: "🔴", className: "text-red-500", action: "FOLD" },
};

const RANK_LABELS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

export default function PloPreflopPanel({ heroCards }: { heroCards: Card[] }) {
  if (heroCards.length !== 4) {
    return (
      <section className="space-y-3 rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
        <p className="text-xs uppercase tracking-widest text-gray-500">Preflop — PLO</p>
        <p className="text-sm italic text-gray-500">Select all 4 hole cards to see an opening recommendation.</p>
      </section>
    );
  }

  const rating = ratePloHand(heroCards);
  const config = RATING_CONFIG[rating.rating];

  return (
    <section className="space-y-4 rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
      <p className="text-xs uppercase tracking-widest text-gray-500">Preflop — PLO</p>

      <div className={`text-3xl font-black ${config.className}`}>
        {config.emoji} {config.action}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-gray-500">Hand type</span>
        <span className="text-right text-white">{rating.label}</span>

        <span className="text-gray-500">Rating</span>
        <span className={`text-right font-bold ${config.className}`}>{rating.rating}</span>

        <span className="text-gray-500">Double-suited</span>
        <span className="text-right text-white">{rating.doubleSuited ? "Yes" : "No"}</span>

        {rating.topPairRank !== undefined && (
          <>
            <span className="text-gray-500">Top pair</span>
            <span className="text-right text-white">{RANK_LABELS[rating.topPairRank - 2]}s</span>
          </>
        )}
      </div>

      <p className="text-[11px] italic text-gray-600">
        {rating.doubleSuited
          ? "Double-suited hands can realize equity from two separate flush-draw paths."
          : rating.singleSuited
            ? "Single-suited hands gain one flush-draw path and value more coordinated ranks."
            : "Rainbow PLO hands need stronger connectivity or pair strength to stay playable."}
      </p>
    </section>
  );
}