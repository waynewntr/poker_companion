"use client";

import { SUIT_SYMBOLS, SUIT_TEXT_CLASS_MAP } from "@/domain/cards";
import { useHandStore } from "@/state/handStore";
import type { Card } from "@/domain/cards";
import type { SlotName } from "@/state/handStore";

function CardSlot({ card, slot, active }: { card: Card | null; slot: SlotName; active: boolean }) {
  const setActiveSlot = useHandStore(s => s.setActiveSlot);
  const clearSlot = useHandStore(s => s.clearSlot);

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
        "flex flex-col items-center justify-center rounded border w-11 h-14 text-sm font-bold",
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
        <span className="text-gray-600 text-lg">?</span>
      )}
    </button>
  );
}

export default function Board() {
  const slots = useHandStore(s => s.slots);
  const activeSlot = useHandStore(s => s.activeSlot);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Your Hand</p>
        <div className="flex gap-2">
          <CardSlot card={slots.hero1} slot="hero1" active={activeSlot === "hero1"} />
          <CardSlot card={slots.hero2} slot="hero2" active={activeSlot === "hero2"} />
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Board</p>
        <div className="flex gap-2">
          {(["flop1", "flop2", "flop3", "turn", "river"] as SlotName[]).map(slot => (
            <CardSlot key={slot} card={slots[slot]} slot={slot} active={activeSlot === slot} />
          ))}
        </div>
      </div>
    </div>
  );
}
