import { GameLowAction } from '../src/core/action';
import { BIT_CONNECTED, BIT_SELECTED } from '../src/core/chunk';
import { mkOverlayFrom } from '../src/core/layer';
import { resolveGameLowActions } from '../src/core/low-actions';
import { mkGameState } from '../src/core/mkGameState';
import { GameState } from '../src/core/state';
import { addWorldTile } from '../src/core/tile-helpers';
import { produce } from '../src/util/produce';

const SEED = 12345678;

function threeTileState(): GameState {
  let state = mkGameState(SEED, false, SEED);
  state = produce(state, s => addWorldTile(s.coreState, { letter: { t: 'single', letter: 'A' }, p_in_world_int: { x: 0, y: 0 }, id: 1 }));
  state = produce(state, s => addWorldTile(s.coreState, { letter: { t: 'single', letter: 'B' }, p_in_world_int: { x: 1, y: 0 }, id: 2 }));
  state = produce(state, s => addWorldTile(s.coreState, { letter: { t: 'single', letter: 'C' }, p_in_world_int: { x: 2, y: 0 }, id: 3 }));
  return state;
}

describe('kill', () => {
  test('should generate appropriate cache changes', () => {
    let state = threeTileState();
    state = produce(state, s => { s.coreState.slowState.inventory.dynamites = 100; });

    state = resolveGameLowActions(state, [{
      t: 'setSelected', sel: {
        overlay: mkOverlayFrom([{ x: 0, y: 0 }, { x: 1, y: 0 }]),
        selectedIds: [1, 2]
      }
    }]);
    state = resolveGameLowActions(state, [{ t: 'popCacheUpdateQueue', n: state.coreState._cacheUpdateQueue.length }]);
    const action: GameLowAction = {
      t: 'mouseDownIntent', intent: { t: 'kill', radius: 0 }, wp: {
        t: 'world',
        p_in_local: { x: 2.4166246536530487, y: 0.7916585071144366 },
        p_in_canvas: { x: 604, y: 398 },
        local_from_canvas: {
          scale: { x: 0.020832899314597614, y: 0.020832899314597614 },
          translate: { x: -10.16644653236391, y: -7.4998354200954145 }
        }
      }
    };

    expect(state.coreState.selected?.selectedIds).toEqual([1, 2]);

    state = resolveGameLowActions(state, [action]);
    expect(state.coreState._cacheUpdateQueue).toEqual(
      [
        {
          chunkUpdate: { t: 'clearBit', bit: BIT_SELECTED },
          p_in_world_int: { x: 0, y: 0 },
        },
        {
          chunkUpdate: { t: 'clearBit', bit: BIT_SELECTED },
          p_in_world_int: { x: 1, y: 0 },
        },
        {
          chunkUpdate: { t: 'removeMobile', },
          p_in_world_int: { x: 2, y: 0 },
        },
        {
          chunkUpdate: { t: 'setBit', bit: BIT_CONNECTED },
          p_in_world_int: { x: 0, y: 0 },
        },
        {
          chunkUpdate: { t: 'setBit', bit: BIT_CONNECTED },
          p_in_world_int: { x: 1, y: 0 },
        },
      ]

    );


  });
});
