"use client";

import { ChangeEvent } from "react";

interface MoneyInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

export function formatMoney(v: number): string {
  return `R ${v.toLocaleString("en-ZA")}`;
}

export default function MoneyInput({ label, value, onChange }: MoneyInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw === "" ? 0 : parseInt(raw, 10));
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 uppercase tracking-widest w-16 shrink-0">{label}</span>
      <div className="flex items-center border border-[#2A2A35] rounded bg-[#1A1A1F] px-3 py-2 gap-1">
        <span className="text-gray-400 text-sm">R</span>
        <input
          type="text"
          inputMode="numeric"
          value={value === 0 ? "" : value.toLocaleString("en-ZA")}
          onChange={handleChange}
          placeholder="0"
          className="bg-transparent text-white text-sm outline-none w-24"
        />
      </div>
    </div>
  );
}
