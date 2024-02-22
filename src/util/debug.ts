import { Tile, TileOptionalId } from "../core/state";
import { ensureTileId } from "../core/tile-id-helpers";

export const isDev = globalThis['window'] == undefined || (globalThis['location'] != undefined && !!globalThis['location'].host.match(/localhost/));

export const DEBUG = {
  keys: false,
  rendering: false,
  produce: false,
  letterSample: false,
  words: false,
  stateExporter: true,
  stateImporter: true,
  instructions: false,
  skipAheadPanic: false,
  acceleratePanic: false,
  accelerateWordBonus: false,
  interval: false,
  glProfiling: false,
  canvasProfiling: false,
  missedChunkRendering: true,
  actions: false,
  lowActions: false,
  noRenderSlowState: false,
  rawPaint: false,
  cacheUpdate: false,

  // if true, every string of letters is considered a word, and required-letter bonuses admit any letter
  allWords: false,
  fastAnimation: true,
};

export type DebugLevel = keyof (typeof DEBUG);

export function logger(level: DebugLevel, ...args: any[]) {
  if (DEBUG[level]) {
    console.log(...args);
  }
}

const debugDone: Record<string, boolean> = {};
const debugCount: Record<string, number> = {};

export function doOnce(tag: string, k: () => void): void {
  if (!debugDone[tag]) {
    debugDone[tag] = true;
    k();
  }
}

export function doOnceEvery(tag: string, N: number, k: () => void): void {
  debugCount[tag] = debugCount[tag] ?? 0;
  if (debugCount[tag] == 0) {
    k();
  }
  debugCount[tag] = (debugCount[tag] + 1) % N;
}

export function doAgain(tag: string): void {
  debugDone[tag] = false;
}

export function debugOnce(level: DebugLevel) {
  DEBUG[level] = false;
  doOnce('_' + level, () => { DEBUG[level] = true; });
}

export function logOnce(...msg: any[]) {
  doOnce('logOnce', () => { console.log(...msg); });
}

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
    { letter: { t: 'single', letter: "m" }, "p_in_world_int": { "x": 10, "y": 5 } }];
  return tiles.map(ensureTileId);
}
