"use client";

import { useMemo, useState } from "react";
import type { BracketModel, ProbMode } from "@/lib/types";
import { inferBracket } from "@/lib/bracket";
import Bracket from "@/components/Bracket";
import SummaryBar from "@/components/SummaryBar";

function ToggleRow({
  mode,
  onModeChange,
}: {
  mode: ProbMode;
  onModeChange: (m: ProbMode) => void;
}) {
  return (
    <div className="w-full rounded-2xl border border-zinc-200/70 bg-white/70 backdrop-blur-sm px-4 py-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Probability source</div>
          <div className="text-xs text-zinc-600">Deterministic bracket auto-advance using the selected heuristic.</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onModeChange("game")}
            className={[
              "px-3 py-2 rounded-xl border text-sm transition-colors",
              mode === "game" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white/60 border-zinc-200 text-zinc-800 hover:bg-white",
            ].join(" ")}
          >
            Use game-by-game market probabilities
          </button>
          <button
            type="button"
            onClick={() => onModeChange("fallback")}
            className={[
              "px-3 py-2 rounded-xl border text-sm transition-colors",
              mode === "fallback" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white/60 border-zinc-200 text-zinc-800 hover:bg-white",
            ].join(" ")}
          >
            Use title odds only as fallback
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BracketClient({ model }: { model: BracketModel }) {
  const [mode, setMode] = useState<ProbMode>("fallback");

  const inferred = useMemo(() => inferBracket(model, mode), [model, mode]);

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(250,250,250,0.95),transparent_50%),radial-gradient(1000px_500px_at_90%_0%,rgba(244,244,245,0.8),transparent_50%),#f8fafc] px-3 py-5">
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">March Madness 2026 Market Bracket</h1>
            <p className="mt-1 text-sm text-zinc-600">NCAA men&rsquo;s bracket inference from Polymarket prediction market probabilities.</p>
          </div>
        </div>

        <SummaryBar titleOdds={model.titleOdds} lastUpdated={model.rd64.lastUpdated} />
        <ToggleRow mode={mode} onModeChange={setMode} />

        <div className="rounded-2xl border border-zinc-200/70 bg-white/60 backdrop-blur-sm p-3 overflow-x-auto">
          <Bracket inferred={inferred} />
        </div>

        <div className="text-xs text-zinc-500">
          Auto-advance picks the higher implied win probability each game. Market-derived probabilities are labeled in each matchup card; inferred probabilities use title-odds fallback.
        </div>
      </div>
    </div>
  );
}

