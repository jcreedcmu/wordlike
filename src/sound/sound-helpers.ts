import { SoundEffect } from "../core/effect-types";
import { CoreState } from "../core/state";
import { produce } from "../util/produce";

export function makeSound(cs: CoreState, sound: SoundEffect): CoreState {
  return produce(cs, s => {
    s.soundEffects.push(sound);
  });
}
