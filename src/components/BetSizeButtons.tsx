"use client";

import { suggestBetSizes } from "@/strategy/betSizing";
import { formatMoney } from "./MoneyInput";

const FRACTIONS = [0.25, 0.33, 0.5, 0.67, 0.75, 1.0, 1.25, 1.5, 2.0];
const LABELS = ["¼", "⅓", "½", "⅔", "¾", "POT", "125%", "150%", "200%"];

interface BetSizeButtonsProps {
  pot: number;
  onSelect: (amount: number) => void;
}

export default function BetSizeButtons({ pot, onSelect }: BetSizeButtonsProps) {
  const amounts = suggestBetSizes(pot, FRACTIONS);

  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Bet Size</p>
      <div className="flex flex-wrap gap-2">
        {FRACTIONS.map((_, i) => (
          <button
            key={i}
            onClick={() => onSelect(amounts[i])}
            className="flex flex-col items-center border border-[#2A2A35] rounded bg-[#1A1A1F] px-3 py-1.5 hover:bg-[#2A2A3F] transition-colors"
          >
            <span className="text-white text-xs font-bold">{LABELS[i]}</span>
            <span className="text-gray-400 text-xs">{formatMoney(amounts[i])}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
