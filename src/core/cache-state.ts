import { CacheState } from "./cache-types";
import { CoreState } from "./state";

// XXX global
const cacheState: CacheState = {
  selection: { data: undefined, dirty: false },
}

// gets mutable handle to cache state
export function getCacheState(_coreState: CoreState): CacheState {
  return cacheState;
}
