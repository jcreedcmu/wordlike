import { produce } from "../util/produce";
import { CoreState } from "./state";
import { MobileId } from "./state-types";

export function withFreshId<T>(state: CoreState, k: (id: MobileId, cs: CoreState) => T): T {
  const id = state.idCounter + 1;
  if (id >= 32768)
    throw new Error("Too many ids! WebGL backend expects them to fit in 16 bits");
  return k(id, produce(state, cs => { cs.idCounter = id; }));
}
