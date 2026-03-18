import type {
  BracketModel,
  Rd64GameMarket,
  Region,
  TitleOdds,
  Team,
} from "@/lib/types";
import { REGION_ORDER, rd64SlotForSeedPair } from "@/data/bracket2026";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const POLYMARKET_BRACKET_URL = "https://polymarket.com/sports/cbb/bracket";
const TITLE_EVENT_SLUG = "2026-ncaa-tournament-winner";

function teamIdFromName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, "-")
    .trim();
}

function safeParseJsonArrayMaybe(s: unknown): string[] | undefined {
  if (typeof s !== "string") return undefined;
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) return parsed;
  } catch {
    // ignore
  }
  return undefined;
}

function normalizeTeamNameForMatch(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

type GammaMarket = {
  question?: string;
  outcomes?: unknown;
  outcomePrices?: unknown;
  volume?: unknown;
};

type GammaEvent = {
  updatedAt?: string;
  markets?: GammaMarket[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "User-Agent": "mm2026-local-mvp" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Request failed: ${res.status} ${res.statusText} (${url}). Body: ${body.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

type BracketRd64GameSource = {
  region: Region;
  slotIndex: number;
  seedA: number;
  seedB: number;
  teamA: Team;
  teamB: Team;
  marketSlug?: string; // cbb event slug for this specific R1 game, if found
};

function extractRegionForIndex(html: string, idx: number): Region | undefined {
  let bestRegion: Region | undefined;
  let bestIdx = -1;
  for (const r of REGION_ORDER) {
    const candidateIdx = html.lastIndexOf(r, idx);
    if (candidateIdx > bestIdx) {
      bestIdx = candidateIdx;
      bestRegion = r;
    }
  }
  return bestRegion;
}

function parsePolymarketBracketPageForRd64(html: string): Record<Region, BracketRd64GameSource[]> {
  const result: Record<Region, BracketRd64GameSource[]> = {
    East: [],
    South: [],
    West: [],
    Midwest: [],
  };

  // Each first-round matchup should include exactly two seeds (1..16) and two team logos with alt text.
  const hrefRe = /href="\/event\/(cbb-[A-Za-z0-9-]+)"\s*>Game View/g;
  const hrefMatches = [...html.matchAll(hrefRe)];

  for (const m of hrefMatches) {
    const slug = m[1];
    const slugStart = m.index ?? 0;

    // Slice from this event link to just before the next event link so we only parse one matchup.
    const nextHrefIdx = html.indexOf('href="/event/cbb-', slugStart + slug.length);
    const slice = html.slice(slugStart, nextHrefIdx === -1 ? slugStart + 2500 : nextHrefIdx);

    // Determine region and round.
    const region = extractRegionForIndex(html, slugStart);
    if (!region) continue;

    const roundMatch = slice.match(/>R(\d)</);
    const round = roundMatch ? Number(roundMatch[1]) : undefined;
    if (round !== 1) continue; // R1 => Round of 64

    const seedMatches = [...slice.matchAll(/<p[^>]*>(\d{1,2})<\/p>/g)].map((x) => Number(x[1]));
    const seeds = seedMatches.filter((x) => x >= 1 && x <= 16);
    const uniqSeeds = [...new Set(seeds)];
    if (uniqSeeds.length < 2) continue;
    const seedAParsed = uniqSeeds[0];
    const seedBParsed = uniqSeeds[1];

    const seedKeyMin = Math.min(seedAParsed, seedBParsed);
    const seedKeyMax = Math.max(seedAParsed, seedBParsed);
    const slot = rd64SlotForSeedPair(region, seedKeyMin, seedKeyMax);
    if (!slot) continue;

    const altMatches = [...slice.matchAll(/alt="([^"]+)"/g)].map((x) => x[1]).filter((x) => normalizeTeamNameForMatch(x).length > 1);
    // Typically the first two alts in this slice correspond to the two teams.
    const teamNames = altMatches.slice(0, 2);
    if (teamNames.length < 2) continue;

    // We need to associate each team name with the correct seed number.
    // The slice order is usually: (seed1/team1) then (seed2/team2), so use seed ordering from appearance.
    const appearanceSeeds = seedMatches.filter((x) => x >= 1 && x <= 16).slice(0, 2);
    if (appearanceSeeds.length < 2) continue;
    const team1 = teamNames[0];
    const team2 = teamNames[1];

    const teamASeed = appearanceSeeds[0];
    const teamBSeed = appearanceSeeds[1];
    const teamAFromSeed =
      teamASeed <= teamBSeed ? { seed: teamASeed, name: team1 } : { seed: teamBSeed, name: team2 };
    const teamBFromSeed =
      teamASeed <= teamBSeed ? { seed: teamBSeed, name: team2 } : { seed: teamASeed, name: team1 };

    const teamA: Team = {
      id: teamIdFromName(teamAFromSeed.name),
      name: teamAFromSeed.name,
      seed: teamAFromSeed.seed,
      region,
    };
    const teamB: Team = {
      id: teamIdFromName(teamBFromSeed.name),
      name: teamBFromSeed.name,
      seed: teamBFromSeed.seed,
      region,
    };

    // Deduplicate by slotIndex (the page can include extra R1 entries in some cases).
    const existing = result[region].find((g) => g.slotIndex === slot.slotIndex);
    if (existing) continue;

    result[region].push({
      region,
      slotIndex: slot.slotIndex,
      seedA: slot.seedA,
      seedB: slot.seedB,
      teamA,
      teamB,
      marketSlug: slug,
    });
  }

  // Fill missing slots by sorting and keeping the first match we saw.
  for (const region of REGION_ORDER) {
    result[region] = result[region].sort((a, b) => a.slotIndex - b.slotIndex);
  }
  return result;
}

async function getTitleMarkets(): Promise<{ titleOdds: TitleOdds[]; updatedAt: string }> {
  const url = `${GAMMA_API_BASE}/events?slug=${encodeURIComponent(TITLE_EVENT_SLUG)}`;
  const events = await fetchJson<GammaEvent[]>(url, { next: { revalidate: 3600 } });
  if (!events?.length) throw new Error(`No events found for title slug: ${TITLE_EVENT_SLUG}`);
  const event = events[0];
  const updatedAt = event.updatedAt ?? new Date().toISOString();

  const odds: TitleOdds[] = [];
  for (const market of event.markets ?? []) {
    const question: string | undefined = market.question;
    const outcomes = safeParseJsonArrayMaybe(market.outcomes) ?? [];
    const outcomePrices = safeParseJsonArrayMaybe(market.outcomePrices) ?? [];
    if (!question || outcomes.length < 2 || outcomePrices.length < 2) continue;
    const yesIdx = outcomes.findIndex((o: string) => normalizeTeamNameForMatch(o) === "yes");
    const yesProb = yesIdx >= 0 ? Number(outcomePrices[yesIdx]) : Number(outcomePrices[0]);
    if (!Number.isFinite(yesProb)) continue;

    const m = question.match(/^Will (.+) win the 2026 NCAA Tournament\?/);
    const teamName = m?.[1]?.trim();
    if (!teamName) continue;

    if (teamName.toLowerCase() === "other") continue;

    const volumeNum = market.volume ? Number(market.volume) : undefined;
    odds.push({
      teamId: teamIdFromName(teamName),
      teamName,
      probability: Math.max(0, Math.min(100, yesProb * 100)),
      volume: volumeNum && Number.isFinite(volumeNum) ? volumeNum : undefined,
    });
  }

  return { titleOdds: odds, updatedAt };
}

async function getGameMarkets(matchups: BracketRd64GameSource[]): Promise<{
  gameMarketsByMatchupId: Record<string, Rd64GameMarket>;
  updatedAt?: string;
}> {
  const updatedAtCandidates: string[] = [];

  // Small concurrency control for speed without hammering the API.
  const concurrency = 6;
  const queue = matchups.slice();
  const results: Array<{ matchupId: string; data: Rd64GameMarket } | undefined> = [];

  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (!item?.marketSlug) continue;

      const matchupId = `m-${item.region}-r0-i${item.slotIndex}`;
      try {
        const url = `${GAMMA_API_BASE}/events?slug=${encodeURIComponent(item.marketSlug)}`;
        const events = await fetchJson<GammaEvent[]>(url, { next: { revalidate: 3600 } });
        if (!events?.length) continue;
        const event = events[0];
        if (event.updatedAt) updatedAtCandidates.push(event.updatedAt);

        let best: { probA: number; probB: number; marketName?: string; volume?: number } | undefined;
        for (const market of event.markets ?? []) {
          const outcomes = safeParseJsonArrayMaybe(market.outcomes) ?? [];
          if (outcomes.length !== 2) continue;
          const aName = item.teamA.name;
          const bName = item.teamB.name;
          const outcomeSet = new Set(outcomes);
          if (!outcomeSet.has(aName) || !outcomeSet.has(bName)) continue;

          const outcomePrices = safeParseJsonArrayMaybe(market.outcomePrices) ?? [];
          if (outcomePrices.length !== 2) continue;
          const aIdx = outcomes.indexOf(aName);
          const bIdx = outcomes.indexOf(bName);
          const probA = Number(outcomePrices[aIdx]) * 100;
          const probB = Number(outcomePrices[bIdx]) * 100;
          if (!Number.isFinite(probA) || !Number.isFinite(probB)) continue;
          best = {
            probA: Math.max(0, Math.min(100, probA)),
            probB: Math.max(0, Math.min(100, probB)),
            marketName: market.question ?? `${aName} vs. ${bName}`,
            volume: market.volume ? Number(market.volume) : undefined,
          };
          // Moneyline is likely the first relevant two-outcome market; stop on first good match.
          break;
        }

        if (best) {
          results.push({
            matchupId,
            data: {
              probA: best.probA,
              probB: best.probB,
              source: "market",
              marketName: best.marketName,
              volume: best.volume && Number.isFinite(best.volume) ? best.volume : undefined,
            },
          });
        }
      } catch {
        // Ignore per-match errors so we can still render a full bracket using fallback.
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }).map(() => worker()));

  const gameMarketsByMatchupId: Record<string, Rd64GameMarket> = {};
  for (const r of results) {
    if (!r) continue;
    gameMarketsByMatchupId[r.matchupId] = r.data;
  }

  return { gameMarketsByMatchupId, updatedAt: updatedAtCandidates.sort().at(-1) };
}

async function mapMarketsToBracket(args: {
  rd64GamesByRegion: Record<Region, BracketRd64GameSource[]>;
  titleOdds: TitleOdds[];
  titleUpdatedAt: string;
}) {
  const regions = Object.fromEntries(
    REGION_ORDER.map((region) => [
      region,
      {
        matchups: (args.rd64GamesByRegion[region] ?? [])
          .filter((g) => g.slotIndex >= 0 && g.slotIndex < 8)
          .sort((a, b) => a.slotIndex - b.slotIndex)
          .slice(0, 8)
          .map((g) => ({
            id: `m-${region}-r0-i${g.slotIndex}`,
            slotIndex: g.slotIndex,
            teamA: g.teamA,
            teamB: g.teamB,
            marketSlug: g.marketSlug,
          })),
      },
    ])
  ) as BracketModel["rd64"]["regions"];

  const allRd64Games = Object.values(args.rd64GamesByRegion).flat();
  const { gameMarketsByMatchupId } = await getGameMarkets(allRd64Games);

  // Prefer the most recent update between title odds and game markets.
  const lastUpdated = args.titleUpdatedAt;

  const model: BracketModel = {
    titleOdds: args.titleOdds,
    rd64: {
      lastUpdated,
      regions,
    },
    gameMarketsByMatchupId,
  };

  return model;
}

async function getBracketParticipantsFromPolymarket(): Promise<Record<Region, BracketRd64GameSource[]>> {
  const html = await fetch(POLYMARKET_BRACKET_URL, {
    headers: {
      "User-Agent": "mm2026-local-mvp",
    },
  }).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch bracket page: ${r.status} ${r.statusText}`);
    return r.text();
  });
  return parsePolymarketBracketPageForRd64(html);
}

export const polymarketEndpoints = {
  bracketPage: POLYMARKET_BRACKET_URL,
  titleEvent: `${GAMMA_API_BASE}/events?slug=${TITLE_EVENT_SLUG}`,
  gameEventLookup: (slug: string) => `${GAMMA_API_BASE}/events?slug=${slug}`,
};

// Compatibility helper for the requested structure in the prompt.
// "Tournament markets" in this MVP means: title odds + Round-of-64 game markets.
async function getTournamentMarkets() {
  const { titleOdds, updatedAt } = await getTitleMarkets();
  const rd64GamesByRegion = await getBracketParticipantsFromPolymarket();
  return { titleOdds, titleUpdatedAt: updatedAt, rd64GamesByRegion };
}

export async function getBracketModel2026(): Promise<BracketModel> {
  const { titleOdds, titleUpdatedAt, rd64GamesByRegion } = await getTournamentMarkets();
  return mapMarketsToBracket({
    rd64GamesByRegion,
    titleOdds,
    titleUpdatedAt,
  });
}

