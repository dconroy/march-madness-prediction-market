import type { Region } from "@/lib/types";
import { REGION_ORDER } from "@/data/bracket2026";

// Fixed-size layout constants to keep the SVG connectors deterministic for the MVP.
export const CARD_W = 260;
export const CARD_H = 76;
export const CARD_GAP_Y = 12;
export const ROW_PITCH = CARD_H + CARD_GAP_Y;

export const REGION_HEIGHT = 8 * CARD_H + 7 * CARD_GAP_Y; // only based on R64 vertical span
export const REGION_GAP_Y = 28;

export const COL_W = CARD_W;
export const COL_GAP_X = 44;
export const COL_PAD_X = 24;

export const HEADER_H = 56;

export const bracketWidth = () => COL_PAD_X * 2 + COL_W * 6 + COL_GAP_X * 5;
export const bracketHeight = () => HEADER_H + REGION_HEIGHT * 4 + REGION_GAP_Y * 3;

export function regionIndex(region: Region) {
  return REGION_ORDER.indexOf(region);
}

export function regionTopPx(regionIdx: number) {
  return HEADER_H + regionIdx * (REGION_HEIGHT + REGION_GAP_Y);
}

export function rd64CenterY(regionIdx: number, slotIndex: number) {
  return regionTopPx(regionIdx) + slotIndex * ROW_PITCH + CARD_H / 2;
}

export function roundCenterY(regionIdx: number, round: number, index: number) {
  // round: 0..3 for region-based rounds.
  // 0 => R64 index 0..7
  // 1 => R32 index 0..3
  // 2 => Sweet16 index 0..1
  // 3 => Elite8 index 0..0
  if (round === 0) return rd64CenterY(regionIdx, index);
  if (round === 1) {
    // avg of rd64 indices (2i, 2i+1)
    const left = rd64CenterY(regionIdx, 2 * index);
    const right = rd64CenterY(regionIdx, 2 * index + 1);
    return (left + right) / 2;
  }
  if (round === 2) {
    // avg of rd64 indices (4i..4i+3)
    const start = 4 * index;
    const c0 = rd64CenterY(regionIdx, start);
    const c3 = rd64CenterY(regionIdx, start + 3);
    return (c0 + c3) / 2;
  }
  // round === 3 => avg of all rd64 centers
  return rd64CenterY(regionIdx, 3.5);
}

export function elite8CenterY(regionIdx: number) {
  return rd64CenterY(regionIdx, 3) + ROW_PITCH / 2;
}

export function columnX(colIndex: number) {
  // 0..5 for R64..Championship
  return COL_PAD_X + colIndex * (COL_W + COL_GAP_X) + COL_W / 2;
}

