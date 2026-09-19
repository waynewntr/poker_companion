"use client";

import { useHandStore, getEffectiveStack, getSPR, getBoardCards } from "@/state/handStore";
import { formatMoney } from "./MoneyInput";

export default function StackSummary() {
  const slots = useHandStore(s => s.slots);
  const pot = useHandStore(s => s.pot);
  const heroStack = useHandStore(s => s.heroStack);
  const villainStack = useHandStore(s => s.villainStack);

  const board = getBoardCards(slots);
  if (board.length < 3) return null;

  const effectiveStack = getEffectiveStack(heroStack, villainStack);
  const spr = getSPR(effectiveStack, pot);

  if (effectiveStack === undefined) return null;

  return (
    <div className="text-sm text-gray-300 space-y-1">
      <div className="flex justify-between">
        <span className="text-gray-500">Effective stack</span>
        <span>{formatMoney(effectiveStack)}</span>
      </div>
      {spr !== undefined && (
        <div className="flex justify-between">
          <span className="text-gray-500">SPR</span>
          <span>{spr.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
