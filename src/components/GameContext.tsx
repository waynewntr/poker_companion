"use client";

import { ARCHETYPE_KEYS, ARCHETYPE_LABELS, type ArchetypeKey } from "@/data/archetypeRanges";
import { useHandStore, type PreflopAction } from "@/state/handStore";
import PositionSelector from "./PositionSelector";

const PREFLOP_ACTIONS = [
  "OPEN_RAISE",
  "LIMP",
  "CALL_OPEN",
  "THREE_BET",
  "FOUR_BET",
  "ISO_RAISE",
  "SQUEEZE",
  "FOLD",
] as const;

const ACTION_LABELS: Record<typeof PREFLOP_ACTIONS[number], string> = {
  "OPEN_RAISE": "Open Raise",
  "LIMP": "Limp",
  "CALL_OPEN": "Call Open",
  "THREE_BET": "3-Bet",
  "FOUR_BET": "4-Bet",
  "ISO_RAISE": "ISO Raise",
  "SQUEEZE": "Squeeze",
  "FOLD": "Fold",
};

const ACTIONS_WITH_SIZING = new Set(["OPEN_RAISE", "THREE_BET", "FOUR_BET", "ISO_RAISE", "SQUEEZE"]);

export default function GameContext() {
  const heroPosition = useHandStore(s => s.heroPosition);
  const villainPosition = useHandStore(s => s.villainPosition);
  const villainArchetype = useHandStore(s => s.villainArchetype);
  const preflopAction = useHandStore(s => s.preflopAction);
  const preflopActionSize = useHandStore(s => s.preflopActionSize);

  const setHeroPosition = useHandStore(s => s.setHeroPosition);
  const setVillainPosition = useHandStore(s => s.setVillainPosition);
  const setVillainArchetype = useHandStore(s => s.setVillainArchetype);
  const setPreflopAction = useHandStore(s => s.setPreflopAction);
  const setPreflopActionSize = useHandStore(s => s.setPreflopActionSize);

  const summaryParts = [
    heroPosition,
    villainPosition && `vs ${villainPosition}`,
    villainArchetype && ARCHETYPE_LABELS[villainArchetype],
    preflopAction && `${ACTION_LABELS[preflopAction]}${preflopActionSize ? ` ${preflopActionSize}` : ""}`,
  ].filter(Boolean);

  return (
    <details className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
      <summary className="cursor-pointer text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300">
        Game Context
        {summaryParts.length > 0 && (
          <span className="ml-2 text-[10px] text-blue-400">
            {summaryParts.join(" · ")}
          </span>
        )}
      </summary>

      <div className="mt-3 space-y-3">
        <PositionSelector label="Hero" value={heroPosition} onChange={setHeroPosition} />
        <PositionSelector label="Villain" value={villainPosition} onChange={setVillainPosition} />

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[11px] uppercase tracking-widest text-gray-500">
            Style
          </span>
          <select
            value={villainArchetype ?? ""}
            onChange={e => setVillainArchetype((e.target.value as ArchetypeKey) || undefined)}
            className="flex-1 rounded border border-[#2A2A35] bg-[#0D0D0F] px-2 py-1 text-xs text-gray-200 focus:outline-none"
          >
            <option value="">— select style —</option>
            {ARCHETYPE_KEYS.map(key => (
              <option key={key} value={key}>
                {ARCHETYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <span className="block text-[11px] uppercase tracking-widest text-gray-500 mb-1">
              Villain&apos;s Action
            </span>
            <select
              value={preflopAction ?? ""}
              onChange={e => setPreflopAction((e.target.value as PreflopAction) || undefined)}
              className="w-full rounded border border-[#2A2A35] bg-[#0D0D0F] px-2 py-1 text-xs text-gray-200 focus:outline-none"
            >
              <option value="">— select action —</option>
              {PREFLOP_ACTIONS.map(action => (
                <option key={action} value={action}>
                  {ACTION_LABELS[action]}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-1">
              {preflopAction ? ACTION_LABELS[preflopAction] : "no action selected"}
            </p>
          </div>

          {ACTIONS_WITH_SIZING.has(preflopAction || "") && (
            <div className="flex-1 relative">
              <span className="block text-[11px] uppercase tracking-widest text-gray-500 mb-1">
                Size
              </span>
              <input
                type="text"
                value={preflopActionSize ?? ""}
                onChange={e => setPreflopActionSize(e.target.value || null)}
                placeholder="e.g., 3.5x BB"
                className="w-full rounded border border-[#2A2A35] bg-[#0D0D0F] px-2 py-1 text-xs text-gray-200 focus:outline-none"
              />
              {preflopActionSize && (
                <button
                  onClick={() => setPreflopActionSize(null)}
                  title="Clear sizing"
                  className="absolute right-2 top-[22px] text-gray-500 hover:text-gray-200 text-sm leading-none"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}