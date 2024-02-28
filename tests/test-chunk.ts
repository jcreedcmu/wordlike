// XXX fix this test to be meaningful
import { AbstractLetter } from "../src/core/letters";
import { mkGameState } from "../src/core/mkGameState";
import { CoreState, GameState } from "../src/core/state";
import { withCoreState } from "../src/core/state-helpers";
import { MobileId } from "../src/core/state-types";
import { addHandTileEntityWithId, addWorldTile, putMobileInWorld } from "../src/core/tile-helpers";
import { produce } from "../src/util/produce";

const SEED = 12345678;

function addHand(state: CoreState, letter: AbstractLetter, index: number, id: MobileId): CoreState {
  return addHandTileEntityWithId(state, letter, index, id).cs;
}

function oneTileState(): GameState {
  return withCoreState(mkGameState(SEED, false, SEED), cs => {
    cs = addHand(cs, { t: 'single', letter: 'A' }, 0, 1);
    return cs;
  });
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
    state = addWorldTile(state, { letter: { t: 'single', letter: 'x' }, p_in_world_int });
    // const chunk = getOverlay(state._cachedTileChunkMap, { x: 0, y: 0 })!;
    // const ix = 4 * (p_in_world_int.y * WORLD_CHUNK_SIZE.x + p_in_world_int.x);
    // expect(chunk.imdat.data[ix + 1]).toEqual(23); // x
  });
});
