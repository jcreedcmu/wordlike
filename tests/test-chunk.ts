import { readChunkCache } from "../src/core/chunk";
import { GameState, mkGameState } from "../src/core/state";
import { addHandTile, addWorldTile, putTileInWorld } from "../src/core/tile-helpers";
import { produce } from "../src/util/produce";

const SEED = 12345678;

function oneTileState(): GameState {
  let state = mkGameState(SEED, false, SEED);
  state = produce(state, s => addHandTile(s.coreState, { letter: 'A', p_in_world_int: { x: 0, y: 0 }, id: '1' }));
  return state;
}

describe('putTileInWorld', () => {
  test('should update cache correctly', () => {
    let state = oneTileState().coreState;
    state = produce(state, s => putTileInWorld(s, '1', { x: 0, y: 0 }));
    expect(readChunkCache(state._cachedTileChunkMap, state, { x: 0, y: 0 })).toEqual({ t: 'tile', tile: { letter: 'A' } });
  });
});
