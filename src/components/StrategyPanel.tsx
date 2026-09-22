"use client";

import { useState } from "react";
import type { StrategyResult, StrategyStyle } from "@/strategy/rangeContext";
import { suggestBetSizes } from "@/strategy/betSizing";
import { convertAmount } from "@/state/handStore";

const STYLE_LABELS: Record<StrategyStyle, string> = {
  SMALL_FREQUENT: "Small / Frequent",
  MIXED: "Mixed / Medium",
  CHECK_MORE: "Check More",
  POLARIZED: "Polarized",
  OVERBET_CANDIDATE: "Overbet Candidate",
  INSUFFICIENT_CONTEXT: "Insufficient Context",
};

const CONFIDENCE_CLASS: Record<string, string> = {
  HIGH: "text-green-400",
  MEDIUM: "text-amber-400",
  LOW: "text-gray-500",
};

interface Props {
  strategy: StrategyResult;
  pot: number;
  bigBlind?: number;
  amountUnit?: "R" | "BB";
}

export default function StrategyPanel({ strategy, pot, bigBlind = 0, amountUnit = "R" }: Props) {
  const [open, setOpen] = useState(true);
  const { boardTexture, rangeAdvantage, nutAdvantage, style, suggestedBetSizes, confidence, explanation } = strategy;
  const absoluteSizes = suggestBetSizes(pot, suggestedBetSizes);

  // Convert sizes to display unit
  const displaySizes = absoluteSizes.map(size =>
    amountUnit === "BB" && bigBlind > 0
      ? convertAmount(size, "R", "BB", bigBlind).toFixed(2)
      : size.toLocaleString("en-ZA")
  );

  return (
    <div className="border-t border-[#2A2A35] pt-4">
      <button
        className="flex w-full items-center justify-between mb-3"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs text-gray-500 uppercase tracking-widest">
          Strategy — Modern baseline
        </span>
        <span className="text-gray-600 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Board</span>
            <span className="text-gray-300">{boardTexture.join(" / ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Range advantage</span>
            <span className="text-white capitalize">{rangeAdvantage.toLowerCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Nut advantage</span>
            <span className="text-white capitalize">{nutAdvantage.toLowerCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Strategy</span>
            <span className="text-white">{STYLE_LABELS[style]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Suggested size</span>
            <span className="text-white">
              {suggestedBetSizes.map(f => `${Math.round(f * 100)}%`).join("–")}
              {pot > 0 && ` (${displaySizes.join("–")})`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Confidence</span>
            <span className={CONFIDENCE_CLASS[confidence] ?? "text-gray-400"}>{confidence}</span>
          </div>
          <p className="text-gray-500 text-xs italic pt-1">{explanation}</p>
        </div>
      )}
    </div>
  );
}
