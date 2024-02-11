import { SE2, translate } from "../util/se2";
import { boundRect } from "../util/util";
import { vadd, vdiag, vscale } from "../util/vutil";
import { Chunk, mkChunk } from "./chunk";
import { overlayForEach, overlayPoints } from "./layer";
import { CoreState, GameState } from "./state";

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
export function getCacheState(coreState: CoreState): CacheState {
  return cacheState;
}
