import type { Region } from "@/lib/types";
import { REGION_ORDER } from "@/data/bracket2026";

export const CARD_W = 210;
export const CARD_H = 56;
export const CARD_GAP_Y = 12;
export const ROW_PITCH = CARD_H + CARD_GAP_Y;

export const REGION_HEIGHT = 8 * CARD_H + 7 * CARD_GAP_Y;
export const REGION_GAP_Y = 40;

export const COL_W = CARD_W;
export const COL_GAP_X = 36;
export const COL_PAD_X = 16;

export const HEADER_H = 44;

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
  if (round === 0) return rd64CenterY(regionIdx, index);
  if (round === 1) {
    const left = rd64CenterY(regionIdx, 2 * index);
    const right = rd64CenterY(regionIdx, 2 * index + 1);
    return (left + right) / 2;
  }
  if (round === 2) {
    const start = 4 * index;
    const c0 = rd64CenterY(regionIdx, start);
    const c3 = rd64CenterY(regionIdx, start + 3);
    return (c0 + c3) / 2;
  }
  return rd64CenterY(regionIdx, 3.5);
}

export function elite8CenterY(regionIdx: number) {
  return rd64CenterY(regionIdx, 3) + ROW_PITCH / 2;
}

export function columnX(colIndex: number) {
  return COL_PAD_X + colIndex * (COL_W + COL_GAP_X) + COL_W / 2;
}
