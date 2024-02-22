import { spriteLocOfBonus, spriteLocOfChunkValue, spriteLocOfRes } from "../ui/sprite-sheet";
import { world_bds_in_canvas } from "../ui/widget-helpers";
import { ImageData } from "../util/image-data";
import { SE2, apply, compose, inverse, scale } from "../util/se2";
import { Point } from "../util/types";
import { vadd, vinv, vm, vm2, vm3, vmul, vsub } from "../util/vutil";
import { Bonus, bonusGenerator } from "./bonus";
import { Overlay, getOverlay, setOverlay } from "./layer";
import { byteOfLetter } from "./letters";
import { CoreState, RenderableMobile } from "./state";

export const WORLD_CHUNK_SIZE = { x: 8, y: 8 };

export type ChunkValue = { t: 'bonus', bonus: Bonus } | { t: 'mobile', mobile: RenderableMobile };

export const BIT_SELECTED = 0;
export const BIT_CONNECTED = 1;
export const BIT_VISIBLE = 2;

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
      // === cell_data format ===
      //
      // .r: which bonus we should show here. High 4 bits are x coord on the sprite sheet, low 4 bits are y.
      // .g: which mobile we should draw here.
      //     bit 7 set: mobile is a tile. 32 = none, 0 = A, ..., 25 = Z
      //     bit 7 clear: mobile is a resource from the sprite sheet. Format is
      //                  0[xxx][yyyy] just like .r field. This means we have access
      //                  to only the left half of the sprite sheet.
      // .b: some metadata.
      //       bit 0: tile is selected
      //       bit 1: tile is connected to origin
      //       bit 2: cell is visible
      // .a: unused
      imdat.data[fix + 0] = (spritePos.x << 4) + spritePos.y;
      imdat.data[fix + 1] = byteOfEmpty();
      imdat.data[fix + 2] = 0;
      imdat.data[fix + 3] = 0;
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

// This packs a Point in 16x16 into a single byte
function byteOfSpriteLoc(p: Point): number {
  return (p.x << 4) + p.y
}

// This computes the byte that goes in channel 1 of the four-channel
// pixel for each tile, and is read by the fragment shader in
// world.frag
function byteOfMobile(m: RenderableMobile): number {
  switch (m.t) {
    case 'tile': return byteOfLetter(m.letter);
    case 'resource': return byteOfSpriteLoc(spriteLocOfRes(m.res));
  }
}

function byteOfEmpty(): number {
  return 128 + 32;
}

function freshMobileFlags(oldFlags: number): number {
  return oldFlags & ~(BIT_CONNECTED | BIT_SELECTED); // leave visibility bit alone
}

function processChunkUpdate(cu: ChunkUpdate, oldVec: number[]): number[] {
  const rv = [...oldVec];
  switch (cu.t) {
    case 'bonus': {
      rv[0] = byteOfSpriteLoc(spriteLocOfChunkValue({ t: 'bonus', bonus: cu.bonus }));
      return rv;
    }
    case 'addMobile': {
      rv[1] = byteOfMobile(cu.mobile);
      rv[2] = freshMobileFlags(oldVec[2]);
      return rv;
    }
    case 'removeMobile': {
      rv[1] = byteOfEmpty();
      return rv;
    }
    case 'setBit': {
      rv[2] |= 1 << cu.bit;
      return rv;
    }
    case 'clearBit': {
      rv[2] &= (~(1 << cu.bit));
      return rv;
    }
    case 'restoreMobile': {
      rv[1] = byteOfMobile(cu.mobile);
      return rv;
    }
  }
}

export function updateChunkCache(cache: Overlay<Chunk>, cs: CoreState, p_in_world: Point, cu: ChunkUpdate): void {
  const p_in_chunk = vm2(p_in_world, WORLD_CHUNK_SIZE, (x, wcs) => Math.floor(x / wcs));
  ensureChunk(cache, cs, p_in_chunk);
  const { x, y } = vsub(p_in_world, vmul(p_in_chunk, WORLD_CHUNK_SIZE));
  const chunk = getOverlay(cache, p_in_chunk)!;
  const ix = x + y * chunk.size.x;
  const newVec = processChunkUpdate(cu, [
    chunk.imdat.data[4 * ix + 0],
    chunk.imdat.data[4 * ix + 1],
    chunk.imdat.data[4 * ix + 2],
    chunk.imdat.data[4 * ix + 3]
  ]);
  chunk.imdat.data[4 * ix + 0] = newVec[0];
  chunk.imdat.data[4 * ix + 1] = newVec[1];
  chunk.imdat.data[4 * ix + 2] = newVec[2];
  chunk.imdat.data[4 * ix + 3] = newVec[3];
}

export type ActiveChunkInfo = {
  // list of p_in_chunk of chunks that are at least partly visible
  ps_in_chunk: Point[],
  min_p_in_chunk: Point,
}

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
