import { mapval } from "../util/util";
import { MobState } from "./mobs";
import { MobsState } from "./state-types";
import { MobileId } from './basic-types';

export function mobsMap<T>(state: MobsState, f: (mob: MobState, id: MobileId) => T): T[] {
  return Object.keys(state.mobs).map(key => f(state.mobs[key], state.mobs[key].id));
}

export function mobsMapVal(state: MobsState, k: (mob: MobState, id: string) => MobState): MobsState {
  return { mobs: mapval(state.mobs, k) };
}
