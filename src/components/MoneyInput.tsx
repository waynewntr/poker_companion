"use client";

import { ChangeEvent } from "react";
import { convertAmount } from "@/state/handStore";

interface MoneyInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  stacked?: boolean; // label above input instead of inline, for side-by-side layouts
  bigBlind?: number;
  amountUnit?: "R" | "BB";
}

export function formatMoney(v: number): string {
  return `R ${v.toLocaleString("en-ZA")}`;
}

export function formatMoneyWithUnit(v: number, unit: "R" | "BB"): string {
  if (unit === "BB") {
    return v.toFixed(2);
  }
  return v.toLocaleString("en-ZA");
}

export default function MoneyInput({ label, value, onChange, stacked, bigBlind = 0, amountUnit = "R" }: MoneyInputProps) {
  // For display: convert stored R value to current unit
  const displayValue = amountUnit === "BB" && bigBlind > 0
    ? convertAmount(value, "R", "BB", bigBlind)
    : value;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    const inputValue = raw === "" ? 0 : parseInt(raw, 10);
    
    // Convert from current unit to R before storing
    const storedValue = amountUnit === "BB" && bigBlind > 0
      ? convertAmount(inputValue, "BB", "R", bigBlind)
      : inputValue;
    
    onChange(storedValue);
  }

  const unitSuffix = amountUnit === "BB" ? "BB" : "R";
  const labelWithUnit = `${label} (${unitSuffix})`;

  if (stacked) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-gray-400 uppercase tracking-widest">{labelWithUnit}</span>
        <div className="flex items-center rounded border border-[#2A2A35] bg-[#1A1A1F] px-3 py-2 gap-1">
          <span className="text-gray-400 text-sm">{unitSuffix}</span>
          <input
            type="text"
            inputMode="numeric"
            value={displayValue === 0 ? "" : (amountUnit === "BB" ? displayValue.toFixed(2) : displayValue.toLocaleString("en-ZA"))}
            onChange={handleChange}
            placeholder="0"
            className="min-w-0 flex-1 bg-transparent text-white text-sm outline-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 uppercase tracking-widest w-16 shrink-0">{label}</span>
      <div className="flex items-center border border-[#2A2A35] rounded bg-[#1A1A1F] px-3 py-2 gap-1">
        <span className="text-gray-400 text-sm">{unitSuffix}</span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue === 0 ? "" : (amountUnit === "BB" ? displayValue.toFixed(2) : displayValue.toLocaleString("en-ZA"))}
          onChange={handleChange}
          placeholder="0"
          className="bg-transparent text-white text-sm outline-none w-24"
        />
      </div>
    </div>
  );
}
