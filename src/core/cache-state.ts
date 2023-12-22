import { SE2, translate } from "../util/se2";
import { boundRect } from "../util/util";
import { vadd, vdiag, vscale } from "../util/vutil";
import { Chunk, mkChunk, setChunkData } from "./chunk";
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

function deriveSelectionData(coreState: CoreState): CachedSelectionData | undefined {
  if (coreState.selected == undefined)
    return undefined;

  const points_in_world = overlayPoints(coreState.selected.overlay);
  const bdr = boundRect(points_in_world);
  const chunk = mkChunk(vadd(bdr.sz, vdiag(1)));
  setChunkData(chunk, p => {
    return {
      t: 'tile', tile: {
        letter: 'A'
      }
    }
  });
  return {
    chunk,
    selection_chunk_from_world: translate(vscale(bdr.p, -1)),
  };
}

export function getCachedSelection(coreState: CoreState): CachedSelectionData | undefined {
  const cacheState = getCacheState(coreState);
  if (cacheState.selection.dirty) {
    cacheState.selection.data = deriveSelectionData(coreState);
    cacheState.selection.dirty = false;
  }
  return cacheState.selection.data;
}
