import { Point } from "../util/types";
import { Bonus } from "./bonus";
import { RenderableMobile } from "./state";

export const WORLD_CHUNK_SIZE = { x: 8, y: 8 };

export type ChunkValue = { t: 'bonus', bonus: Bonus } | { t: 'mobile', mobile: RenderableMobile };

export const BIT_SELECTED = 0;
export const BIT_CONNECTED = 1;
export const BIT_VISIBLE = 2;

export const BONUS_CHANNEL = 0;
export const METADATA_CHANNEL = 1;
export const MOBILE_CHANNEL = 2;
export const UNUSED_CHANNEL = 3;

export type ChunkUpdate =
  | { t: 'bonus', bonus: Bonus }
  | { t: 'addMobile', mobile: RenderableMobile }
  | { t: 'removeMobile' }
  | { t: 'setBit', bit: number }
  | { t: 'clearBit', bit: number }
  | { t: 'restoreMobile', mobile: RenderableMobile }

export type Chunk = {
  size: Point,
  imdat: ImageData,
}
