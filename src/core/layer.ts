import { Point } from "../util/types";

// Implements a lazily-evaluated, cached, immutable sparse map from coordinates to T

// XXX the fact that this is global is bad
const cache: Record<string, any> = {};

export type Layer<T> = {
  func: (p: Point) => T,
};

function parseCoord(x: string): Point {
  const parts = x.split(',');
  return { x: parseInt(parts[0]), y: parseInt(parts[1]) };
}

function unparseCoord(p: Point): string {
  return `${p.x},${p.y}`;
}

export function mkLayer<T>(func: (p: Point) => T): Layer<T> {
  return { func };
}

export function getLayer<T>(layer: Layer<T>, p: Point): T {
  const upc = unparseCoord(p);
  if (cache[upc] === undefined) {
    cache[upc] = layer.func(p);
  }
  return cache[upc];
}
