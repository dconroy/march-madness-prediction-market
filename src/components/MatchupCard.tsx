"use client";

import type { Matchup, Team } from "@/lib/types";

function formatProb(p?: number) {
  if (p === undefined || p === null || !Number.isFinite(p)) return null;
  return `${p.toFixed(1)}%`;
}

function formatVolume(v?: number) {
  if (v === undefined || v === null || !Number.isFinite(v)) return null;
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function TeamRow({
  team,
  prob,
  isWinner,
  hasProbs,
}: {
  team?: Team;
  prob?: number;
  isWinner: boolean;
  hasProbs: boolean;
}) {
  const probText = formatProb(prob);
  return (
    <div
      className={[
        "flex items-center justify-between gap-1 px-2.5 py-[5px] min-w-0 transition-colors",
        isWinner
          ? "bg-emerald-50 border-l-2 border-l-emerald-500"
          : "border-l-2 border-l-transparent",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[10px] font-mono text-zinc-400 w-4 text-right shrink-0">
          {team?.seed ?? "—"}
        </span>
        <span
          className={[
            "text-[11px] truncate leading-tight",
            isWinner ? "font-bold text-zinc-900" : "font-medium text-zinc-700",
            !team ? "italic text-zinc-400" : "",
          ].join(" ")}
        >
          {team?.name ?? "TBD"}
        </span>
      </div>
      <span
        className={[
          "text-[11px] font-mono tabular-nums shrink-0",
          isWinner ? "font-bold text-emerald-700" : "text-zinc-500",
        ].join(" ")}
      >
        {probText ?? (hasProbs ? "—" : "")}
      </span>
    </div>
  );
}

export default function MatchupCard({ matchup }: { matchup: Matchup }) {
  const { probA, probB, teamA, teamB, winnerId, source, volume } = matchup;
  const hasProbs = probA !== undefined || probB !== undefined;
  const isWinnerA = !!winnerId && teamA?.id === winnerId;
  const isWinnerB = !!winnerId && teamB?.id === winnerId;
  const volText = formatVolume(volume);

  return (
    <div
      className={[
        "h-full rounded-lg border overflow-hidden flex flex-col justify-center",
        hasProbs
          ? "border-zinc-200 bg-white shadow-sm"
          : "border-zinc-200/60 bg-zinc-50",
      ].join(" ")}
    >
      <TeamRow team={teamA} prob={probA} isWinner={isWinnerA} hasProbs={hasProbs} />
      <div className="border-t border-zinc-100 mx-2" />
      <TeamRow team={teamB} prob={probB} isWinner={isWinnerB} hasProbs={hasProbs} />
      {(source || volText) && (
        <div className="flex items-center justify-between px-2.5 pb-1">
          <span
            className={[
              "text-[8px] font-semibold uppercase tracking-wider",
              source === "market" ? "text-blue-500" : source === "fallback" ? "text-amber-500" : "text-zinc-400",
            ].join(" ")}
          >
            {source === "market" ? "Market" : source === "fallback" ? "Inferred" : ""}
          </span>
          {volText && <span className="text-[8px] text-zinc-400">{volText}</span>}
        </div>
      )}
    </div>
  );
}
