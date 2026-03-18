"use client";

import type { Matchup, Region } from "@/lib/types";
import { regionIndex, roundCenterY, CARD_H, CARD_W, columnX, regionTopPx } from "@/components/bracketLayout";
import MatchupCard from "@/components/MatchupCard";

export default function BracketRound({
  round,
  columnIndex,
  matchupsByRegion,
  showRegionLabels,
}: {
  round: 0 | 1 | 2 | 3;
  columnIndex: number;
  matchupsByRegion: Record<Region, Matchup[]>;
  showRegionLabels?: boolean;
}) {
  const xCenter = columnX(columnIndex);

  return (
    <>
      {showRegionLabels &&
        Object.keys(matchupsByRegion).map((r) => {
          const region = r as Region;
          const idx = regionIndex(region);
          if (idx < 0) return null;
          return (
            <div
              key={region}
              className="absolute text-[11px] font-bold uppercase tracking-wider text-zinc-500"
              style={{
                left: xCenter - CARD_W / 2,
                top: regionTopPx(idx) - 18,
                width: CARD_W,
              }}
            >
              {region}
            </div>
          );
        })}

      {(
        Object.entries(matchupsByRegion) as Array<[Region, Matchup[]]>
      ).map(([region, matchups]) => {
        const idx = regionIndex(region);
        if (idx < 0) return null;
        return matchups.map((m, i) => {
          const centerY = roundCenterY(idx, round, i);
          const top = centerY - CARD_H / 2;
          return (
            <div
              key={m.id}
              className="absolute"
              style={{
                left: xCenter - CARD_W / 2,
                top,
                width: CARD_W,
                height: CARD_H,
              }}
            >
              <MatchupCard matchup={m} />
            </div>
          );
        });
      })}
    </>
  );
}
