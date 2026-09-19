"use client";

import type { DecisionResult as DecisionResultType } from "@/poker/decisionEngine";
import { formatMoney } from "@/components/MoneyInput";

const SIGNAL_CONFIG = {
  CALL: { emoji: "🟢", label: "CALL", class: "text-green-500" },
  FOLD: { emoji: "🔴", label: "FOLD", class: "text-red-500" },
  CLOSE: { emoji: "🟠", label: "CLOSE / IMPLIED ODDS", class: "text-amber-400" },
  RANGE_REQUIRED: { emoji: "⚪", label: "RANGE REQUIRED", class: "text-gray-400" },
};

function pct(v: number | undefined) {
  if (v === undefined) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function marginSign(m: number) {
  return m > 0 ? `+${(m * 100).toFixed(1)}%` : `${(m * 100).toFixed(1)}%`;
}

interface Props {
  result: DecisionResultType;
}

export default function DecisionResult({ result }: Props) {
  const { signal, requiredEquity, comparisonProbability, margin, reason, impliedOdds } = result;
  const cfg = SIGNAL_CONFIG[signal];

  return (
    <div className="space-y-3">
      <div className={`text-3xl font-black ${cfg.class}`}>
        {cfg.emoji} {cfg.label}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-gray-500">Required equity</span>
        <span className="text-white text-right">{pct(requiredEquity)}</span>

        {comparisonProbability !== undefined && (
          <>
            <span className="text-gray-500">Draw probability</span>
            <span className="text-white text-right">{pct(comparisonProbability)}</span>
          </>
        )}

        {margin !== undefined && (
          <>
            <span className="text-gray-500">Margin</span>
            <span className={`text-right ${margin >= 0 ? "text-green-400" : "text-red-400"}`}>
              {marginSign(margin)}
            </span>
          </>
        )}
      </div>

      {signal === "RANGE_REQUIRED" && (
        <p className="text-xs text-gray-500 italic">{reason}</p>
      )}

      {impliedOdds && signal === "CLOSE" && impliedOdds.futureWinningsRequired < Infinity && (
        <div className="text-xs text-gray-400 border-t border-[#2A2A35] pt-2 mt-2">
          <span>Additional future winnings required: </span>
          <span className="text-white">
            {formatMoney(Math.round(impliedOdds.futureWinningsRequired))}
          </span>
          {impliedOdds.effectiveStackAvailable !== undefined && (
            <span className={impliedOdds.possible ? " text-green-400" : " text-red-400"}>
              {" "}({impliedOdds.possible ? "Possible" : "Unlikely"} from stack)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
