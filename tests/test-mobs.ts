import { addMob, advanceMob } from "../src/core/mobs";
import { GameState, mkGameState } from "../src/core/state";
import { withCoreState } from "../src/core/state-helpers";
import { produce } from "../src/util/produce";

const SEED = 12345678;

function testState(): GameState {
  let state = mkGameState(SEED, false, SEED);
  state = withCoreState(state, cs => addMob(cs, { t: 'snail', orientation: 'E', p_in_world_int: { x: 0, y: 0 }, ticks: 0 }));
  return state;
}

describe('advanceMob', () => {
  test('should work', () => {

    let cs = testState().coreState;
    const state1 = advanceMob(cs, cs.mobsState.mobs[0]);
    expect(state1.ticks).toEqual(1);

    cs = produce(cs, s => { s.mobsState.mobs[0] = state1; });
    const state2 = advanceMob(cs, cs.mobsState.mobs[0]);
    expect(state2.ticks).toEqual(2);

  });
});
