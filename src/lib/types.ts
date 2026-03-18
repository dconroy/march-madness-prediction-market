export type Region = "East" | "West" | "South" | "Midwest";

export type Team = {
  /**
   * Stable identifier used for deterministic bracket propagation.
   * This is derived from the team name (school + nickname) and normalized.
   */
  id: string;
  name: string;
  seed: number;
  region: Region;
};

export type Matchup = {
  id: string;
  round: number; // 0..5 => R64..Championship
  region?: Region;
  teamA?: Team;
  teamB?: Team;
  probA?: number; // 0..100
  probB?: number; // 0..100
  winnerId?: string;
  source?: "market" | "fallback";
  marketName?: string;
  volume?: number;
};

export type TitleOdds = {
  teamId: string; // derived from title-odds school name
  teamName: string;
  probability: number; // 0..100
  volume?: number;
};

export type TeamSeedPairKey = `${number}-${number}`;

export type RegionRd64Slot = {
  region: Region;
  slotIndex: number; // 0..7
  seedA: number; // smaller seed
  seedB: number; // larger seed
};

export type Rd64GameMarket = {
  probA: number; // 0..100
  probB: number; // 0..100
  source: "market";
  marketName?: string;
  volume?: number;
};

export type ProbMode = "game" | "fallback";

export type BracketModel = {
  titleOdds: TitleOdds[];
  rd64: {
    lastUpdated: string;
    regions: Record<
      Region,
      {
        matchups: Array<{
          id: string; // deterministic matchup id for R64 slot
          slotIndex: number;
          teamA: Team;
          teamB: Team;
          marketSlug?: string; // polymarket event slug (if available)
        }>;
      }
    >;
  };
  gameMarketsByMatchupId?: Record<string, Rd64GameMarket>;
};

