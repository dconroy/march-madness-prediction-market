"use client";

import type { InferredBracket } from "@/lib/bracket";
import type { Matchup, Region, Team } from "@/lib/types";
import { REGION_ORDER } from "@/data/bracket2026";

const REGION_COLOR: Record<Region, string> = {
  East: "text-blue-600",
  South: "text-orange-600",
  West: "text-purple-600",
  Midwest: "text-rose-600",
};

const REGION_BG: Record<Region, string> = {
  East: "bg-blue-50",
  South: "bg-orange-50",
  West: "bg-purple-50",
  Midwest: "bg-rose-50",
};

function getWinner(m?: Matchup): Team | undefined {
  if (!m?.winnerId) return undefined;
  return m.teamA?.id === m.winnerId ? m.teamA : m.teamB?.id === m.winnerId ? m.teamB : undefined;
}

function WinnerPill({ team, prob }: { team: Team; prob?: number }) {
  const regionColor = team.region ? REGION_COLOR[team.region] : "text-zinc-600";
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[10px] font-mono text-zinc-400">{team.seed}</span>
      <span className="text-xs font-semibold text-zinc-800">{team.name}</span>
      {prob !== undefined && (
        <span className="text-[10px] font-mono text-zinc-500">{prob.toFixed(0)}%</span>
      )}
      {team.region && (
        <span className={["text-[9px] font-bold uppercase", regionColor].join(" ")}>{team.region.slice(0, 1)}</span>
      )}
    </span>
  );
}

type RoundSummary = {
  label: string;
  winners: Array<{ team: Team; prob?: number }>;
};

export default function WinnersSummary({ inferred }: { inferred: InferredBracket }) {
  const rounds: RoundSummary[] = [];

  // R64 winners
  const rd64Winners: Array<{ team: Team; prob?: number }> = [];
  for (const region of REGION_ORDER) {
    for (const m of inferred.regions[region].rd64) {
      const w = getWinner(m);
      if (w) rd64Winners.push({ team: w, prob: m.teamA?.id === m.winnerId ? m.probA : m.probB });
    }
  }
  rounds.push({ label: "Round of 64", winners: rd64Winners });

  // R32 winners
  const r32Winners: Array<{ team: Team; prob?: number }> = [];
  for (const region of REGION_ORDER) {
    for (const m of inferred.regions[region].r32) {
      const w = getWinner(m);
      if (w) r32Winners.push({ team: w, prob: m.teamA?.id === m.winnerId ? m.probA : m.probB });
    }
  }
  rounds.push({ label: "Round of 32", winners: r32Winners });

  // Sweet 16 winners
  const s16Winners: Array<{ team: Team; prob?: number }> = [];
  for (const region of REGION_ORDER) {
    for (const m of inferred.regions[region].sweet16) {
      const w = getWinner(m);
      if (w) s16Winners.push({ team: w, prob: m.teamA?.id === m.winnerId ? m.probA : m.probB });
    }
  }
  rounds.push({ label: "Sweet 16", winners: s16Winners });

  // Elite 8 (region winners)
  const e8Winners: Array<{ team: Team; prob?: number }> = [];
  for (const region of REGION_ORDER) {
    for (const m of inferred.regions[region].elite8) {
      const w = getWinner(m);
      if (w) e8Winners.push({ team: w, prob: m.teamA?.id === m.winnerId ? m.probA : m.probB });
    }
  }
  rounds.push({ label: "Elite 8", winners: e8Winners });

  // Final Four
  const f4Winners: Array<{ team: Team; prob?: number }> = [];
  for (const m of inferred.finalFour) {
    const w = getWinner(m);
    if (w) f4Winners.push({ team: w, prob: m.teamA?.id === m.winnerId ? m.probA : m.probB });
  }
  rounds.push({ label: "Final Four", winners: f4Winners });

  // Championship
  const champWinners: Array<{ team: Team; prob?: number }> = [];
  for (const m of inferred.championship) {
    const w = getWinner(m);
    if (w) champWinners.push({ team: w, prob: m.teamA?.id === m.winnerId ? m.probA : m.probB });
  }
  rounds.push({ label: "Champion", winners: champWinners });

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Expected Winners by Round</h2>
      </div>
      <div className="divide-y divide-zinc-100">
        {rounds.map((round) => (
          <div key={round.label} className="px-3 py-2">
            <div className="flex items-start gap-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider w-20 shrink-0 pt-0.5">
                {round.label}
              </span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {round.winners.length > 0 ? (
                  round.winners.map((w, i) => (
                    <span
                      key={`${w.team.id}-${i}`}
                      className={[
                        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
                        w.team.region ? REGION_BG[w.team.region] : "bg-zinc-50",
                      ].join(" ")}
                    >
                      <WinnerPill team={w.team} prob={w.prob} />
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-400 italic">No data</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
