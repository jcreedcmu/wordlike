import { SE2 } from "../util/se2";
import { Chunk } from "./chunk";
import { CoreState } from "./state";

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

// XXX global
const cacheState: CacheState = {
  selection: { data: undefined, dirty: false },
}

// gets mutable handle to cache state
export function getCacheState(_coreState: CoreState): CacheState {
  return cacheState;
}
