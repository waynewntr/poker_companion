"use client";
import type { Position } from "@/domain/hand";
import type { PreflopAdvice } from "@/data/preflopRanges";
import { convertAmount } from "@/state/handStore";

const POSITION_RANK: Partial<Record<Position, number>> = { UTG: 0, HJ: 1, CO: 2, BTN: 3, SB: 4, BB: 5 };

interface Props {
  advice: PreflopAdvice;
  preflopActionSize?: string | null;
  bigBlind?: number;
  amountUnit?: "R" | "BB";
  heroPosition?: Position;
  villainPosition?: Position;
}

export default function PreflopAdvicePanel({ advice, preflopActionSize, bigBlind = 0, amountUnit = "R", heroPosition, villainPosition }: Props) {
  const openSizeBB = preflopActionSize ? parseFloat(preflopActionSize.match(/(\d+\.?\d*)/)?.[1] ?? "") : NaN;
  const isIP = heroPosition && villainPosition
    ? (POSITION_RANK[heroPosition] ?? 0) > (POSITION_RANK[villainPosition] ?? 0)
    : null;

  // For OPEN_RAISE response: calculate 3-bet size based on villain's open and hero's position
  const responseSizeBB = advice.suggestedAction.includes("3-Bet") && !isNaN(openSizeBB)
    ? openSizeBB * (isIP === true ? 3.0 : isIP === false ? 3.5 : 3.25)
    : null;
  const responseSizeR = responseSizeBB !== null && bigBlind > 0 ? responseSizeBB * bigBlind : null;

  // For LIMP response: ISO size is fixed (4bb IP, 5bb OOP)
  const isoMultiplier = advice.suggestedAction === "ISO Raise" ? (isIP === false ? 5 : 4) : null;
  const isoSizeBB = isoMultiplier;
  const isoSizeR = isoSizeBB !== null && bigBlind > 0 ? isoSizeBB * bigBlind : null;
  return (
    <div className="space-y-2">
      <span className="text-xs uppercase tracking-widest text-gray-500">Preflop Response</span>
      <div className="flex justify-between">
        <span className="text-gray-500 text-sm">Suggested</span>
        <span className="text-white text-sm">{advice.suggestedAction}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500 text-sm">Sizing</span>
        <span className="text-gray-300 text-sm">{advice.sizing}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span className="text-gray-500 text-sm shrink-0">Value range</span>
        <span className="text-green-400 text-xs leading-relaxed text-right break-words">{advice.valueRange.join(", ")}</span>
      </div>
      {advice.mixRange.length > 0 && (
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 text-sm shrink-0">Mix range</span>
          <span className="text-amber-400 text-xs text-right break-words">{advice.mixRange.join(", ")}</span>
        </div>
      )}
      {responseSizeBB !== null && (
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 text-sm shrink-0">Suggested 3-bet</span>
          <span className="text-white text-sm text-right">
            {amountUnit === "BB" || bigBlind <= 0
              ? `${responseSizeBB.toFixed(1)}bb (${isIP === true ? "3.0" : isIP === false ? "3.5" : "3.25"}×)`
              : `R\u00a0${responseSizeR!.toLocaleString("en-ZA")}\u00a0(${responseSizeBB.toFixed(1)}bb)`
            }
          </span>
        </div>
      )}
      {isoSizeBB !== null && bigBlind > 0 && (
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 text-sm shrink-0">Suggested ISO</span>
          <span className="text-white text-sm text-right">
            {amountUnit === "BB"
              ? `${isoSizeBB}bb`
              : `R\u00a0${isoSizeR!.toLocaleString("en-ZA")}\u00a0(${isoSizeBB}bb)`
            }
          </span>
        </div>
      )}
      {advice.adjustmentNote && (
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 text-sm shrink-0">Adjustment</span>
          <span className="text-gray-500 italic text-xs text-right">{advice.adjustmentNote}</span>
        </div>
      )}
    </div>
  );
}
