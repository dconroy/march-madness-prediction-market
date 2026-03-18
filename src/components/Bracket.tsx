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
        style={{
          width,
          height,
          minWidth: width,
        }}
      >
        {/* Column headers */}
        {[
          { col: 0, label: "Round of 64" },
          { col: 1, label: "Round of 32" },
          { col: 2, label: "Sweet 16" },
          { col: 3, label: "Elite 8" },
          { col: 4, label: "Final Four" },
          { col: 5, label: "Championship" },
        ].map((h) => {
          const left = columnX(h.col) - CARD_W / 2;
          return (
            <div
              key={h.col}
              className="absolute top-0 text-center text-[13px] font-semibold text-zinc-700"
              style={{ left, width: CARD_W }}
            >
              {h.label}
            </div>
          );
        })}

        <svg
          className="absolute inset-0 pointer-events-none"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          <g stroke="rgba(113, 113, 122, 0.75)" strokeWidth={1.2} fill="none">
            {/* Region connectors: R64 -> R32 -> Sweet16 -> Elite8 */}
            {REGION_ORDER.map((region, regionIdx) => {
              const yR64 = (slotIndex: number) => roundCenterY(regionIdx, 0, slotIndex);
              const yR32 = (i: number) => roundCenterY(regionIdx, 1, i);
              const yS16 = (i: number) => roundCenterY(regionIdx, 2, i);
              const yE8 = () => roundCenterY(regionIdx, 3, 0);

              const paths: string[] = [];

              // R64 -> R32
              for (let i = 0; i < 4; i++) {
                const yLeft = yR64(2 * i);
                const yRight = yR64(2 * i + 1);
                const yNext = yR32(i);
                paths.push(elbowPath(x0, yLeft, x1, yNext));
                paths.push(elbowPath(x0, yRight, x1, yNext));
              }

              // R32 -> Sweet16
              for (let i = 0; i < 2; i++) {
                const yLeft = yR32(2 * i);
                const yRight = yR32(2 * i + 1);
                const yNext = yS16(i);
                paths.push(elbowPath(x1, yLeft, x2, yNext));
                paths.push(elbowPath(x1, yRight, x2, yNext));
              }

              // Sweet16 -> Elite8
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

            {/* Elite8 -> Final Four */}
            {
              // Semi 0: East & West
              [semi0Regions[0], semi0Regions[1]].map((r) => {
                const y = elite8CenterY(regionIndex(r));
                return <path key={`semi0-${r}`} d={elbowPath(x3, y, x4, semi0Y)} />;
              })
            }
            {
              // Semi 1: South & Midwest
              [semi1Regions[0], semi1Regions[1]].map((r) => {
                const y = elite8CenterY(regionIndex(r));
                return <path key={`semi1-${r}`} d={elbowPath(x3, y, x4, semi1Y)} />;
              })
            }

            {/* Final Four -> Championship */}
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

          {/* Semifinals */}
          {inferred.finalFour.map((m, i) => {
            const centerY = i === 0 ? semi0Y : semi1Y;
            const left = x4 - CARD_W / 2;
            const top = centerY - CARD_H / 2;
            return (
              <div key={m.id} className="absolute" style={{ left, top, width: CARD_W, height: CARD_H }}>
                <MatchupCard matchup={m} />
              </div>
            );
          })}

          {/* Championship */}
          {inferred.championship[0] ? (
            <div className="absolute" style={{ left: x5 - CARD_W / 2, top: champY - CARD_H / 2, width: CARD_W, height: CARD_H }}>
              <MatchupCard matchup={inferred.championship[0]} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

