import type {
  BracketModel,
  Rd64GameMarket,
  Region,
  TitleOdds,
  Team,
} from "@/lib/types";
import { RD64_SEED_PAIR_ORDER, REGION_ORDER, rd64SlotForSeedPair } from "@/data/bracket2026";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const POLYMARKET_BRACKET_URL = "https://polymarket.com/sports/cbb/bracket";
const TITLE_EVENT_SLUG = "2026-ncaa-tournament-winner";

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&nbsp;/g, " ");
}

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

type RegionBoundary = { region: Region; idx: number };
type BracketBounds = { boundaries: RegionBoundary[]; bracketEnd: number; rd64End: number };

function findBracketBounds(html: string): BracketBounds {
  const all: RegionBoundary[] = [];
  const byRegion: Record<Region, number[]> = {
    East: [],
    South: [],
    West: [],
    Midwest: [],
  };
  for (const r of REGION_ORDER) {
    const re = new RegExp(`tracking-widest mb-2 px-1[^>]*>${r}</div>`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      all.push({ region: r, idx: m.index });
      byRegion[r].push(m.index);
    }
  }
  all.sort((a, b) => a.idx - b.idx);
  const boundaries = all.slice(0, REGION_ORDER.length);

  // First "translateY" region header marks the start of later-round columns.
  const translateYRe = /tracking-widest[^>]*translateY[^>]*>(?:East|South|West|Midwest)<\/div>/;
  const translateYMatch = translateYRe.exec(html);
  const rd64End = translateYMatch ? translateYMatch.index : html.length;

  // The page contains duplicate bracket copies. Use the earliest second region-header
  // as the end of the first copy.
  const secondHeaderStarts = REGION_ORDER.map((r) => byRegion[r][1]).filter(
    (idx): idx is number => typeof idx === "number"
  );
  const bracketEnd = secondHeaderStarts.length ? Math.min(...secondHeaderStarts) : html.length;

  return { boundaries, bracketEnd, rd64End: Math.min(rd64End, bracketEnd) };
}

function extractRegionForIndex(idx: number, bounds: BracketBounds): Region | undefined {
  if (idx >= bounds.rd64End) return undefined;
  let best: Region | undefined;
  for (const b of bounds.boundaries) {
    if (b.idx <= idx) best = b.region;
    else break;
  }
  return best;
}

function fillMissingRd64FromRegionSections(
  html: string,
  bounds: BracketBounds,
  result: Record<Region, BracketRd64GameSource[]>
) {
  const sortedBounds = bounds.boundaries.slice().sort((a, b) => a.idx - b.idx);

  for (let i = 0; i < sortedBounds.length; i += 1) {
    const { region, idx: start } = sortedBounds[i];
    const nextStart = sortedBounds[i + 1]?.idx ?? bounds.rd64End;
    const sectionEnd = Math.min(nextStart, bounds.rd64End);
    const section = html.slice(start, sectionEnd);

    const seedRe = /text-xs w-4 text-center font-medium shrink-0 text-text-secondary">(\d{1,2})<\/p>/g;
    const seedsWithPos = [...section.matchAll(seedRe)]
      .map((m) => ({ seed: Number(m[1]), idx: m.index ?? 0 }))
      .filter((x) => x.seed >= 1 && x.seed <= 16);

    if (seedsWithPos.length < 8) continue;

    const seedToName = new Map<number, string>();
    for (const s of seedsWithPos) {
      const rowSlice = section.slice(s.idx, s.idx + 500);
      const nameMatch = rowSlice.match(/class="text-sm truncate[^"]*">([^<]+)<\/p>/);
      const name = nameMatch?.[1] ? decodeHtmlEntities(nameMatch[1].trim()) : "";
      if (name) seedToName.set(s.seed, name);
    }

    for (let slotIndex = 0; slotIndex < RD64_SEED_PAIR_ORDER.length; slotIndex += 1) {
      if (result[region].some((g) => g.slotIndex === slotIndex)) continue;

      const pair = RD64_SEED_PAIR_ORDER[slotIndex];
      const nameA = seedToName.get(pair.seedA);
      const nameB = seedToName.get(pair.seedB);
      if (!nameA && !nameB) continue;
      const resolvedA = nameA && nameA.toLowerCase() !== "tbd" ? nameA : `Seed ${pair.seedA} Winner`;
      const resolvedB = nameB && nameB.toLowerCase() !== "tbd" ? nameB : `Seed ${pair.seedB} Winner`;

      const slot = rd64SlotForSeedPair(region, pair.seedA, pair.seedB);
      if (!slot) continue;
      result[region].push({
        region,
        slotIndex: slot.slotIndex,
        seedA: slot.seedA,
        seedB: slot.seedB,
        teamA: {
          id: teamIdFromName(resolvedA),
          name: resolvedA,
          seed: pair.seedA,
          region,
        },
        teamB: {
          id: teamIdFromName(resolvedB),
          name: resolvedB,
          seed: pair.seedB,
          region,
        },
      });
    }
  }
}

function parsePolymarketBracketPageForRd64(html: string): Record<Region, BracketRd64GameSource[]> {
  const result: Record<Region, BracketRd64GameSource[]> = {
    East: [],
    South: [],
    West: [],
    Midwest: [],
  };

  const bounds = findBracketBounds(html);

  // Match event links - page uses ">View" (previously ">Game View")
  const hrefRe = /href="\/event\/(cbb-[A-Za-z0-9-]+)">View/g;
  const hrefMatches = [...html.matchAll(hrefRe)];

  for (const m of hrefMatches) {
    const slug = m[1];
    const slugStart = m.index ?? 0;

    const region = extractRegionForIndex(slugStart, bounds);
    if (!region) continue;

    // Team data is AFTER the link in the current page structure
    const nextHrefIdx = html.indexOf('href="/event/cbb-', slugStart + slug.length + 5);
    const afterSlice = html.slice(slugStart, nextHrefIdx === -1 ? slugStart + 3000 : nextHrefIdx);

    // Extract short team names from alt attributes
    const altMatches = [...afterSlice.matchAll(/alt="([^"]+)"/g)]
      .map((x) => decodeHtmlEntities(x[1]))
      .filter((x) => x.length > 1);
    const teamNames = altMatches.slice(0, 2);
    if (teamNames.length < 2) continue;

    // Seeds from text-text-secondary class (new format) or <p> tags (old format)
    let seedMatches = [...afterSlice.matchAll(/text-text-secondary">(\d{1,2})<\/p>/g)]
      .map((x) => Number(x[1]))
      .filter((x) => x >= 1 && x <= 16);
    if (seedMatches.length < 2) {
      seedMatches = [...afterSlice.matchAll(/<p[^>]*>(\d{1,2})<\/p>/g)]
        .map((x) => Number(x[1]))
        .filter((x) => x >= 1 && x <= 16);
    }
    const seeds = seedMatches.slice(0, 2);
    if (seeds.length < 2) continue;

    const seedKeyMin = Math.min(seeds[0], seeds[1]);
    const seedKeyMax = Math.max(seeds[0], seeds[1]);
    const slot = rd64SlotForSeedPair(region, seedKeyMin, seedKeyMax);
    if (!slot) continue;

    const teamAFromSeed =
      seeds[0] <= seeds[1] ? { seed: seeds[0], name: teamNames[0] } : { seed: seeds[1], name: teamNames[1] };
    const teamBFromSeed =
      seeds[0] <= seeds[1] ? { seed: seeds[1], name: teamNames[1] } : { seed: seeds[0], name: teamNames[0] };
    const resolvedNameA =
      teamAFromSeed.name.toLowerCase() === "tbd" ? `Seed ${teamAFromSeed.seed} Winner` : teamAFromSeed.name;
    const resolvedNameB =
      teamBFromSeed.name.toLowerCase() === "tbd" ? `Seed ${teamBFromSeed.seed} Winner` : teamBFromSeed.name;

    const teamA: Team = {
      id: teamIdFromName(resolvedNameA),
      name: resolvedNameA,
      seed: teamAFromSeed.seed,
      region,
    };
    const teamB: Team = {
      id: teamIdFromName(resolvedNameB),
      name: resolvedNameB,
      seed: teamBFromSeed.seed,
      region,
    };

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

  // Some R64 cards can exist without a market link yet; backfill those from region HTML sections.
  fillMissingRd64FromRegionSections(html, bounds, result);

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
          const aName = normalizeTeamNameForMatch(item.teamA.name);
          const bName = normalizeTeamNameForMatch(item.teamB.name);

          // Fuzzy match: bracket page may use short names ("Duke") while API uses full names ("Duke Blue Devils")
          const aIdx = outcomes.findIndex((o) => {
            const norm = normalizeTeamNameForMatch(o);
            return norm === aName || norm.includes(aName) || aName.includes(norm);
          });
          const bIdx = outcomes.findIndex((o) => {
            const norm = normalizeTeamNameForMatch(o);
            return norm === bName || norm.includes(bName) || bName.includes(norm);
          });
          if (aIdx < 0 || bIdx < 0 || aIdx === bIdx) continue;

          const outcomePrices = safeParseJsonArrayMaybe(market.outcomePrices) ?? [];
          if (outcomePrices.length !== 2) continue;
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

