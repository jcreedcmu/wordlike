import { DEBUG } from "../util/debug";
import { produce } from "../util/produce";
import { Point } from "../util/types";
import { Bonus, Scoring, getBonusLayer } from "./bonus";
import { mkChunkUpdate } from "./chunk";
import { getOverlayLayer, setOverlay } from "./layer";
import { incrementScore } from "./scoring";
import { CacheUpdate, CoreState, MoveMobileNoId } from "./state";
import { mkActiveWordBonus } from "./word-bonus";

// XXX name?
export function getBonusFromLayer(cs: CoreState, p: Point): Bonus {
  return getOverlayLayer(cs.bonusOverlay, getBonusLayer(cs.bonusLayerSeed), p);
}

export function updateBonusLayer(state: CoreState, p_in_world_int: Point, bonus: Bonus): CoreState {
  const newState = produce(state, cs => {
    setOverlay(cs.bonusOverlay, p_in_world_int, bonus);
  });

  const cacheUpdate: CacheUpdate = mkChunkUpdate(p_in_world_int, { t: 'bonus', bonus });

  return produce(newState, cs => {
    cs._cacheUpdateQueue.push(cacheUpdate);
  });
}

export function resolveScoring(state: CoreState, scoring: Scoring): CoreState {
  const bonus = scoring.bonus;
  switch (bonus.t) {
    case 'tree': return produce(state, s => { s.slowState.resource.wood++; });
    case 'bomb': return produce(state, s => { s.slowState.inventory.bombs++; });
    case 'required': return produce(state, s => { incrementScore(s, 10); });
    case 'vowel': return produce(state, s => { s.slowState.inventory.vowels += 5; });
    case 'consonant': return produce(state, s => { s.slowState.inventory.consonants += 5; });
    case 'copy': return produce(state, s => { s.slowState.inventory.copies += 3; });
    case 'word': {
      const { state: state1, wordBonus } = mkActiveWordBonus(state, scoring.p_in_world_int);
      return produce(state1, s => {
        s.wordBonusState.active.push(wordBonus);
      });
    }
    case 'wordAchieved': return produce(state, s => { incrementScore(s, bonus.word.length * 10 + 10); });
    case 'time': return produce(state, s => { s.slowState.inventory.times++; });
    case 'dynamite': return produce(state, s => { s.slowState.inventory.dynamites++; });
    case 'mountain': return produce(state, s => { s.slowState.resource.stone++ });
    case 'magnifying-glass': return produce(state, s => { s.slowState.inventory.glasses++ });
  }
}

export function isBlocking(move: MoveMobileNoId, bonus: Bonus): boolean {
  if (bonus.t == 'empty')
    return false;
  if (bonus.t == 'required') {
    return !((move.mobile.t == 'tile' && move.mobile.letter == bonus.letter) || DEBUG.allWords);
  }
  return true;
}
