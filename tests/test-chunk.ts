// XXX fix this test to be meaningful

import { getOverlay } from "../src/core/layer";
import { GameState, mkGameState } from "../src/core/state";
import { addHandTile, addWorldTile, putTileInWorld } from "../src/core/tile-helpers";
import { produce } from "../src/util/produce";

const SEED = 12345678;

function oneTileState(): GameState {
  let state = mkGameState(SEED, false, SEED);
  state = produce(state, s => addHandTile(s.coreState, { letter: 'a', p_in_world_int: { x: 0, y: 0 }, id: '1' }));
  return state;
}

describe('putTileInWorld', () => {
  test('should update cache correctly', () => {
    let state = oneTileState().coreState;
    state = produce(state, s => putTileInWorld(s, '1', { x: 0, y: 0 }));
    const chunk = getOverlay(state._cachedTileChunkMap, { x: 0, y: 0 })!;
    expect(chunk.imdat.data[0]).toEqual(14);
    expect(chunk.imdat.data[1]).toEqual(0);
  });
});

describe('addWorldTile', () => {
  test('should update cache correctly', () => {
    let state = oneTileState().coreState;
    state = produce(state, s => addWorldTile(s, { letter: 'x', p_in_world_int: { x: 3, y: 5 } }));
    const chunk = getOverlay(state._cachedTileChunkMap, { x: 0, y: 0 })!;
    expect(chunk.imdat.data[4 * (5 * 16 + 3) + 0]).toEqual(15);
    expect(chunk.imdat.data[4 * (5 * 16 + 3) + 1]).toEqual(7);
  });
});
