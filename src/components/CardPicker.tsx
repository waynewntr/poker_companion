"use client";

import { SUITS, RANKS, SUIT_SYMBOLS, SUIT_TEXT_CLASS_MAP, cardKey } from "@/domain/cards";
import { useHandStore, getAllUsedCards } from "@/state/handStore";

const RANKS_DISPLAY = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;

export default function CardPicker() {
  const slots = useHandStore(s => s.slots);
  const activeSlot = useHandStore(s => s.activeSlot);
  const selectCard = useHandStore(s => s.selectCard);

  const usedKeys = new Set(getAllUsedCards(slots).map(cardKey));

  return (
    <div className="w-full">
      {activeSlot && (
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-widest">
          Selecting: {activeSlot.replace(/(\d)/, " $1").toUpperCase()}
        </p>
      )}
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
        {SUITS.map(suit =>
          RANKS_DISPLAY.map(rank => {
            const card = { rank, suit };
            const key = cardKey(card);
            const used = usedKeys.has(key);
            return (
              <button
                key={key}
                disabled={used || !activeSlot}
                onClick={() => selectCard(card)}
                className={[
                  "flex flex-col items-center justify-center rounded",
                  "h-11 text-xs font-bold border",
                  "transition-opacity",
                  used
                    ? "opacity-20 cursor-not-allowed border-transparent"
                    : activeSlot
                    ? "border-[#2A2A35] bg-[#1A1A1F] hover:bg-[#2A2A3F] cursor-pointer"
                    : "opacity-40 cursor-not-allowed border-transparent bg-[#1A1A1F]",
                  SUIT_TEXT_CLASS_MAP[suit],
                ].join(" ")}
              >
                <span>{rank}</span>
                <span>{SUIT_SYMBOLS[suit]}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
