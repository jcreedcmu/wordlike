import { AbstractLetter } from "../src/core/letters";
import { mkGameState } from "../src/core/mkGameState";
import { CoreState, GameState } from "../src/core/state";
import { withCoreState } from "../src/core/state-helpers";
import { MobileId } from '../src/core/basic-types';
import { addWorldTileWithId, addHandTileEntityWithId, getMobileLoc, putMobileInWorld } from "../src/core/tile-helpers";

const SEED = 12345678;

function addHand(state: CoreState, letter: AbstractLetter, index: number, id: MobileId): CoreState {
  return addHandTileEntityWithId(state, letter, index, id).cs;
}

function testState(): GameState {
  return withCoreState(mkGameState(SEED, false, SEED), cs => {
    cs = addWorldTileWithId(cs, { letter: { t: 'single', letter: 'A' }, p_in_world_int: { x: 0, y: 0 } }, 1);
    cs = addWorldTileWithId(cs, { letter: { t: 'single', letter: 'B' }, p_in_world_int: { x: 1, y: 0 } }, 2);
    cs = addHand(cs, { t: 'single', letter: 'C' }, 0, 3);
    cs = addHand(cs, { t: 'single', letter: 'D' }, 1, 4);
    cs = addHand(cs, { t: 'single', letter: 'E' }, 2, 5);
    return cs;
  });
}

describe('tile operations', () => {
  test('should do putInWorld correctly', () => {
    const state0 = testState().coreState;
    const state1 = putMobileInWorld(state0, 4, { x: 2, y: 0 });
    expect(getMobileLoc(state1, 3)).toEqual({ t: 'hand', index: 0 });
    expect(getMobileLoc(state1, 5)).toEqual({ t: 'hand', index: 1 });
  });

});
