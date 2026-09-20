"use client";

import type { Position } from "@/domain/hand";

const POSITIONS: Position[] = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

interface Props {
  label: string;
  value: Position | undefined;
  onChange: (p: Position) => void;
}

export default function PositionSelector({ label, value, onChange }: Props) {
  function cycle(direction: 1 | -1) {
    const current = value ? POSITIONS.indexOf(value) : -1;
    const next = (current + direction + POSITIONS.length) % POSITIONS.length;
    onChange(POSITIONS[next]);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[11px] uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <button
        onClick={() => cycle(-1)}
        className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-200"
        aria-label={`Previous ${label} position`}
      >
        ‹
      </button>
      <div className="flex gap-1">
        {POSITIONS.map(pos => (
          <button
            key={pos}
            onClick={() => onChange(pos)}
            className={[
              "rounded px-1.5 py-0.5 text-[11px] font-bold uppercase transition-colors",
              value === pos
                ? "bg-blue-600 text-white"
                : "border border-[#2A2A35] bg-[#1A1A1F] text-gray-500 hover:text-gray-300",
            ].join(" ")}
          >
            {pos}
          </button>
        ))}
      </div>
      <button
        onClick={() => cycle(1)}
        className="rounded border border-[#2A2A35] bg-[#1A1A1F] px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-200"
        aria-label={`Next ${label} position`}
      >
        ›
      </button>
    </div>
  );
}