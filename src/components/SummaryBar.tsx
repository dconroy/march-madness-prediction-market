"use client";

import type { TitleOdds } from "@/lib/types";

export default function SummaryBar({ titleOdds, lastUpdated }: { titleOdds: TitleOdds[]; lastUpdated: string }) {
  const sorted = [...titleOdds].sort((a, b) => b.probability - a.probability);
  const top4 = sorted.slice(0, 4);

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Top contenders */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {top4.map((o, i) => (
            <div key={o.teamId} className="flex items-baseline gap-1">
              <span className={[
                "text-sm font-bold tabular-nums",
                i === 0 ? "text-zinc-900" : "text-zinc-700",
              ].join(" ")}>
                {o.teamName}
              </span>
              <span className="text-xs text-zinc-500 font-mono tabular-nums">
                {o.probability.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        {/* Timestamp */}
        <div className="text-[11px] text-zinc-400 whitespace-nowrap">
          Updated {new Date(lastUpdated).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
          {new Date(lastUpdated).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
