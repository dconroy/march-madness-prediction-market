"use client";

import { useMemo, useState } from "react";
import type { BracketModel, ProbMode } from "@/lib/types";
import { inferBracket } from "@/lib/bracket";
import Bracket from "@/components/Bracket";
import SummaryBar from "@/components/SummaryBar";
import WinnersSummary from "@/components/WinnersSummary";

const MODE_OPTIONS: { value: ProbMode; label: string; desc: string }[] = [
  {
    value: "fallback",
    label: "Full bracket (title odds)",
    desc: "Fills every round using title-odds head-to-head when game markets aren\u2019t available.",
  },
  {
    value: "game",
    label: "Game markets only",
    desc: "Only shows rounds where Polymarket has a direct game market. Later rounds may be empty.",
  },
];

export default function BracketClient({ model }: { model: BracketModel }) {
  const [mode, setMode] = useState<ProbMode>("fallback");

  const inferred = useMemo(() => inferBracket(model, mode), [model, mode]);

  const activeOption = MODE_OPTIONS.find((o) => o.value === mode)!;

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5">
      <div className="mx-auto w-full max-w-[1340px] flex flex-col gap-3">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
            March Madness 2026
            <span className="ml-2 text-base font-semibold text-zinc-500">Market Bracket</span>
          </h1>
          <p className="text-xs text-zinc-500">
            Deterministic bracket auto-advanced using Polymarket prediction market probabilities.
          </p>
        </div>

        <SummaryBar titleOdds={model.titleOdds} lastUpdated={model.rd64.lastUpdated} />

        {/* Mode toggle */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
          <div className="flex gap-1.5">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value)}
                className={[
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  mode === opt.value
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500 max-w-md">{activeOption.desc}</p>
        </div>

        {/* Winners summary */}
        <WinnersSummary inferred={inferred} />

        {/* Bracket */}
        <div className="rounded-xl border border-zinc-200 bg-white p-2 overflow-x-auto">
          <Bracket inferred={inferred} />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[10px] text-zinc-500 px-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" /> Winner
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-blue-400 rounded" /> East
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-orange-400 rounded" /> South
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-purple-400 rounded" /> West
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-rose-400 rounded" /> Midwest
          </span>
          <span className="flex items-center gap-1">
            <span className="text-blue-500 font-semibold">M</span> Market
          </span>
          <span className="flex items-center gap-1">
            <span className="text-amber-500 font-semibold">I</span> Inferred
          </span>
        </div>
      </div>
    </div>
  );
}
