"use client";

import { useHandStore, getEffectiveStack, getSPR, getBoardCards, convertAmount } from "@/state/handStore";

interface StackSummaryProps {
  bigBlind?: number;
  amountUnit?: "R" | "BB";
}

export default function StackSummary({ bigBlind = 0, amountUnit = "R" }: StackSummaryProps) {
  const slots = useHandStore(s => s.slots);
  const pot = useHandStore(s => s.pot);
  const heroStack = useHandStore(s => s.heroStack);
  const villainStack = useHandStore(s => s.villainStack);

  const board = getBoardCards(slots);
  if (board.length < 3) return null;

  const effectiveStack = getEffectiveStack(heroStack, villainStack);
  const spr = getSPR(effectiveStack, pot);

  if (effectiveStack === undefined) return null;

  // Convert display value based on unit
  const displayStack = amountUnit === "BB" && bigBlind > 0
    ? convertAmount(effectiveStack, "R", "BB", bigBlind)
    : effectiveStack;

  const stackLabel = amountUnit === "BB"
    ? `Effective stack (${amountUnit})`
    : `Effective stack (${amountUnit})`;

  const stackDisplay = amountUnit === "BB"
    ? displayStack.toFixed(2)
    : displayStack.toLocaleString("en-ZA");

  return (
    <div className="text-sm text-gray-300 space-y-1">
      <div className="flex justify-between">
        <span className="text-gray-500">{stackLabel}</span>
        <span>{stackDisplay}</span>
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
