import { mkGameState } from "../src/core/mkGameState";
import { addMobWithId, advanceMob } from "../src/core/mob-helpers";
import { GameState } from "../src/core/state";
import { withCoreState } from "../src/core/state-helpers";
import { produce } from "../src/util/produce";

const SEED = 12345678;

function testState(): GameState {
  const id = 'idmob';
  let state = mkGameState(SEED, false, SEED);
  state = withCoreState(state, cs => addMobWithId(cs, { t: 'snail', orientation: 'E', p_in_world_int: { x: 0, y: 0 }, ticks: 0 }, id));
  return state;
}

describe('advanceMob', () => {
  test('should work', () => {

    let cs = testState().coreState;
    const state1 = advanceMob(cs, cs.mobsState.mobs['idmob']);
    expect(state1.ticks).toEqual(1);

    cs = produce(cs, s => { s.mobsState.mobs['idmob'] = state1; });
    const state2 = advanceMob(cs, cs.mobsState.mobs['idmob']);
    expect(state2.ticks).toEqual(2);

  });
});
