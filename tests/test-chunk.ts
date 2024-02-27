// XXX fix this test to be meaningful

import { mkGameState } from "../src/core/mkGameState";
import { GameState } from "../src/core/state";
import { addHandTileEntity, addWorldTile, putMobileInWorld } from "../src/core/tile-helpers";
import { produce } from "../src/util/produce";

const SEED = 12345678;

function oneTileState(): GameState {
  let state = mkGameState(SEED, false, SEED);
  state = produce(state, s => { addHandTileEntity(s.coreState, { t: 'single', letter: 'a' }, 0, 1); });
  return state;
}

describe('putTileInWorld', () => {
  test('should update cache correctly', () => {
    let state = oneTileState().coreState;
    const p_in_world_int = { x: 1, y: 0 };
    state = produce(state, s => { putMobileInWorld(s, 1, p_in_world_int); });
    // const chunk = getOverlay(state._cachedTileChunkMap, { x: 0, y: 0 })!;
    // const ix = 4 * (p_in_world_int.y * WORLD_CHUNK_SIZE.x + p_in_world_int.x);
    // expect(chunk.imdat.data[ix + 1]).toEqual(0); // a
  });
});

describe('addWorldTile', () => {
  test('should update cache correctly', () => {
    let state = oneTileState().coreState;
    const p_in_world_int = { x: 3, y: 5 };
    state = produce(state, s => { addWorldTile(s, { letter: { t: 'single', letter: 'x' }, p_in_world_int }); });
    // const chunk = getOverlay(state._cachedTileChunkMap, { x: 0, y: 0 })!;
    // const ix = 4 * (p_in_world_int.y * WORLD_CHUNK_SIZE.x + p_in_world_int.x);
    // expect(chunk.imdat.data[ix + 1]).toEqual(23); // x
  });
});
