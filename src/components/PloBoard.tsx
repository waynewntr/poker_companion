"use client";

import { SUIT_SYMBOLS, SUIT_TEXT_CLASS_MAP } from "@/domain/cards";
import { useHandStore } from "@/state/handStore";
import type { Card } from "@/domain/cards";
import type { SlotName } from "@/state/handStore";

function CardSlot({ card, slot, active }: { card: Card | null; slot: SlotName; active: boolean }) {
  const setActiveSlot = useHandStore((state) => state.setActiveSlot);
  const clearSlot = useHandStore((state) => state.clearSlot);

  const suitClass = card ? SUIT_TEXT_CLASS_MAP[card.suit] : "text-gray-600";

  function handleClick() {
    if (card) {
      clearSlot(slot);
    } else {
      setActiveSlot(slot);
    }
  }

  return (
    <button
      onClick={handleClick}
      className={[
        "flex h-14 w-11 flex-col items-center justify-center rounded border text-sm font-bold",
        "transition-colors",
        active
          ? "border-blue-500 bg-[#1A1A2F]"
          : "border-[#2A2A35] bg-[#1A1A1F]",
        suitClass,
      ].join(" ")}
    >
      {card ? (
        <>
          <span>{card.rank}</span>
          <span className="text-xl leading-none">{SUIT_SYMBOLS[card.suit]}</span>
        </>
      ) : (
        <span className="text-lg text-gray-600">?</span>
      )}
    </button>
  );
}

export default function PloBoard() {
  const slots = useHandStore((state) => state.slots);
  const activeSlot = useHandStore((state) => state.activeSlot);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1 text-xs uppercase tracking-widest text-gray-500">Your Hand (PLO — 4 cards)</p>
        <div className="flex gap-2">
          {(["hero1", "hero2", "hero3", "hero4"] as SlotName[]).map((slot) => (
            <CardSlot key={slot} card={slots[slot]} slot={slot} active={activeSlot === slot} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs uppercase tracking-widest text-gray-500">Board</p>
        <div className="flex gap-2">
          {(["flop1", "flop2", "flop3", "turn", "river"] as SlotName[]).map((slot) => (
            <CardSlot key={slot} card={slots[slot]} slot={slot} active={activeSlot === slot} />
          ))}
        </div>
      </div>
    </div>
  );
}