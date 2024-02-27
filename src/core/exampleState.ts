import { PANIC_INTERVAL_MS } from '../core/clock';
import { mkGridOf } from '../core/grid';
import { ensureTileId } from "../core/id-helpers";
import { mkOverlay } from '../core/layer';
import { AbstractLetter } from '../core/letters';
import { mkMobsState } from '../core/mobs';
import { GameState, TileOptionalId } from '../core/state';
import { addHandTileEntities, addWorldTiles, checkValid, resolveValid, withCoreState } from '../core/state-helpers';
import { produce } from '../util/produce';
import * as SE1 from '../util/se1';

export function exampleState(): GameState {
  const state: GameState = {
    coreState: {
      slowState: {
        generation: 0,
        inventory: {
          dynamites: 5,
          bombs: 3,
          vowels: 0,
          consonants: 0,
          copies: 0,
          times: 0,
          glasses: 0,
        },
        resource: {
          wood: 0,
          stone: 0,
        },
        scoring: {
          score: 7,
          highWaterMark: 7,
        },
        currentTool: 'pointer',
        invalidWords: [],
        renderToGl: true,
        paused: undefined,
        winState: { t: 'playing' },
      },
      wordBonusState: {
        active: [],
        numAllocated: 0,
      },
      _cacheUpdateQueue: [],
      animations: [],
      mobile_entities: {},
      seen_cells: mkOverlay(),
      connectedSet: mkGridOf([]),
      energies: {
        byLetter: [
          -0.20972339977922094,
          0.7840271889992784,
          1.3068528194400546,
          0.3068528194400547,
          0.5636791674230779,
          1.6534264097200273,
          0.3068528194400547,
          0.7840271889992784,
          0.6791654891096679,
          4,
          4,
          1.1041202653859723,
          0.7840271889992784,
          0.4602792291600821,
          0.4602792291600821,
          0.7840271889992784,
          4,
          0.4602792291600821,
          -0.0047189562170500965,
          -0.039720770839917874,
          0.79528104378295,
          1.6534264097200273,
          1.6534264097200273,
          4,
          1.6534264097200273,
          0
        ],
        byClass: [0, 0,],
      },
      seed: 1533311107,
      bonusLayerSeed: 46,
      canvas_from_world: {
        scale: {
          x: 39.6694214876033,
          y: 39.6694214876033
        },
        translate: {
          x: 150.80991735537191,
          y: 215.56198347107437
        }
      },
      game_from_clock: SE1.ident(),
      bonusOverlay: {
        cells: {

        }
      },
      panic: { currentTime_in_game: Date.now(), lastClear_in_game: Date.now() - PANIC_INTERVAL_MS / 3 },
      mobsState: mkMobsState(),
    },
    mouseState: {
      t: "up",
      p_in_canvas: {
        x: 962,
        y: 88
      }
    },
  };

  const tois: TileOptionalId[] = [
    { letter: { t: 'single', letter: "p" }, p_in_world_int: { x: 0, y: 0 } },
    { letter: { t: 'single', letter: "i" }, p_in_world_int: { x: 2, y: 2 } },
    { letter: { t: 'single', letter: "t" }, p_in_world_int: { x: 2, y: 0 } },
    { letter: { t: 'single', letter: "o" }, p_in_world_int: { x: 1, y: 0 } },
    { letter: { t: 'single', letter: "w" }, p_in_world_int: { x: 2, y: 1 } },
    { letter: { t: 'single', letter: "c" }, p_in_world_int: { x: 9, y: -3 } },
    { letter: { t: 'single', letter: "e" }, p_in_world_int: { x: 2, y: 4 } },
    { letter: { t: 'single', letter: "q" }, p_in_world_int: { x: 1, y: 2 } },
    { letter: { t: 'single', letter: "h" }, p_in_world_int: { x: 1, y: 4 } },
    { letter: { t: 'single', letter: "n" }, p_in_world_int: { x: 6, y: 2 } },
    { letter: { t: 'single', letter: "l" }, p_in_world_int: { x: 3, y: 4 } },
    { letter: { t: 'single', letter: "s" }, p_in_world_int: { x: 0, y: 4 } },
    { letter: { t: 'single', letter: "v" }, p_in_world_int: { x: 4, y: 4 } },
    { letter: { t: 'single', letter: "e" }, p_in_world_int: { x: 5, y: 4 } },
    { letter: { t: 'single', letter: "d" }, p_in_world_int: { x: 6, y: 4 } },
    { letter: { t: 'single', letter: "l" }, p_in_world_int: { x: 9, y: -1 } },
    { letter: { t: 'single', letter: "i" }, p_in_world_int: { x: 6, y: 1 } },
    { letter: { t: 'single', letter: "e" }, p_in_world_int: { x: 6, y: 3 } },
    { letter: { t: 'single', letter: "i" }, p_in_world_int: { x: 8, y: 4 } },
    { letter: { t: 'single', letter: "m" }, p_in_world_int: { x: 9, y: 0 } },
    { letter: { t: 'single', letter: "r" }, p_in_world_int: { x: 11, y: -2 } },
    { letter: { t: 'single', letter: "r" }, p_in_world_int: { x: 6, y: 0 } },
    { letter: { t: 'single', letter: "n" }, p_in_world_int: { x: 2, y: 3 } },
    { letter: { t: 'single', letter: "a" }, p_in_world_int: { x: 9, y: -2 } },
    { letter: { t: 'single', letter: "u" }, p_in_world_int: { x: 0, y: -1 } },
    { letter: { t: 'single', letter: "o" }, p_in_world_int: { x: 7, y: -1 } },
    { letter: { t: 'single', letter: "n" }, p_in_world_int: { x: 8, y: 5 } },
    { letter: { t: 'single', letter: "e" }, p_in_world_int: { x: 7, y: 3 } },
    { letter: { t: 'single', letter: "i" }, p_in_world_int: { x: 8, y: -1 } },
    { letter: { t: 'single', letter: "b" }, p_in_world_int: { x: 6, y: -1 } },
    { letter: { t: 'single', letter: "l" }, p_in_world_int: { x: 8, y: 3 } },
    { letter: { t: 'single', letter: "t" }, p_in_world_int: { x: 8, y: 6 } },
    { letter: { t: 'single', letter: "c" }, p_in_world_int: { x: 11, y: 0 } },
    { letter: { t: 'single', letter: "k" }, p_in_world_int: { x: 12, y: 0 } },
    { letter: { t: 'single', letter: "f" }, p_in_world_int: { x: 11, y: -4 } },
    { letter: { t: 'single', letter: "r" }, p_in_world_int: { x: 10, y: -3 } },
    { letter: { t: 'single', letter: "a" }, p_in_world_int: { x: 11, y: -3 } },
    { letter: { t: 'single', letter: "g" }, p_in_world_int: { x: 12, y: -3 } },
    { letter: { t: 'single', letter: "e" }, p_in_world_int: { x: 12, y: -2 } },
    { letter: { t: 'single', letter: "e" }, p_in_world_int: { x: 12, y: -1 } },
    { letter: { t: 'single', letter: "u" }, p_in_world_int: { x: 10, y: 0 } },
    { letter: { t: 'single', letter: "y" }, p_in_world_int: { x: 13, y: 0 } },
    { letter: { t: 'single', letter: "x" }, p_in_world_int: { x: 13, y: -2 } },
    { letter: { t: 'single', letter: "j" }, p_in_world_int: { x: 6, y: 6 } },
    { letter: { t: 'single', letter: "o" }, p_in_world_int: { x: 7, y: 6 } }
  ];
  const tiles = tois.map(ensureTileId);
  const handTiles: { letter: AbstractLetter, index: number }[] = [
    { letter: { t: 'single', letter: "e" }, index: 0 },
    { letter: { t: 'single', letter: "t" }, index: 1 },
    { letter: { t: 'single', letter: "a" }, index: 2 },
  ];
  const almost = withCoreState(state, cs => resolveValid(checkValid(addHandTileEntities(addWorldTiles(cs, tiles), handTiles)), new Set()));
  return produce(almost, s => {
    s.coreState.animations = [];
  });
}
