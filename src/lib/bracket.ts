import type { BracketModel, Matchup, ProbMode, Region, TitleOdds, Team } from "@/lib/types";
import { FINAL_FOUR_SEMIFINAL_REGIONS, REGION_ORDER } from "@/data/bracket2026";

function normalizeTeamName(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TEAM_ALIASES: Record<string, string[]> = {
  connecticut: ["uconn"],
  uconn: ["connecticut"],
};

function expandAbbreviations(s: string) {
  return s
    .replace(/\bst\b/g, "state")
    .replace(/\bsaint\b/g, "st");
}


function pickWinnerId(teamA: Team, probA: number, teamB: Team, probB: number) {
  if (probA > probB) return teamA.id;
  if (probB > probA) return teamB.id;
  // Tie-break: prefer lower seed (better bracket position), then deterministic name sort.
  if (teamA.seed !== teamB.seed) return teamA.seed < teamB.seed ? teamA.id : teamB.id;
  return teamA.name.localeCompare(teamB.name) <= 0 ? teamA.id : teamB.id;
}

function pickDeterministicWinnerId(teamA: Team, teamB: Team) {
  if (teamA.seed !== teamB.seed) return teamA.seed < teamB.seed ? teamA.id : teamB.id;
  return teamA.name.localeCompare(teamB.name) <= 0 ? teamA.id : teamB.id;
}

function matchScore(bracketName: string, titleName: string): number {
  if (bracketName === titleName) return 1000;

  const bExp = expandAbbreviations(bracketName);
  const tExp = expandAbbreviations(titleName);
  if (bExp === tExp) return 900;

  const aliasesB = TEAM_ALIASES[bracketName] ?? [];
  for (const alias of aliasesB) {
    if (alias === titleName) return 800;
  }
  const aliasesT = TEAM_ALIASES[titleName] ?? [];
  for (const alias of aliasesT) {
    if (alias === bracketName) return 800;
  }

  // Strip parenthetical qualifiers and check
  const bNoParen = bracketName.replace(/\s+\w{2,3}$/g, "").trim();
  const tNoParen = titleName.replace(/\s+\w{2,3}$/g, "").trim();
  if (bNoParen === tNoParen && bNoParen.length >= 4) return 700;

  const lenDiff = Math.abs(bracketName.length - titleName.length);

  if (bExp.includes(tExp) || tExp.includes(bExp)) return 500 - lenDiff;
  if (bExp.includes(expandAbbreviations(tNoParen)) || expandAbbreviations(tNoParen).includes(bExp)) return 400 - lenDiff;

  return 0;
}

function findTitleOddsForTeam(titleOdds: TitleOdds[], teamName: string): TitleOdds | undefined {
  const normTeam = normalizeTeamName(teamName);
  const candidates = titleOdds
    .map((o) => {
      const normTitle = normalizeTeamName(o.teamName);
      const score = matchScore(normTeam, normTitle);
      return { odds: o, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.odds;
}

function inferFallbackHeadToHead(titleOdds: TitleOdds[], teamA: Team, teamB: Team) {
  const oddsA = findTitleOddsForTeam(titleOdds, teamA.name);
  const oddsB = findTitleOddsForTeam(titleOdds, teamB.name);
  if (!oddsA || !oddsB) {
    // Always produce a deterministic fallback so locked brackets never show TBD.
    // Better seed gets higher win probability; clamp to avoid unrealistic certainty.
    const seedDelta = teamB.seed - teamA.seed;
    const probA = Math.max(10, Math.min(90, 50 + seedDelta * 4));
    const probB = 100 - probA;
    return { probA, probB, volume: undefined };
  }
  const pA = oddsA.probability;
  const pB = oddsB.probability;
  if (!Number.isFinite(pA) || !Number.isFinite(pB) || pA <= 0 || pB <= 0) return undefined;
  const probA = (pA / (pA + pB)) * 100;
  const probB = 100 - probA;
  return {
    probA,
    probB,
    volume: oddsA.volume && oddsB.volume ? Math.max(oddsA.volume, oddsB.volume) : oddsA.volume ?? oddsB.volume,
  };
}

function makeMatchupId(region: Region, round: number, index: number) {
  return `m-${region}-r${round}-i${index}`;
}

function makeNonRegionMatchupId(round: number, index: number) {
  return `m-r${round}-i${index}`;
}

export type InferredBracket = {
  regions: Record<
    Region,
    {
      rd64: Matchup[];
      r32: Matchup[];
      sweet16: Matchup[];
      elite8: Matchup[];
      regionWinner?: Team;
    }
  >;
  finalFour: Matchup[];
  championship: Matchup[];
};

export function inferBracket(model: BracketModel, probMode: ProbMode): InferredBracket {
  const allowFallback = probMode === "fallback";
  const { regions } = model.rd64;

  // Compute each region deterministically from R64 upward.
  const inferredRegions = REGION_ORDER.reduce((acc, region) => {
    const rd64Slots = regions[region]?.matchups ?? [];
    const rd64: Matchup[] = rd64Slots
      .slice()
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .map((slot) => {
        const matchupId = makeMatchupId(region, 0, slot.slotIndex);
        const gameMarket = model.gameMarketsByMatchupId?.[matchupId];
        if (gameMarket) {
          const winnerId = gameMarket.probA >= gameMarket.probB ? slot.teamA.id : slot.teamB.id;
          return {
            id: matchupId,
            round: 0,
            region,
            teamA: slot.teamA,
            teamB: slot.teamB,
            probA: gameMarket.probA,
            probB: gameMarket.probB,
            winnerId,
            source: "market",
            marketName: gameMarket.marketName,
            volume: gameMarket.volume,
          };
        }

        if (!allowFallback) {
          return {
            id: matchupId,
            round: 0,
            region,
            teamA: slot.teamA,
            teamB: slot.teamB,
            winnerId: pickDeterministicWinnerId(slot.teamA, slot.teamB),
          };
        }
        const fallback = inferFallbackHeadToHead(model.titleOdds, slot.teamA, slot.teamB);
        if (!fallback) return { id: matchupId, round: 0, region, teamA: slot.teamA, teamB: slot.teamB };
        const winnerId = pickWinnerId(slot.teamA, fallback.probA, slot.teamB, fallback.probB);
        return {
          id: matchupId,
          round: 0,
          region,
          teamA: slot.teamA,
          teamB: slot.teamB,
          probA: fallback.probA,
          probB: fallback.probB,
          winnerId,
          source: "fallback",
          volume: fallback.volume,
        };
      });

    const getWinnerTeam = (matchup?: Matchup): Team | undefined => {
      if (!matchup?.winnerId) return undefined;
      if (matchup.teamA?.id === matchup.winnerId) return matchup.teamA;
      if (matchup.teamB?.id === matchup.winnerId) return matchup.teamB;
      return undefined;
    };

    const r32: Matchup[] = Array.from({ length: 4 }).map((_, i) => {
      const left = rd64[2 * i];
      const right = rd64[2 * i + 1];
      const teamA = getWinnerTeam(left) ?? left?.teamA;
      const teamB = getWinnerTeam(right) ?? right?.teamB;
      const matchupId = makeMatchupId(region, 1, i);

      if (!allowFallback) {
        // In game-only mode, we only have game-market probs for RD64 slots.
        return { id: matchupId, round: 1, region, teamA, teamB, winnerId: teamA && teamB ? pickDeterministicWinnerId(teamA, teamB) : undefined };
      }
      if (!teamA || !teamB) return { id: matchupId, round: 1, region, teamA, teamB };
      const fallback = inferFallbackHeadToHead(model.titleOdds, teamA, teamB);
      if (!fallback) return { id: matchupId, round: 1, region, teamA, teamB };
      const winnerId = pickWinnerId(teamA, fallback.probA, teamB, fallback.probB);
      return {
        id: matchupId,
        round: 1,
        region,
        teamA,
        teamB,
        probA: fallback.probA,
        probB: fallback.probB,
        winnerId,
        source: "fallback",
        volume: fallback.volume,
      };
    });

    const sweet16: Matchup[] = Array.from({ length: 2 }).map((_, i) => {
      const left = r32[2 * i];
      const right = r32[2 * i + 1];
      const teamA = getWinnerTeam(left) ?? left?.teamA;
      const teamB = getWinnerTeam(right) ?? right?.teamB;
      const matchupId = makeMatchupId(region, 2, i);
      if (!allowFallback) {
        return { id: matchupId, round: 2, region, teamA, teamB, winnerId: teamA && teamB ? pickDeterministicWinnerId(teamA, teamB) : undefined };
      }
      if (!teamA || !teamB) return { id: matchupId, round: 2, region, teamA, teamB };
      const fallback = inferFallbackHeadToHead(model.titleOdds, teamA, teamB);
      if (!fallback) return { id: matchupId, round: 2, region, teamA, teamB };
      const winnerId = pickWinnerId(teamA, fallback.probA, teamB, fallback.probB);
      return {
        id: matchupId,
        round: 2,
        region,
        teamA,
        teamB,
        probA: fallback.probA,
        probB: fallback.probB,
        winnerId,
        source: "fallback",
        volume: fallback.volume,
      };
    });

    const elite8: Matchup[] = Array.from({ length: 1 }).map((_, i) => {
      const left = sweet16[0];
      const right = sweet16[1];
      const teamA = getWinnerTeam(left) ?? left?.teamA;
      const teamB = getWinnerTeam(right) ?? right?.teamB;
      const matchupId = makeMatchupId(region, 3, i);
      if (!allowFallback) {
        return { id: matchupId, round: 3, region, teamA, teamB, winnerId: teamA && teamB ? pickDeterministicWinnerId(teamA, teamB) : undefined };
      }
      if (!teamA || !teamB) return { id: matchupId, round: 3, region, teamA, teamB };
      const fallback = inferFallbackHeadToHead(model.titleOdds, teamA, teamB);
      if (!fallback) return { id: matchupId, round: 3, region, teamA, teamB };
      const winnerId = pickWinnerId(teamA, fallback.probA, teamB, fallback.probB);
      return {
        id: matchupId,
        round: 3,
        region,
        teamA,
        teamB,
        probA: fallback.probA,
        probB: fallback.probB,
        winnerId,
        source: "fallback",
        volume: fallback.volume,
      };
    });

    const regionWinner = elite8[0]?.winnerId
      ? elite8[0].teamA?.id === elite8[0].winnerId
        ? elite8[0].teamA
        : elite8[0].teamB
      : undefined;

    acc[region] = { rd64, r32, sweet16, elite8, regionWinner };
    return acc;
  }, {} as InferredBracket["regions"]);

  const [semi0Regions, semi1Regions] = FINAL_FOUR_SEMIFINAL_REGIONS;
  const semi0TeamA = inferredRegions[semi0Regions[0]].regionWinner ?? inferredRegions[semi0Regions[0]].elite8[0]?.teamA;
  const semi0TeamB = inferredRegions[semi0Regions[1]].regionWinner ?? inferredRegions[semi0Regions[1]].elite8[0]?.teamA;
  const semi1TeamA = inferredRegions[semi1Regions[0]].regionWinner ?? inferredRegions[semi1Regions[0]].elite8[0]?.teamA;
  const semi1TeamB = inferredRegions[semi1Regions[1]].regionWinner ?? inferredRegions[semi1Regions[1]].elite8[0]?.teamA;

  const finalFour: Matchup[] = [
    { id: makeNonRegionMatchupId(4, 0), round: 4, teamA: semi0TeamA, teamB: semi0TeamB },
    { id: makeNonRegionMatchupId(4, 1), round: 4, teamA: semi1TeamA, teamB: semi1TeamB },
  ];

  if (allowFallback) {
    for (const semi of finalFour) {
      if (!semi.teamA || !semi.teamB) continue;
      const fallback = inferFallbackHeadToHead(model.titleOdds, semi.teamA, semi.teamB);
      if (!fallback) continue;
      const winnerId = pickWinnerId(semi.teamA, fallback.probA, semi.teamB, fallback.probB);
      semi.probA = fallback.probA;
      semi.probB = fallback.probB;
      semi.winnerId = winnerId;
      semi.source = "fallback";
      semi.volume = fallback.volume;
    }
    const semi0 = finalFour[0];
    const semi1 = finalFour[1];
    const champTeamA =
      semi0 && semi0.winnerId && semi0.teamA?.id === semi0.winnerId ? semi0.teamA : semi0?.teamB;
    const champTeamB =
      semi1 && semi1.winnerId && semi1.teamA?.id === semi1.winnerId ? semi1.teamA : semi1?.teamB;
    const championship: Matchup = { id: makeNonRegionMatchupId(5, 0), round: 5, teamA: champTeamA, teamB: champTeamB };
    if (championship.teamA && championship.teamB) {
      const fallback = inferFallbackHeadToHead(model.titleOdds, championship.teamA, championship.teamB);
      if (fallback) {
        const winnerId = pickWinnerId(championship.teamA, fallback.probA, championship.teamB, fallback.probB);
        championship.probA = fallback.probA;
        championship.probB = fallback.probB;
        championship.winnerId = winnerId;
        championship.source = "fallback";
        championship.volume = fallback.volume;
      }
    }
    return { regions: inferredRegions, finalFour, championship: [championship] };
  }

  // Game-only mode (no fallback for non-R64 rounds).
  // Championship winner still needs to be deterministic; use teamA/teamB ordering tie-break via RD64 winners.
  for (const semi of finalFour) {
    if (!semi.teamA || !semi.teamB) continue;
    // If RD64 winners were computed, propagate them with deterministic tie-break.
    // Without probabilities we cannot choose confidently; default to lower seed team (deterministic).
    const winnerId =
      semi.teamA.seed !== semi.teamB.seed ? (semi.teamA.seed < semi.teamB.seed ? semi.teamA.id : semi.teamB.id) : semi.teamA.name.localeCompare(semi.teamB.name) <= 0 ? semi.teamA.id : semi.teamB.id;
    semi.winnerId = winnerId;
  }

  const semi0Winner =
    finalFour[0]?.winnerId && finalFour[0].teamA?.id === finalFour[0].winnerId ? finalFour[0].teamA : finalFour[0]?.teamB;
  const semi1Winner =
    finalFour[1]?.winnerId && finalFour[1].teamA?.id === finalFour[1].winnerId ? finalFour[1].teamA : finalFour[1]?.teamB;
  const championshipWinner =
    semi0Winner && semi1Winner
      ? semi0Winner.seed !== semi1Winner.seed
        ? semi0Winner.seed < semi1Winner.seed
          ? semi0Winner
          : semi1Winner
        : semi0Winner.name.localeCompare(semi1Winner.name) <= 0
          ? semi0Winner
          : semi1Winner
      : semi0Winner ?? semi1Winner;

  const championship: Matchup = {
    id: makeNonRegionMatchupId(5, 0),
    round: 5,
    teamA: semi0Winner,
    teamB: semi1Winner,
    winnerId: championshipWinner?.id,
  };

  return { regions: inferredRegions, finalFour, championship: [championship] };
}

