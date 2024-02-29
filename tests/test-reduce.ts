import { GameLowAction } from '../src/core/action';
import { BIT_CONNECTED, BIT_SELECTED } from '../src/core/chunk';
import { mkOverlayFrom } from '../src/core/layer';
import { resolveGameLowActionsIgnoreEffects } from '../src/core/low-actions';
import { mkGameState } from '../src/core/mkGameState';
import { GameState } from '../src/core/state';
import { withCoreState } from '../src/core/state-helpers';
import { addWorldTileWithId } from '../src/core/tile-helpers';
import { produce } from '../src/util/produce';

const SEED = 12345678;

function threeTileState(): GameState {
  return withCoreState(mkGameState(SEED, false, SEED), cs => {
    cs = addWorldTileWithId(cs, { letter: { t: 'single', letter: 'A' }, p_in_world_int: { x: 0, y: 0 } }, 1);
    cs = addWorldTileWithId(cs, { letter: { t: 'single', letter: 'A' }, p_in_world_int: { x: 1, y: 0 } }, 2);
    cs = addWorldTileWithId(cs, { letter: { t: 'single', letter: 'A' }, p_in_world_int: { x: 2, y: 0 } }, 3);
    return cs;
  });
}

describe('kill', () => {
  test('should generate appropriate cache changes', () => {
    let state = threeTileState();
    state = produce(state, s => { s.coreState.slowState.inventory.dynamites = 100; });

    state = resolveGameLowActionsIgnoreEffects(state, [{
      t: 'setSelected', sel: {
        overlay: mkOverlayFrom([{ x: 0, y: 0 }, { x: 1, y: 0 }]),
        selectedIds: [1, 2]
      }
    }]);
    state = resolveGameLowActionsIgnoreEffects(state, [{ t: 'popCacheUpdateQueue', n: state.coreState._cacheUpdateQueue.length }]);
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

    state = resolveGameLowActionsIgnoreEffects(state, [action]);
    expect(state.coreState._cacheUpdateQueue).toEqual(
      [
        {
          t: 'chunkUpdate',
          chunkUpdate: { t: 'clearBit', bit: BIT_SELECTED },
          p_in_world_int: { x: 0, y: 0 },
        },
        {
          t: 'chunkUpdate',
          chunkUpdate: { t: 'clearBit', bit: BIT_SELECTED },
          p_in_world_int: { x: 1, y: 0 },
        },
        {
          t: 'chunkUpdate',
          chunkUpdate: { t: 'removeMobile', },
          p_in_world_int: { x: 2, y: 0 },
        },
        {
          t: 'chunkUpdate',
          chunkUpdate: { t: 'setBit', bit: BIT_CONNECTED },
          p_in_world_int: { x: 0, y: 0 },
        },
        {
          t: 'chunkUpdate',
          chunkUpdate: { t: 'setBit', bit: BIT_CONNECTED },
          p_in_world_int: { x: 1, y: 0 },
        },
      ]

    );


  });
});
