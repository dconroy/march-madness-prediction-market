"use client";

import type { InferredBracket } from "@/lib/bracket";
import type { Matchup, Region as RegionType } from "@/lib/types";
import { REGION_ORDER } from "@/data/bracket2026";
import { bracketHeight, bracketWidth, CARD_H, CARD_W, elite8CenterY, columnX, regionIndex, roundCenterY } from "@/components/bracketLayout";
import BracketRound from "@/components/BracketRound";
import MatchupCard from "@/components/MatchupCard";

function elbowPath(x1: number, y1: number, x2: number, y2: number) {
  const xMid = (x1 + x2) / 2;
  return `M ${x1} ${y1} L ${xMid} ${y1} L ${xMid} ${y2} L ${x2} ${y2}`;
}

const ROUND_LABELS = [
  { col: 0, label: "R64" },
  { col: 1, label: "R32" },
  { col: 2, label: "Sweet 16" },
  { col: 3, label: "Elite 8" },
  { col: 4, label: "Final Four" },
  { col: 5, label: "Final" },
];

export default function Bracket({ inferred }: { inferred: InferredBracket }) {
  const width = bracketWidth();
  const height = bracketHeight();

  const x0 = columnX(0);
  const x1 = columnX(1);
  const x2 = columnX(2);
  const x3 = columnX(3);
  const x4 = columnX(4);
  const x5 = columnX(5);

  const matchupsByRound = {
    0: Object.fromEntries(REGION_ORDER.map((r) => [r, inferred.regions[r].rd64])) as Record<RegionType, Matchup[]>,
    1: Object.fromEntries(REGION_ORDER.map((r) => [r, inferred.regions[r].r32])) as Record<RegionType, Matchup[]>,
    2: Object.fromEntries(REGION_ORDER.map((r) => [r, inferred.regions[r].sweet16])) as Record<RegionType, Matchup[]>,
    3: Object.fromEntries(REGION_ORDER.map((r) => [r, inferred.regions[r].elite8])) as Record<RegionType, Matchup[]>,
  };

  const semi0Regions = ["East", "West"] as RegionType[];
  const semi1Regions = ["South", "Midwest"] as RegionType[];
  const semi0Y =
    (elite8CenterY(regionIndex(semi0Regions[0])) + elite8CenterY(regionIndex(semi0Regions[1]))) / 2;
  const semi1Y =
    (elite8CenterY(regionIndex(semi1Regions[0])) + elite8CenterY(regionIndex(semi1Regions[1]))) / 2;
  const champY = (semi0Y + semi1Y) / 2;

  return (
    <div className="w-full">
      <div
        className="relative"
        style={{ width, height, minWidth: width }}
      >
        {/* Column headers */}
        {ROUND_LABELS.map((h) => {
          const left = columnX(h.col) - CARD_W / 2;
          return (
            <div
              key={h.col}
              className="absolute top-0 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-400"
              style={{ left, width: CARD_W }}
            >
              {h.label}
            </div>
          );
        })}

        {/* SVG connectors */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          <g stroke="rgba(161,161,170,0.4)" strokeWidth={1} fill="none">
            {REGION_ORDER.map((region, regionIdx) => {
              const yR64 = (slotIndex: number) => roundCenterY(regionIdx, 0, slotIndex);
              const yR32 = (i: number) => roundCenterY(regionIdx, 1, i);
              const yS16 = (i: number) => roundCenterY(regionIdx, 2, i);
              const yE8 = () => roundCenterY(regionIdx, 3, 0);

              const paths: string[] = [];

              for (let i = 0; i < 4; i++) {
                paths.push(elbowPath(x0, yR64(2 * i), x1, yR32(i)));
                paths.push(elbowPath(x0, yR64(2 * i + 1), x1, yR32(i)));
              }
              for (let i = 0; i < 2; i++) {
                paths.push(elbowPath(x1, yR32(2 * i), x2, yS16(i)));
                paths.push(elbowPath(x1, yR32(2 * i + 1), x2, yS16(i)));
              }
              for (let i = 0; i < 2; i++) {
                paths.push(elbowPath(x2, yS16(i), x3, yE8()));
              }

              return (
                <g key={region}>
                  {paths.map((d, idx) => (
                    <path key={idx} d={d} />
                  ))}
                </g>
              );
            })}

            {[semi0Regions[0], semi0Regions[1]].map((r) => (
              <path key={`semi0-${r}`} d={elbowPath(x3, elite8CenterY(regionIndex(r)), x4, semi0Y)} />
            ))}
            {[semi1Regions[0], semi1Regions[1]].map((r) => (
              <path key={`semi1-${r}`} d={elbowPath(x3, elite8CenterY(regionIndex(r)), x4, semi1Y)} />
            ))}

            <path d={elbowPath(x4, semi0Y, x5, champY)} />
            <path d={elbowPath(x4, semi1Y, x5, champY)} />
          </g>
        </svg>

        {/* Cards */}
        <div className="absolute inset-0">
          <BracketRound round={0} columnIndex={0} matchupsByRegion={matchupsByRound[0]} showRegionLabels />
          <BracketRound round={1} columnIndex={1} matchupsByRegion={matchupsByRound[1]} />
          <BracketRound round={2} columnIndex={2} matchupsByRegion={matchupsByRound[2]} />
          <BracketRound round={3} columnIndex={3} matchupsByRegion={matchupsByRound[3]} />

          {inferred.finalFour.map((m, i) => {
            const centerY = i === 0 ? semi0Y : semi1Y;
            return (
              <div key={m.id} className="absolute" style={{ left: x4 - CARD_W / 2, top: centerY - CARD_H / 2, width: CARD_W, height: CARD_H }}>
                <MatchupCard matchup={m} />
              </div>
            );
          })}

          {inferred.championship[0] && (
            <div className="absolute" style={{ left: x5 - CARD_W / 2, top: champY - CARD_H / 2, width: CARD_W, height: CARD_H }}>
              <MatchupCard matchup={inferred.championship[0]} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
