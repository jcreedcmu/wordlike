
export const isDev = globalThis['window'] == undefined || (globalThis['location'] != undefined && !!globalThis['location'].host.match(/localhost/));

export const DEBUG = {
  keys: false,
  rendering: false,
  produce: false,
  letterSample: false,
  words: false,
  stateExporter: true,
  cacheExporter: false,
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
  bugReportButton: true,

  // if true, every string of letters is considered a word, and required-letter bonuses admit any letter
  allWords: false,
  fastAnimation: true,
};

export const DEBUG_CONFIG = {
  bugReportQueueLength: 100,
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
