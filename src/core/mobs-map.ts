import { mapval } from "../util/util";
import { MobState } from "./mobs";
import { MobsState } from "./state-types";

export function mobsMap<T>(state: MobsState, k: (mob: MobState, id: string) => T): T[] {
  return Object.keys(state.mobs).map(id => k(state.mobs[id], id));
}

export function mobsMapVal(state: MobsState, k: (mob: MobState, id: string) => MobState): MobsState {
  return { mobs: mapval(state.mobs, k) };
}
