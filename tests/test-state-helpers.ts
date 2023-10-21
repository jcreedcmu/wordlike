import { reduce } from "../src/core/reduce";
import { GameState, mkGameState } from "../src/core/state";
import { addWorldTile, checkValid, removeTile, addWorldTiles, putTileInWorld } from "../src/core/state-helpers";
import { debugTiles } from "../src/util/debug";
import { produce } from "../src/util/produce";

function twoTileState(): GameState {
  let state = mkGameState();
  state = produce(state, s => addWorldTile(s, { letter: 'A', p_in_world_int: { x: 0, y: 0 }, id: '1' }));
  state = produce(state, s => addWorldTile(s, { letter: 'B', p_in_world_int: { x: 1, y: 0 }, id: '2' }));
  return state;
}

describe('addWorldTile', () => {
  test('should work correctly', () => {
    const state = twoTileState();
    expect(state.tile_entities).toEqual({
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
    let state = mkGameState();
    state = produce(state, s => addWorldTile(s, { letter: 'A', p_in_world_int: { x: 0, y: 0 } }));
    state = produce(state, s => addWorldTile(s, { letter: 'B', p_in_world_int: { x: 1, y: 0 } }));
    expect(Object.keys(state.tile_entities).length).toBe(2);
  });
});

describe('moveTile', () => {
  test('should work correctly', () => {
    let state = twoTileState();
    state = putTileInWorld(state, '2', { x: 3, y: 3 });
    expect(state.tile_entities).toEqual({
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
    const state = checkValid(addWorldTiles(mkGameState(), debugTiles()));
    const state2 = removeTile(state, Object.keys(state.tile_entities)[0]);
    expect(Object.keys(state2.tile_entities).length).toBe(Object.keys(state.tile_entities).length - 1);
  });
});
