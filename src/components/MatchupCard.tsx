"use client";

import type { Matchup, Region, Team } from "@/lib/types";

const REGION_COLORS: Record<Region, { bg: string; border: string; text: string }> = {
  East: { bg: "bg-blue-50", border: "border-l-blue-400", text: "text-blue-600" },
  South: { bg: "bg-orange-50", border: "border-l-orange-400", text: "text-orange-600" },
  West: { bg: "bg-purple-50", border: "border-l-purple-400", text: "text-purple-600" },
  Midwest: { bg: "bg-rose-50", border: "border-l-rose-400", text: "text-rose-600" },
};

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

function isHigherSeedFavorite(matchup: Matchup) {
  const { teamA, teamB, probA, probB } = matchup;
  if (!teamA || !teamB) return false;
  if (typeof probA !== "number" || typeof probB !== "number") return false;
  if (!Number.isFinite(probA) || !Number.isFinite(probB) || probA === probB) return false;

  const favorite = probA > probB ? teamA : teamB;
  const underdogBySeed = favorite.id === teamA.id ? teamB : teamA;
  // Higher numeric seed means lower-ranked team (e.g. 10 over 7).
  return favorite.seed > underdogBySeed.seed;
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
        "flex items-center justify-between gap-1 px-2 py-[4px] min-w-0",
        isWinner ? "bg-emerald-50/80" : "",
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

export default function MatchupCard({ matchup, showRegion }: { matchup: Matchup; showRegion?: boolean }) {
  const { probA, probB, teamA, teamB, winnerId, source, volume, region } = matchup;
  const hasProbs = probA !== undefined || probB !== undefined;
  const higherSeedFavored = isHigherSeedFavorite(matchup);
  const isWinnerA = !!winnerId && teamA?.id === winnerId;
  const isWinnerB = !!winnerId && teamB?.id === winnerId;
  const volText = formatVolume(volume);
  const regionColor = region ? REGION_COLORS[region] : null;

  return (
    <div
      className={[
        "h-full rounded-lg overflow-hidden flex flex-col justify-center border-l-[3px]",
        hasProbs ? "bg-white shadow-sm border border-zinc-200" : "bg-zinc-50 border border-zinc-200/60",
        higherSeedFavored ? "ring-1 ring-amber-300 bg-amber-50/30" : "",
        regionColor ? regionColor.border : "border-l-zinc-300",
      ].join(" ")}
    >
      {showRegion && region && regionColor && (
        <div className={["px-2 pt-1 text-[8px] font-bold uppercase tracking-wider flex items-center justify-between", regionColor.text].join(" ")}>
          {region}
          {higherSeedFavored && <span className="text-[8px] text-amber-600">Upset lean</span>}
        </div>
      )}
      {!showRegion && higherSeedFavored && (
        <div className="px-2 pt-1 text-[8px] font-bold uppercase tracking-wider text-amber-600">
          Upset lean
        </div>
      )}
      <TeamRow team={teamA} prob={probA} isWinner={isWinnerA} hasProbs={hasProbs} />
      <div className="border-t border-zinc-100 mx-1.5" />
      <TeamRow team={teamB} prob={probB} isWinner={isWinnerB} hasProbs={hasProbs} />
      {(source || volText) && (
        <div className="flex items-center justify-between px-2 pb-0.5">
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
