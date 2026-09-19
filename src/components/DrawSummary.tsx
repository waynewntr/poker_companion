"use client";

import type { DrawAnalysis } from "@/poker/draws";
import type { OutsResult } from "@/poker/outs";

interface Props {
  drawAnalysis: DrawAnalysis;
  outsResult: OutsResult;
}

export default function DrawSummary({ drawAnalysis, outsResult }: Props) {
  if (outsResult.count === 0 && drawAnalysis.draws.length === 0) return null;

  return (
    <div className="text-sm space-y-1">
      {drawAnalysis.draws.length > 0 && (
        <p className="text-gray-300">{drawAnalysis.draws.join(" · ")}</p>
      )}
      {outsResult.count > 0 && (
        <p className="text-gray-400">
          <span className="text-white font-bold">{outsResult.count}</span> unique outs
          <span className="text-gray-600 ml-1 text-xs">(raw)</span>
        </p>
      )}
    </div>
  );
}
