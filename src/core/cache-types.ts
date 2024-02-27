import { SE2 } from '../util/se2';
import { Point } from '../util/types';
import { Chunk, ChunkUpdate } from './chunk';

export type CacheState = {
  selection: CachedSelection,
}

export type CachedSelectionData = {
  selection_chunk_from_world: SE2,
  chunk: Chunk,
}

export type CachedSelection = {
  data: CachedSelectionData | undefined,
  dirty: boolean,
}

export type CacheUpdate = { t: 'chunkUpdate'; p_in_world_int: Point; chunkUpdate: ChunkUpdate; };

export function mkChunkUpdate(p_in_world_int: Point, cu: ChunkUpdate): CacheUpdate {
  return { t: 'chunkUpdate', chunkUpdate: cu, p_in_world_int };
}
