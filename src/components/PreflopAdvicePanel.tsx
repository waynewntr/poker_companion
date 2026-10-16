"use client";
import type { Card } from "@/domain/cards";
import type { Position } from "@/domain/hand";
import type { PreflopAdvice } from "@/data/preflopRanges";
import { handToType } from "@/data/archetypeRanges";

const POSITION_RANK: Partial<Record<Position, number>> = { UTG: 0, HJ: 1, CO: 2, BTN: 3, SB: 4, BB: 5 };

interface Props {
  advice: PreflopAdvice;
  heroCards?: Card[];
  preflopActionSize?: string | null;
  bigBlind?: number;
  amountUnit?: "R" | "BB";
  heroPosition?: Position;
  villainPosition?: Position;
  onAddToPot?: (amount: number) => void;
}

export default function PreflopAdvicePanel({ advice, heroCards, preflopActionSize, bigBlind = 0, amountUnit = "R", heroPosition, villainPosition, onAddToPot }: Props) {
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

  const handType = heroCards?.length === 2 ? handToType(heroCards[0], heroCards[1]) : null;
  const inValue  = handType !== null && advice.valueRange.includes(handType);
  const inMix    = handType !== null && advice.mixRange.includes(handType);
  const signal   = inValue ? "value" : inMix ? "mix" : handType ? "fold" : null;
  return (
    <div className="space-y-2">
      <span className="text-xs uppercase tracking-widest text-gray-500">Preflop Response</span>
      {signal && (
        <div className={`text-2xl font-black ${
          signal === "value" ? "text-green-500" :
          signal === "mix"   ? "text-amber-400" :
                               "text-red-500"
        }`}>
          {signal === "value"
            ? `\u{1F7E2} ${advice.suggestedAction.split(" ")[0].toUpperCase()}`
            : signal === "mix"
            ? "\u{1F7E1} MIX / CALL"
            : "\u{1F534} NOT IN RANGE"}
        </div>
      )}
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
          <span className="flex items-center justify-end gap-2 text-white text-sm text-right">
            {amountUnit === "BB" || bigBlind <= 0
              ? `${responseSizeBB.toFixed(1)}bb (${isIP === true ? "3.0" : isIP === false ? "3.5" : "3.25"}×)`
              : `R\u00a0${responseSizeR!.toLocaleString("en-ZA")}\u00a0(${responseSizeBB.toFixed(1)}bb)`
            }
            {onAddToPot && responseSizeR !== null && (
              <button
                onClick={() => onAddToPot(responseSizeR!)}
                title="Add suggested 3-bet to pot"
                className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-1.5 py-0.5 text-[11px] font-bold text-gray-300 transition-colors hover:bg-[#2A2A3F]"
              >+</button>
            )}
          </span>
        </div>
      )}
      {isoSizeBB !== null && bigBlind > 0 && (
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 text-sm shrink-0">Suggested ISO</span>
          <span className="flex items-center justify-end gap-2 text-white text-sm text-right">
            {amountUnit === "BB"
              ? `${isoSizeBB}bb`
              : `R\u00a0${isoSizeR!.toLocaleString("en-ZA")}\u00a0(${isoSizeBB}bb)`
            }
            {onAddToPot && isoSizeR !== null && (
              <button
                onClick={() => onAddToPot(isoSizeR!)}
                title="Add suggested ISO to pot"
                className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-1.5 py-0.5 text-[11px] font-bold text-gray-300 transition-colors hover:bg-[#2A2A3F]"
              >+</button>
            )}
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
