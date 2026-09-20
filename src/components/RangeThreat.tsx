"use client";

import type { RangeThreat } from "@/strategy/villainRange";
import { ARCHETYPE_LABELS } from "@/data/archetypeRanges";
import { formatMoney } from "@/components/MoneyInput";
import { suggestBetSizes } from "@/strategy/betSizing";

const THREAT_COLOR = {
  LOW: "text-green-400",
  MEDIUM: "text-amber-400",
  HIGH: "text-red-400",
};

const THREAT_EMOJI = {
  LOW: "🟢",
  MEDIUM: "🟠",
  HIGH: "🔴",
};

interface Props {
  threat: RangeThreat;
  pot: number;
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function RangeThreat({ threat, pot }: Props) {
  const {
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
  } = threat;

  const denialBetAmount = suggestBetSizes(pot, [equityDenialFraction])[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-gray-500">Villain Range Threat</p>
        <span className="text-[10px] text-gray-600">
          {ARCHETYPE_LABELS[archetype]} · {villainPosition} · {totalCombos} combos
        </span>
      </div>

      {totalCombos === 0 ? (
        <p className="text-xs italic text-gray-600">
          {villainPosition === "BB"
            ? "BB has no opening range — analysis unavailable."
            : "No range data for this position."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-gray-500">Currently beating you</span>
            <span className="text-right text-white">
              {beatHeroCount} <span className="text-gray-500">({pct(beatHeroPct)})</span>
            </span>

            <span className="text-gray-500">Drawing to beat you</span>
            <span className={`text-right font-bold ${THREAT_COLOR[threatLevel]}`}>
              {THREAT_EMOJI[threatLevel]} {drawingToWinCount} <span className="font-normal">({pct(drawingToWinPct)})</span>
            </span>
          </div>

          {drawDescriptions.length > 0 && (
            <ul className="space-y-0.5">
              {drawDescriptions.map((description, index) => (
                <li key={index} className="text-[11px] text-gray-400">
                  · {description}
                </li>
              ))}
            </ul>
          )}

          {drawingToWinCount > 0 && (
            <div className="border-t border-[#2A2A35] pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Denial bet</span>
                <span className="text-white">
                  ≥ {Math.round(equityDenialFraction * 100)}% pot
                  {pot > 0 && (
                    <span className="ml-1 text-gray-400">({formatMoney(denialBetAmount)})</span>
                  )}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] italic text-gray-600">
                Charges draws more than their equity warrants
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}