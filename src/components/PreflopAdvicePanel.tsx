"use client";
import type { PreflopAdvice } from "@/data/preflopRanges";

interface Props { advice: PreflopAdvice; }

export default function PreflopAdvicePanel({ advice }: Props) {
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
      {advice.adjustmentNote && (
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 text-sm shrink-0">Adjustment</span>
          <span className="text-gray-500 italic text-xs text-right">{advice.adjustmentNote}</span>
        </div>
      )}
    </div>
  );
}
