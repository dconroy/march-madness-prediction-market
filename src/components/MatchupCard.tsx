"use client";

import type { Matchup, Team } from "@/lib/types";

function formatProb(p?: number) {
  if (p === undefined || p === null || !Number.isFinite(p)) return undefined;
  return `${p.toFixed(1)}%`;
}

function formatVolume(v?: number) {
  if (v === undefined || v === null || !Number.isFinite(v)) return undefined;
  // volume in USD terms in the Polymarket markets feed (usually a big number).
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  return `$${v.toFixed(0)}`;
}

function FavoriteDot({ isFav }: { isFav: boolean }) {
  return (
    <span
      className={[
        "inline-block h-2 w-2 rounded-full",
        isFav ? "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.15)]" : "bg-zinc-500/40",
      ].join(" ")}
    />
  );
}

export default function MatchupCard({ matchup }: { matchup: Matchup }) {
  const probA = matchup.probA;
  const probB = matchup.probB;
  const favA = probA !== undefined && probB !== undefined ? probA >= probB : false;

  const teamA: Team | undefined = matchup.teamA;
  const teamB: Team | undefined = matchup.teamB;

  const volumeText = formatVolume(matchup.volume);
  const sourceLabel = matchup.source === "market" ? "Market" : matchup.source === "fallback" ? "Inferred" : undefined;

  const hasAnyProb = probA !== undefined || probB !== undefined;

  return (
    <div
      className={[
        "group h-full overflow-hidden rounded-xl border bg-white/60 backdrop-blur-sm",
        hasAnyProb ? "border-zinc-200/70 hover:border-zinc-300" : "border-zinc-200/50 opacity-90",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {sourceLabel ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-100/80 px-2 py-0.5 rounded-full">
              {sourceLabel}
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-100/60 px-2 py-0.5 rounded-full">
              Unavailable
            </span>
          )}
        </div>
        {volumeText ? <span className="text-[11px] text-zinc-500">Vol {volumeText}</span> : <span className="text-[11px] text-zinc-500"> </span>}
      </div>

      <div className="px-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FavoriteDot isFav={favA} />
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{teamA ? teamA.name : "TBD"}</div>
              <div className="text-[11px] text-zinc-600">Seed {teamA?.seed ?? "—"}</div>
            </div>
          </div>
          <div className="text-xs font-semibold text-zinc-900">
            {probA !== undefined ? formatProb(probA) : hasAnyProb ? "—" : "—"}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FavoriteDot isFav={!favA} />
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{teamB ? teamB.name : "TBD"}</div>
              <div className="text-[11px] text-zinc-600">Seed {teamB?.seed ?? "—"}</div>
            </div>
          </div>
          <div className="text-xs font-semibold text-zinc-900">
            {probB !== undefined ? formatProb(probB) : hasAnyProb ? "—" : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

