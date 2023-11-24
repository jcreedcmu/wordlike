import { reduce } from "../src/core/reduce";
import { GameState, mkGameState } from "../src/core/state";
import { checkValid, addWorldTiles, withCoreState } from "../src/core/state-helpers";
import { addWorldTile, removeTile, putTileInWorld } from "../src/core/tile-helpers";
import { debugTiles } from "../src/util/debug";
import { produce } from "../src/util/produce";

const SEED = 12345678;

function twoTileState(): GameState {
  let state = mkGameState(SEED, false);
  state = produce(state, s => addWorldTile(s.coreState, { letter: 'A', p_in_world_int: { x: 0, y: 0 }, id: '1' }));
  state = produce(state, s => addWorldTile(s.coreState, { letter: 'B', p_in_world_int: { x: 1, y: 0 }, id: '2' }));
  return state;
}

describe('addWorldTile', () => {
  test('should work correctly', () => {
    const state = twoTileState();
    expect(state.coreState.tile_entities).toEqual({
      '1': {
        id: '1',
        letter: 'A',
        loc: {
          t: 'world',
          p_in_world_int: {
            x: 0,
            y: 0,
          },
        },
      },
      '2': {
        id: '2',
        letter: 'B',
        loc: {
          t: 'world',
          p_in_world_int: {
            x: 1,
            y: 0,
          },
        },
      },
    });

  });

  test('should generate ids correctly', () => {
    let state = mkGameState(SEED, false);
    state = produce(state, s => addWorldTile(s.coreState, { letter: 'A', p_in_world_int: { x: 0, y: 0 } }));
    state = produce(state, s => addWorldTile(s.coreState, { letter: 'B', p_in_world_int: { x: 1, y: 0 } }));
    expect(Object.keys(state.coreState.tile_entities).length).toBe(2);
  });
});

describe('moveTile', () => {
  test('should work correctly', () => {
    let state = twoTileState();
    state = withCoreState(state, cs => putTileInWorld(cs, '2', { x: 3, y: 3 }));
    expect(state.coreState.tile_entities).toEqual({
      '1': {
        id: '1',
        letter: 'A',
        loc: {
          t: 'world',
          p_in_world_int: {
            x: 0,
            y: 0,
          },
        },
      },
      '2': {
        id: '2',
        letter: 'B',
        loc: {
          t: 'world',
          p_in_world_int: {
            x: 3,
            y: 3,
          },
        },
      },
    });

  });
});

describe('removeTile', () => {
  test('should work correctly', () => {
    const state = withCoreState(mkGameState(SEED, false), cs => checkValid(addWorldTiles(cs, debugTiles())));
    const state2 = removeTile(state.coreState, Object.keys(state.coreState.tile_entities)[0]);
    expect(Object.keys(state2.tile_entities).length).toBe(Object.keys(state.coreState.tile_entities).length - 1);
  });
});
