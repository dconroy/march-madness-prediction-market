import type { Region, RegionRd64Slot, TeamSeedPairKey } from "@/lib/types";

export const REGION_ORDER: Region[] = ["East", "South", "West", "Midwest"];

export const FINAL_FOUR_SEMIFINAL_REGIONS: Array<[Region, Region]> = [
  // Semifinal 0
  ["East", "West"],
  // Semifinal 1
  ["South", "Midwest"],
];

// Standard NCAA men's bracket seed pairings for each region's Round of 64.
// The bracket UI uses this order for deterministic downstream pairing.
export const RD64_SEED_PAIR_ORDER: Array<{ seedA: number; seedB: number }> = [
  { seedA: 1, seedB: 16 },
  { seedA: 8, seedB: 9 },
  { seedA: 5, seedB: 12 },
  { seedA: 4, seedB: 13 },
  { seedA: 6, seedB: 11 },
  { seedA: 3, seedB: 14 },
  { seedA: 7, seedB: 10 },
  { seedA: 2, seedB: 15 },
];

export function makeSeedPairKey(seedA: number, seedB: number): TeamSeedPairKey {
  const a = Math.min(seedA, seedB);
  const b = Math.max(seedA, seedB);
  return `${a}-${b}` as TeamSeedPairKey;
}

export function rd64SlotForSeedPair(region: Region, seedA: number, seedB: number): RegionRd64Slot | undefined {
  const key = makeSeedPairKey(seedA, seedB);
  const idx = RD64_SEED_PAIR_ORDER.findIndex((p) => makeSeedPairKey(p.seedA, p.seedB) === key);
  if (idx === -1) return undefined;
  const { seedA: a, seedB: b } = RD64_SEED_PAIR_ORDER[idx];
  return { region, slotIndex: idx, seedA: a, seedB: b };
}

