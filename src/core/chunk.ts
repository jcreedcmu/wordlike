import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vm, vm2, vscale, vsub } from "../util/vutil";
import { Bonus } from "./bonus";
import { bonusOfStatePoint } from "./bonus-helpers";
import { Overlay, getOverlay, setOverlay } from "./layer";
import { CoreState } from "./state";
import { TileId } from "./tile-helpers";

export const CHUNK_SIZE = 16;
export type ChunkValue = Bonus | TileId;
export type Chunk = {
  data: ChunkValue[];
}

function getChunk(cs: CoreState, p_in_chunk: Point): Chunk {
  const chunk: Chunk = { data: [] };
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      chunk.data[x + y * CHUNK_SIZE] = bonusOfStatePoint(cs, vm2(p_in_chunk, { x, y }, (c, p) => c * CHUNK_SIZE + p));
    }
  }
  return chunk;
}

export function ensureChunk(cache: Overlay<Chunk>, cs: CoreState, p_in_chunk: Point): Overlay<Chunk> {
  if (getOverlay(cache, p_in_chunk))
    return cache;
  else
    return produce(cache, c => {
      setOverlay(c, p_in_chunk, getChunk(cs, p_in_chunk));
    });
}


export function updateCache(cache: Overlay<Chunk>, cs: CoreState, p_in_world: Point, cval: ChunkValue): Overlay<Chunk> {
  const p_in_chunk = vm(p_in_world, x => Math.floor(x / CHUNK_SIZE));
  if (!getOverlay(cache, p_in_chunk))
    cache = ensureChunk(cache, cs, p_in_chunk);
  const { x, y } = vsub(p_in_world, vscale(p_in_chunk, CHUNK_SIZE));
  return produce(cache, c => {
    getOverlay(cache, p_in_chunk)!.data[x + y * CHUNK_SIZE] = cval;
  });
}
