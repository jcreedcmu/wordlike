import { bonusGenerator } from "../core/bonus";
import { BONUS_CHANNEL, Chunk, METADATA_CHANNEL, MOBILE_CHANNEL_H, MOBILE_CHANNEL_L, WORLD_CHUNK_SIZE } from "../core/chunk";
import { Overlay, getOverlay, setOverlay } from "../core/layer";
import { CoreState } from "../core/state";
import { ImageData } from "../util/image-data";
import { SE2, apply, compose, inverse, scale } from "../util/se2";
import { Point } from "../util/types";
import { vadd, vinv, vm, vm3 } from "../util/vutil";
import { spriteLocOfBonus } from "./sprite-sheet";
import { world_bds_in_canvas } from "./widget-constants";

// === cell_data format ===
//
// .r: which bonus we should show here. [xxxx][yyyy] high 4 bits are x coord on the sprite sheet, low 4 bits are y.
// .g: some metadata.
//       bit 0: tile is selected
//       bit 1: tile is connected to origin
//       bit 2: cell is visible
// .ba: which mobile we should draw here.
//      0: no mobile at all, let bonus show through
//     ≠0: show mobile with id [bbbbbbbb][aaaaaaaa], b is high bits and a is low bits.

// === mobile_data format ===
//
// .r: mobile type
//    0: resource
//    1: tile
// if resource:
// .g: [xxxx][yyyy] coordinates on sprite sheet
// .b: durability remaining
//
// if tile:
// .g: letter index

function getWorldChunkData(cs: CoreState, p_in_chunk: Point): Chunk {
  const chunk: Chunk = mkChunk(WORLD_CHUNK_SIZE);

  const { imdat, size } = chunk;
  for (let x = 0; x < size.x; x++) {
    for (let y = 0; y < size.y; y++) {
      const p_in_local_chunk = { x, y };
      const pp = vm3(p_in_chunk, p_in_local_chunk, chunk.size, (c, p, s) => c * s + p);
      const bonus = bonusGenerator(pp, cs.bonusLayerSeed);
      const spritePos = spriteLocOfBonus(bonus);
      const ix = x + y * chunk.size.x;
      const fix = 4 * ix;
      // this is in cell_data format
      imdat.data[fix + BONUS_CHANNEL] = (spritePos.x << 4) + spritePos.y;
      imdat.data[fix + METADATA_CHANNEL] = 0;
      imdat.data[fix + MOBILE_CHANNEL_H] = 0;
      imdat.data[fix + MOBILE_CHANNEL_L] = 0;
    }
  }

  return chunk;
}

export function ensureChunk(cache: Overlay<Chunk>, cs: CoreState, p_in_chunk: Point): void {
  if (!getOverlay(cache, p_in_chunk))
    setOverlay(cache, p_in_chunk, getWorldChunkData(cs, p_in_chunk));
}

export function getChunk(cache: Overlay<Chunk>, p_in_chunk: Point): Chunk | undefined {
  return getOverlay(cache, p_in_chunk);
}

export type ActiveChunkInfo = {
  // list of p_in_chunk of chunks that are at least partly visible
  ps_in_chunk: Point[];
  min_p_in_chunk: Point;
};
// Returns a collection of chunks that is as least as big as the
// minimal set needed to correctly render what's on the screen right
// now.
//
// canvas_from_world is the transformation from world coordinates to
// canvas coordinates. We assume world_bnds_in_canvas is the rect that
// describes what is actually potentially visible in the world
// display.
// The number `margin` is the amount of cells we want to expand our
// view by. This is needed because the data a cell's rendering depends
// on includes adjacent cells. (both because of land/water
// transitions, and because of fogged/visible transitions)
// To put it another way:
//
// Every fragment in the canvas is something I need to render. I can
// map this fragment point to a world point p. To render point p, I
// need to sample the bonus-cell value at p + (±0.5, ±0.5). To do that
// I need to know about the bonus data at ⌊p + (±0.5, ±0.5)⌋.

export function activeChunks(canvas_from_world: SE2, margin: number = 1): ActiveChunkInfo {
  const chunk_from_canvas = compose(scale(vinv(WORLD_CHUNK_SIZE)), inverse(canvas_from_world));
  const top_left_in_canvas = world_bds_in_canvas.p;
  const bot_right_in_canvas = vadd(world_bds_in_canvas.p, world_bds_in_canvas.sz);
  const top_left_in_chunk = vm(apply(chunk_from_canvas, top_left_in_canvas), Math.floor);
  const bot_right_in_chunk = vm(apply(chunk_from_canvas, bot_right_in_canvas), Math.floor);
  const chunks: Point[] = [];
  let min_p_in_chunk: Point = { x: Infinity, y: Infinity };
  for (let x = top_left_in_chunk.x - margin; x <= bot_right_in_chunk.x + margin; x++) {
    for (let y = top_left_in_chunk.y - margin; y <= bot_right_in_chunk.y + margin; y++) {
      chunks.push({ x, y });
      min_p_in_chunk.x = Math.min(x, min_p_in_chunk.x);
      min_p_in_chunk.y = Math.min(y, min_p_in_chunk.y);
    }
  }
  return { ps_in_chunk: chunks, min_p_in_chunk };
}

export function mkChunk(size: Point): Chunk {
  return {
    size,
    imdat: new ImageData(size.x, size.y)
  };
}
