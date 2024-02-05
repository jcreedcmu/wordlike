import { GameState, mkGameState } from "../src/core/state";
import { addHandTileEntity, addWorldTile, getTileLoc, putTileInWorld } from "../src/core/tile-helpers";
import { produce } from "../src/util/produce";
import { Location } from '../src/core/state';

const SEED = 12345678;

function testState(): GameState {
  let state = mkGameState(SEED, false, SEED);
  state = produce(state, s => { addWorldTile(s.coreState, { letter: 'A', p_in_world_int: { x: 0, y: 0 }, id: '1' }); });
  state = produce(state, s => { addWorldTile(s.coreState, { letter: 'B', p_in_world_int: { x: 1, y: 0 }, id: '2' }); });
  state = produce(state, s => { addHandTileEntity(s.coreState, 'C', 0, '3'); });
  state = produce(state, s => { addHandTileEntity(s.coreState, 'D', 1, '4'); });
  state = produce(state, s => { addHandTileEntity(s.coreState, 'E', 2, '5'); });
  return state;
}

describe('tile operations', () => {
  test('should do putInWorld correctly', () => {
    const state0 = testState().coreState;
    const state1 = putTileInWorld(state0, '4', { x: 2, y: 0 });
    expect(getTileLoc(state1, '3')).toEqual({ t: 'hand', index: 0 });
    expect(getTileLoc(state1, '5')).toEqual({ t: 'hand', index: 1 });
  });

});
