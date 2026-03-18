"use client";

import type { TitleOdds } from "@/lib/types";

function formatProb(p: number) {
  return `${p.toFixed(1)}%`;
}

function formatTeamName(s: string) {
  return s;
}

export default function SummaryBar({ titleOdds, lastUpdated }: { titleOdds: TitleOdds[]; lastUpdated: string }) {
  const sorted = [...titleOdds].sort((a, b) => b.probability - a.probability);
  const favorite = sorted[0];
  const top4 = sorted.slice(0, 4);

  return (
    <div className="w-full rounded-2xl border border-zinc-200/70 bg-white/70 backdrop-blur-sm shadow-sm px-4 py-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">National Title Favorite</div>
          {favorite ? (
            <div className="mt-1 text-lg font-bold text-zinc-900">
              {formatTeamName(favorite.teamName)} <span className="text-zinc-600">({formatProb(favorite.probability)})</span>
            </div>
          ) : (
            <div className="mt-1 text-lg font-bold text-zinc-900">Unavailable</div>
          )}
        </div>

        <div className="flex items-start gap-6">
          <div>
            <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Top 4 Contenders</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
              {top4.map((o) => (
                <div key={o.teamId} className="text-sm">
                  <span className="font-semibold text-zinc-900">{o.teamName}</span>{" "}
                  <span className="text-zinc-600">({formatProb(o.probability)})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Last Updated</div>
            <div className="mt-1 text-sm font-medium text-zinc-800">{new Date(lastUpdated).toLocaleString()}</div>
            <div className="mt-1 text-xs font-semibold text-zinc-500">Prediction market data</div>
          </div>
        </div>
      </div>
    </div>
  );
}

