import { Tile, TileOptionalId } from '../core/state-types';
import { ensureTileId } from "../core/id-helpers";


export function debugTiles(): Tile[] {
  const tiles: TileOptionalId[] = [
    { letter: { t: 'single', letter: "s" }, "p_in_world_int": { "x": 0, "y": 0 } },
    { letter: { t: 'single', letter: "i" }, "p_in_world_int": { "x": -5, "y": 5 } },
    { letter: { t: 'single', letter: "n" }, "p_in_world_int": { "x": -4, "y": 5 } },
    { letter: { t: 'single', letter: "e" }, "p_in_world_int": { "x": 1, "y": 0 } },
    { letter: { t: 'single', letter: "l" }, "p_in_world_int": { "x": 0, "y": 2 } },
    { letter: { t: 'single', letter: "l" }, "p_in_world_int": { "x": 0, "y": 3 } },
    { letter: { t: 'single', letter: "b" }, "p_in_world_int": { "x": -2, "y": 3 } },
    { letter: { t: 'single', letter: "e" }, "p_in_world_int": { "x": -1, "y": 3 } },
    { letter: { t: 'single', letter: "t" }, "p_in_world_int": { "x": 4, "y": 3 } },
    { letter: { t: 'single', letter: "r" }, "p_in_world_int": { "x": 2, "y": 0 } },
    { letter: { t: 'single', letter: "g" }, "p_in_world_int": { "x": 3, "y": 0 } },
    { letter: { t: 'single', letter: "e" }, "p_in_world_int": { "x": 4, "y": 0 } },
    { letter: { t: 'single', letter: "o" }, "p_in_world_int": { "x": 3, "y": 3 } },
    { letter: { t: 'single', letter: "j" }, "p_in_world_int": { "x": 2, "y": 3 } },
    { letter: { t: 'single', letter: "a" }, "p_in_world_int": { "x": -2, "y": 2 } },
    { letter: { t: 'single', letter: "e" }, "p_in_world_int": { "x": -2, "y": 5 } },
    { letter: { t: 'single', letter: "l" }, "p_in_world_int": { "x": -2, "y": 4 } },
    { letter: { t: 'single', letter: "r" }, "p_in_world_int": { "x": -1, "y": 5 } },
    { letter: { t: 'single', letter: "t" }, "p_in_world_int": { "x": 0, "y": 5 } },
    { letter: { t: 'single', letter: "g" }, "p_in_world_int": { "x": -2, "y": 1 } },
    { letter: { t: 'single', letter: "v" }, "p_in_world_int": { "x": -3, "y": 5 } },
    { letter: { t: 'single', letter: "i" }, "p_in_world_int": { "x": 0, "y": 1 } },
    { letter: { t: 'single', letter: "a" }, "p_in_world_int": { "x": 5, "y": 9 } },
    { letter: { t: 'single', letter: "n" }, "p_in_world_int": { "x": -5, "y": 6 } },
    { letter: { t: 'single', letter: "o" }, "p_in_world_int": { "x": -5, "y": 4 } },
    { letter: { t: 'single', letter: "c" }, "p_in_world_int": { "x": -5, "y": 3 } },
    { letter: { t: 'single', letter: "i" }, "p_in_world_int": { "x": 0, "y": 6 } },
    { letter: { t: 'single', letter: "r" }, "p_in_world_int": { "x": 0, "y": 7 } },
    { letter: { t: 'single', letter: "e" }, "p_in_world_int": { "x": 0, "y": 8 } },
    { letter: { t: 'single', letter: "a" }, "p_in_world_int": { "x": 1, "y": 7 } },
    { letter: { t: 'single', letter: "t" }, "p_in_world_int": { "x": 2, "y": 7 } },
    { letter: { t: 'single', letter: "u" }, "p_in_world_int": { "x": 7, "y": 3 } },
    { letter: { t: 'single', letter: "n" }, "p_in_world_int": { "x": 4, "y": 2 } },
    { letter: { t: 'single', letter: "d" }, "p_in_world_int": { "x": -1, "y": 7 } },
    { letter: { t: 'single', letter: "a" }, "p_in_world_int": { "x": 2, "y": 8 } },
    { letter: { t: 'single', letter: "n" }, "p_in_world_int": { "x": 2, "y": 9 } },
    { letter: { t: 'single', letter: "k" }, "p_in_world_int": { "x": 2, "y": 10 } },
    { letter: { t: 'single', letter: "n" }, "p_in_world_int": { "x": -6, "y": 4 } },
    { letter: { t: 'single', letter: "o" }, "p_in_world_int": { "x": 6, "y": 2 } },
    { letter: { t: 'single', letter: "p" }, "p_in_world_int": { "x": 6, "y": 3 } },
    { letter: { t: 'single', letter: "i" }, "p_in_world_int": { "x": 4, "y": 1 } },
    { letter: { t: 'single', letter: "c" }, "p_in_world_int": { "x": 5, "y": 1 } },
    { letter: { t: 'single', letter: "h" }, "p_in_world_int": { "x": 6, "y": 1 } },
    { letter: { t: 'single', letter: "f" }, "p_in_world_int": { "x": 4, "y": -1 } },
    { letter: { t: 'single', letter: "b" }, "p_in_world_int": { "x": 8, "y": 3 } },
    { letter: { t: 'single', letter: "g" }, "p_in_world_int": { "x": 3, "y": 8 } },
    { letter: { t: 'single', letter: "e" }, "p_in_world_int": { "x": 4, "y": 8 } },
    { letter: { t: 'single', letter: "e" }, "p_in_world_int": { "x": 5, "y": 11 } },
    { letter: { t: 'single', letter: "s" }, "p_in_world_int": { "x": 5, "y": 10 } },
    { letter: { t: 'single', letter: "r" }, "p_in_world_int": { "x": 5, "y": 8 } },
    { letter: { t: 'single', letter: "i" }, "p_in_world_int": { "x": 6, "y": 9 } },
    { letter: { t: 'single', letter: "w" }, "p_in_world_int": { "x": 4, "y": 11 } },
    { letter: { t: 'single', letter: "i" }, "p_in_world_int": { "x": 8, "y": 4 } },
    { letter: { t: 'single', letter: "d" }, "p_in_world_int": { "x": 8, "y": 5 } },
    { letter: { t: 'single', letter: "o" }, "p_in_world_int": { "x": 9, "y": 5 } },
    { letter: { t: 'single', letter: "s" }, "p_in_world_int": { "x": 11, "y": 5 } },
    { letter: { t: 'single', letter: "m" }, "p_in_world_int": { "x": 10, "y": 5 } }
  ];
  return tiles.map(ensureTileId);
}
