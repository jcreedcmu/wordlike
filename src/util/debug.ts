export const isDev = globalThis['window'] == undefined || (globalThis['location'] != undefined && !!globalThis['location'].host.match(/localhost/));

export const DEBUG = {
  keys: false,
  rendering: false,
  produce: false,
};

export type DebugLevel = keyof (typeof DEBUG);

export function logger(level: DebugLevel, ...args: any[]) {
  if (DEBUG[level]) {
    console.log(...args);
  }
}

const debugDone: Record<string, boolean> = {};

export function doOnce(tag: string, k: () => void): void {
  if (!debugDone[tag]) {
    debugDone[tag] = true;
    k();
  }
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
