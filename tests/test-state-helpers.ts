import { mkGameState } from "../src/core/mkGameState";
import { GameState } from "../src/core/state";
import { addWorldTiles, checkValid, withCoreState } from "../src/core/state-helpers";
import { MobileEntity } from '../src/core/state-types';
import { addWorldTileWithId, addWorldTile, putMobileInWorld, removeMobile } from "../src/core/tile-helpers";
import { debugTiles } from "../src/util/debugTiles";

const SEED = 12345678;

function twoTileState(): GameState {
  return withCoreState(mkGameState(SEED, false, SEED), cs => {
    cs = addWorldTileWithId(cs, { letter: { t: 'single', letter: 'A' }, p_in_world_int: { x: 0, y: 0 } }, 1);
    cs = addWorldTileWithId(cs, { letter: { t: 'single', letter: 'B' }, p_in_world_int: { x: 1, y: 0 } }, 2);
    return cs;
  });
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
    const state = withCoreState(mkGameState(SEED, false, SEED), cs => {
      cs = addWorldTile(cs, { letter: { t: 'single', letter: 'A' }, p_in_world_int: { x: 0, y: 0 } });
      cs = addWorldTile(cs, { letter: { t: 'single', letter: 'B' }, p_in_world_int: { x: 1, y: 0 } });
      return cs;
    });
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
