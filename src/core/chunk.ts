import { spriteLocOfChunkValue } from "../ui/sprite-sheet";
import { world_bds_in_canvas } from "../ui/widget-helpers";
import { ImageData } from "../util/image-data";
import { produce } from "../util/produce";
import { SE2, apply, compose, inverse, scale } from "../util/se2";
import { Point } from "../util/types";
import { vadd, vinv, vm, vm2, vm3, vmul, vsub } from "../util/vutil";
import { Bonus } from "./bonus";
import { getBonusFromLayer } from "./bonus-helpers";
import { Overlay, getOverlay, setOverlay } from "./layer";
import { CoreState } from "./state";
import { RenderableTile } from "./tile-helpers";

export const WORLD_CHUNK_SIZE = { x: 16, y: 16 };

export type ChunkValue = { t: 'bonus', bonus: Bonus } | { t: 'tile', tile: RenderableTile };

export const BIT_SELECTED = 0;
export const BIT_CONNECTED = 1;

export type ChunkUpdate =
  | { t: 'bonus', bonus: Bonus }
  | { t: 'addTile', tile: RenderableTile }
  | { t: 'removeTile' }
  | { t: 'setBit', bit: number }
  | { t: 'clearBit', bit: number }
  | { t: 'restoreTile', tile: RenderableTile }

export type Chunk = {
  size: Point,
  imdat: ImageData,
}

export function setChunkData(chunk: Chunk, kont: (p: Point) => ChunkValue): void {
  const { imdat, size } = chunk;
  for (let x = 0; x < size.x; x++) {
    for (let y = 0; y < size.y; y++) {
      const cval = kont({ x, y });
      const spritePos = spriteLocOfChunkValue(cval);
      const ix = x + y * chunk.size.x;
      const fix = 4 * ix;
      imdat.data[fix + 0] = (spritePos.x << 4) + spritePos.y;
      imdat.data[fix + 1] = 32;
      imdat.data[fix + 2] = 0;
      imdat.data[fix + 3] = 0;
    }
  }
}

function getWorldChunkData(cs: CoreState, p_in_chunk: Point): Chunk {
  const chunk: Chunk = mkChunk(WORLD_CHUNK_SIZE);
  setChunkData(chunk, (p_in_local_chunk) => ({
    t: 'bonus',
    bonus: getBonusFromLayer(cs, vm3(p_in_chunk, p_in_local_chunk, chunk.size, (c, p, s) => c * s + p))
  }));
  return chunk;
}

export function ensureChunk(cache: Overlay<Chunk>, cs: CoreState, p_in_chunk: Point): void {
  if (!getOverlay(cache, p_in_chunk))
    setOverlay(cache, p_in_chunk, getWorldChunkData(cs, p_in_chunk));
}

export function getChunk(cache: Overlay<Chunk>, p_in_chunk: Point): Chunk | undefined {
  return getOverlay(cache, p_in_chunk);
}

function processChunkUpdate(cu: ChunkUpdate, oldVec: number[]): number[] {
  const rv = [...oldVec];
  switch (cu.t) {
    case 'bonus': {
      const spritePos = spriteLocOfChunkValue({ t: 'bonus', bonus: cu.bonus });
      rv[0] = (spritePos.x << 4) + spritePos.y;
      return rv;
    }
    case 'addTile': {
      rv[1] = cu.tile.letter.charCodeAt(0) - 97;
      rv[2] = 0;
      return rv;
    }
    case 'removeTile': {
      rv[1] = 32;
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
    case 'restoreTile': {
      const spritePos = spriteLocOfChunkValue({ t: 'tile', tile: cu.tile });
      rv[1] = cu.tile.letter.charCodeAt(0) - 97;
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

// returns
export function activeChunks(canvas_from_world: SE2): ActiveChunkInfo {
  const chunk_from_canvas = compose(scale(vinv(WORLD_CHUNK_SIZE)), inverse(canvas_from_world));
  const top_left_in_canvas = world_bds_in_canvas.p;
  const bot_right_in_canvas = vadd(world_bds_in_canvas.p, world_bds_in_canvas.sz);
  const top_left_in_chunk = vm(apply(chunk_from_canvas, top_left_in_canvas), Math.floor);
  const bot_right_in_chunk = vm(apply(chunk_from_canvas, bot_right_in_canvas), Math.floor);
  const chunks: Point[] = [];
  let min_p_in_chunk: Point = { x: Infinity, y: Infinity };
  for (let x = top_left_in_chunk.x; x <= bot_right_in_chunk.x; x++) {
    for (let y = top_left_in_chunk.y; y <= bot_right_in_chunk.y; y++) {
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
