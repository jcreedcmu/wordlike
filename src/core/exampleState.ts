import { PANIC_INTERVAL_MS } from '../core/clock';
import { ensureTileId } from "../core/id-helpers";
import { AbstractLetter } from '../core/letters';
import { GameState, TileOptionalId } from '../core/state';
import { addHandTileEntities, addWorldTiles, checkValid, resolveValid, withCoreState } from '../core/state-helpers';
import { produce } from '../util/produce';
import * as SE1 from '../util/se1';
import { updateFogOfWar } from './fog-of-war';
import { mkGameState } from './mkGameState';

export function exampleState(): GameState {
  const state = mkGameState(1533311107, false, 46);

  state.coreState.slowState.inventory.bombs = 3;
  state.coreState.slowState.scoring = {
    score: 7,
    highWaterMark: 7,
  };

  state.coreState.canvas_from_world = {
    scale: {
      x: 39.6694214876033,
      y: 39.6694214876033
    },
    translate: {
      x: 150.80991735537191,
      y: 215.56198347107437
    }
  };

  state.coreState.panic = { currentTime_in_game: Date.now(), lastClear_in_game: Date.now() - PANIC_INTERVAL_MS / 3 };
  state.coreState.game_from_clock = SE1.ident();

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
  const almost = withCoreState(state, cs => {
    const withTiles = addHandTileEntities(addWorldTiles(cs, tiles), handTiles);
    const resolved = resolveValid(checkValid(withTiles), new Set());
    return updateFogOfWar(resolved);
  });

  return produce(almost, s => {
    s.coreState.animations = [];
  });
}
