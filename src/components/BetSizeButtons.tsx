"use client";

import { suggestBetSizes } from "@/strategy/betSizing";
import { convertAmount } from "@/state/handStore";

const FRACTIONS = [0.25, 0.33, 0.5, 0.67, 0.75, 1.0, 1.25, 1.5, 2.0];
const LABELS = ["¼", "⅓", "½", "⅔", "¾", "POT", "125%", "150%", "200%"];
const BB_LABELS = ["0.25bb", "0.33bb", "0.5bb", "0.67bb", "0.75bb", "1bb", "1.25bb", "1.5bb", "2bb"];

interface BetSizeButtonsProps {
  pot: number;
  onSelect: (amount: number) => void;
  bigBlind?: number;
  amountUnit?: "R" | "BB";
}

export default function BetSizeButtons({ pot, onSelect, bigBlind = 0, amountUnit = "R" }: BetSizeButtonsProps) {
  const amounts = suggestBetSizes(pot, FRACTIONS);

  // Function to handle button click - convert if needed
  function handleSelect(amount: number) {
    // The amount is in R; if we're in BB mode, convert before calling onSelect
    // Actually, we should store in R, so onSelect should receive R
    onSelect(amount);
  }

  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Bet Size</p>
      <div className="flex flex-wrap gap-2">
        {FRACTIONS.map((_, i) => {
          const amountInR = amounts[i];
          const displayLabel = amountUnit === "BB" ? BB_LABELS[i] : LABELS[i];
          const displayAmount = amountUnit === "BB" && bigBlind > 0
            ? convertAmount(amountInR, "R", "BB", bigBlind).toFixed(2)
            : amountInR.toLocaleString("en-ZA");
          
          return (
            <button
              key={i}
              onClick={() => handleSelect(amountInR)}
              className="flex flex-col items-center border border-[#2A2A35] rounded bg-[#1A1A1F] px-3 py-1.5 hover:bg-[#2A2A3F] transition-colors"
            >
              <span className="text-white text-xs font-bold">{displayLabel}</span>
              <span className="text-gray-400 text-xs">{displayAmount}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
