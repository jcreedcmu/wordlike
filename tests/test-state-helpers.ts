import { GameState, MobileEntity, mkGameState } from "../src/core/state";
import { checkValid, addWorldTiles, withCoreState } from "../src/core/state-helpers";
import { addWorldTile, removeMobile, putMobileInWorld } from "../src/core/tile-helpers";
import { debugTiles } from "../src/util/debug";
import { produce } from "../src/util/produce";

const SEED = 12345678;

function twoTileState(): GameState {
  let state = mkGameState(SEED, false, SEED);
  state = produce(state, s => addWorldTile(s.coreState, { letter: { t: 'single', letter: 'A' }, p_in_world_int: { x: 0, y: 0 }, id: 1 }));
  state = produce(state, s => addWorldTile(s.coreState, { letter: { t: 'single', letter: 'B' }, p_in_world_int: { x: 1, y: 0 }, id: 2 }));
  return state;
}

describe('addWorldTile', () => {
  test('should work correctly', () => {
    const state = twoTileState();
    expect(state.coreState.mobile_entities).toEqual({
      '1': {
        t: 'tile',
        id: 1,
        letter: { t: 'single', letter: 'A' },
        loc: {
          t: 'world',
          p_in_world_int: {
            x: 0,
            y: 0,
          },
        },
      },
      '2': {
        t: 'tile',
        id: 2,
        letter: { t: 'single', letter: 'B' },
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
    let state = mkGameState(SEED, false, SEED);
    state = produce(state, s => addWorldTile(s.coreState, { letter: { t: 'single', letter: 'A' }, p_in_world_int: { x: 0, y: 0 } }));
    state = produce(state, s => addWorldTile(s.coreState, { letter: { t: 'single', letter: 'B' }, p_in_world_int: { x: 1, y: 0 } }));
    expect(Object.keys(state.coreState.mobile_entities).length).toBe(2);
  });
});

describe('moveTile', () => {
  test('should work correctly', () => {
    let state = twoTileState();
    state = withCoreState(state, cs => putMobileInWorld(cs, 2, { x: 3, y: 3 }));
    const expected: Record<string, MobileEntity> = {
      '1': {
        t: 'tile',
        id: 1,
        letter: { t: 'single', letter: 'A' },
        loc: {
          t: 'world',
          p_in_world_int: {
            x: 0,
            y: 0,
          },
        },
      },
      '2': {
        t: 'tile',
        id: 2,
        letter: { t: 'single', letter: 'B' },
        loc: {
          t: 'world',
          p_in_world_int: {
            x: 3,
            y: 3,
          },
        },
      },
    };
    expect(state.coreState.mobile_entities).toEqual(expected);
  });
});

describe('removeTile', () => {
  test('should work correctly', () => {
    const state = withCoreState(mkGameState(SEED, false, SEED), cs => checkValid(addWorldTiles(cs, debugTiles())));
    const state2 = removeMobile(state.coreState, Object.values(state.coreState.mobile_entities)[0].id);
    expect(Object.keys(state2.mobile_entities).length).toBe(Object.keys(state.coreState.mobile_entities).length - 1);
  });
});
