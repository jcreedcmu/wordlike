import { produce } from "../util/produce";
import { CoreState } from "./state";
import { MobileId } from './basic-types';

export function freshId(state: CoreState): { id: MobileId, cs: CoreState } {
  const id = state.idCounter + 1;
  if (id >= 32768)
    throw new Error("Too many ids! WebGL backend expects them to fit in 16 bits");
  return { id, cs: produce(state, cs => { cs.idCounter = id; }) };
}
