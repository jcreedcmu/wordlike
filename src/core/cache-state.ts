import { SE2, translate } from "../util/se2";
import { vscale } from "../util/vutil";
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
export function getCacheState(gameState: GameState): CacheState {
  return cacheState;
}

function deriveSelectionData(coreState: CoreState): CachedSelectionData | undefined {
  if (coreState.selected == undefined)
    return undefined;

  const points_in_world = overlayPoints(coreState.selected.overlay);
  const min = {
    x: Math.min(...points_in_world.map(({ x, y }) => x)),
    y: Math.min(...points_in_world.map(({ x, y }) => y))
  };
  return {
    chunk: mkChunk(),
    selection_chunk_from_world: translate(vscale(min, -1)),
  };
}

export function getCachedSelection(gameState: GameState): CachedSelectionData | undefined {
  const cacheState = getCacheState(gameState);
  if (cacheState.selection.dirty) {
    cacheState.selection.data = deriveSelectionData(gameState.coreState);
    cacheState.selection.dirty = false;
  }
  return cacheState.selection.data;
}
