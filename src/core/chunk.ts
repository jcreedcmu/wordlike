import { spriteLocOfBonus, spriteLocOfChunkValue } from "../ui/sprite-sheet";
import { world_bds_in_canvas } from "../ui/widget-helpers";
import { produce } from "../util/produce";
import { SE2, apply, compose, inverse, scale } from "../util/se2";
import { Point } from "../util/types";
import { vadd, vdiag, vm, vm2, vscale, vsub } from "../util/vutil";
import { Bonus } from "./bonus";
import { getBonusFromLayer } from "./bonus-helpers";
import { Overlay, getOverlay, setOverlay } from "./layer";
import { CoreState } from "./state";
import { RenderableTile, TileId } from "./tile-helpers";

export const CHUNK_SIZE = 16;

export type ChunkValue = { t: 'bonus', bonus: Bonus } | { t: 'tile', tile: RenderableTile };

export type Chunk = {
  data: ChunkValue[];
  spritePos: Point[];
}

function getChunkData(cs: CoreState, p_in_chunk: Point): Chunk {
  const chunk: Chunk = { data: [], spritePos: [] };
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      const bonus = getBonusFromLayer(cs, vm2(p_in_chunk, { x, y }, (c, p) => c * CHUNK_SIZE + p));
      chunk.data[x + y * CHUNK_SIZE] = { t: 'bonus', bonus };
      chunk.spritePos[x + y * CHUNK_SIZE] = spriteLocOfBonus(bonus);
    }
  }
  return chunk;
}

export function ensureChunk(cache: Overlay<Chunk>, cs: CoreState, p_in_chunk: Point): Overlay<Chunk> {
  if (getOverlay(cache, p_in_chunk))
    return cache;
  else
    return produce(cache, c => {
      setOverlay(c, p_in_chunk, getChunkData(cs, p_in_chunk));
    });
}

export function getChunk(cache: Overlay<Chunk>, p_in_chunk: Point): Chunk | undefined {
  return getOverlay(cache, p_in_chunk);
}

// I don't currently expect to use this for any reason other than debugging.
// gl-render.ts expects the chunk cache to be already up-to-date
// This also doesn't statefully update the cache if we're reading chunks that don't exist yet,
// and so is bad for performance.
export function readChunkCache(cache: Overlay<Chunk>, cs: CoreState, p_in_world: Point): ChunkValue {
  const p_in_chunk = vm(p_in_world, x => Math.floor(x / CHUNK_SIZE));
  const { x, y } = vsub(p_in_world, vscale(p_in_chunk, CHUNK_SIZE));
  if (!getOverlay(cache, p_in_chunk)) {
    cache = ensureChunk(cache, cs, p_in_chunk);
  }
  const chunk = getOverlay(cache, p_in_chunk)!;
  return chunk.data[x + y * CHUNK_SIZE];
}

export function updateChunkCache(cache: Overlay<Chunk>, cs: CoreState, p_in_world: Point, cval: ChunkValue): Overlay<Chunk> {
  const spritePos = spriteLocOfChunkValue(cval);
  const p_in_chunk = vm(p_in_world, x => Math.floor(x / CHUNK_SIZE));
  if (!getOverlay(cache, p_in_chunk))
    cache = ensureChunk(cache, cs, p_in_chunk);
  const { x, y } = vsub(p_in_world, vscale(p_in_chunk, CHUNK_SIZE));
  return produce(cache, c => {
    const chunk = getOverlay(c, p_in_chunk)!;
    chunk.data[x + y * CHUNK_SIZE] = cval;
    chunk.spritePos[x + y * CHUNK_SIZE] = spritePos;
  });
}

// returns list of p_in_chunk of chunks that are at least partly visible
export function activeChunks(canvas_from_world: SE2): Point[] {
  const chunk_from_canvas = compose(scale(vdiag(1 / CHUNK_SIZE)), inverse(canvas_from_world));
  const top_left_in_canvas = world_bds_in_canvas.p;
  const bot_right_in_canvas = vadd(world_bds_in_canvas.p, world_bds_in_canvas.sz);
  const top_left_in_chunk = vm(apply(chunk_from_canvas, top_left_in_canvas), Math.floor);
  const bot_right_in_chunk = vm(apply(chunk_from_canvas, bot_right_in_canvas), Math.ceil);
  const chunks: Point[] = [];
  for (let x = top_left_in_chunk.x; x < bot_right_in_chunk.x; x++) {
    for (let y = top_left_in_chunk.y; y < bot_right_in_chunk.y; y++) {
      chunks.push({ x, y });
    }
  }
  return chunks;
}

export function mkChunk(): Chunk {
  return {
    data: [],
    spritePos: [],
  };
}
