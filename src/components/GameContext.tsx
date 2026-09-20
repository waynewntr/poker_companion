"use client";

import { ARCHETYPE_KEYS, ARCHETYPE_LABELS, type ArchetypeKey } from "@/data/archetypeRanges";
import { useHandStore } from "@/state/handStore";
import PositionSelector from "./PositionSelector";

export default function GameContext() {
  const heroPosition = useHandStore(s => s.heroPosition);
  const villainPosition = useHandStore(s => s.villainPosition);
  const preflopAggressor = useHandStore(s => s.preflopAggressor);
  const villainArchetype = useHandStore(s => s.villainArchetype);

  const setHeroPosition = useHandStore(s => s.setHeroPosition);
  const setVillainPosition = useHandStore(s => s.setVillainPosition);
  const setPreflopAggressor = useHandStore(s => s.setPreflopAggressor);
  const setVillainArchetype = useHandStore(s => s.setVillainArchetype);

  return (
    <details className="rounded-lg border border-[#2A2A35] bg-[#1A1A1F] p-4">
      <summary className="cursor-pointer text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300">
        Game Context
        {(heroPosition || villainPosition || villainArchetype) && (
          <span className="ml-2 text-[10px] text-blue-400">
            {[heroPosition, villainPosition && `vs ${villainPosition}`, villainArchetype && ARCHETYPE_LABELS[villainArchetype]]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </summary>

      <div className="mt-3 space-y-3">
        <PositionSelector label="Hero" value={heroPosition} onChange={setHeroPosition} />
        <PositionSelector label="Villain" value={villainPosition} onChange={setVillainPosition} />

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[11px] uppercase tracking-widest text-gray-500">
            Aggressor
          </span>
          <div className="flex overflow-hidden rounded border border-[#2A2A35]">
            {(["hero", "villain"] as const).map(side => (
              <button
                key={side}
                onClick={() => setPreflopAggressor(preflopAggressor === side ? undefined : side)}
                className={[
                  "px-2 py-0.5 text-[11px] uppercase font-bold tracking-widest transition-colors",
                  preflopAggressor === side
                    ? "bg-[#2A2A3F] text-white"
                    : "bg-[#1A1A1F] text-gray-600 hover:text-gray-300",
                ].join(" ")}
              >
                {side}
              </button>
            ))}
          </div>
        </div>

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
      </div>
    </details>
  );
}