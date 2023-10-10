import { Point } from "../util/types";

// Implements a lazily-evaluated, cached, immutable sparse map from coordinates to T

export type Layer<T> = {
  cache: Record<string, T>,
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
  return { cache: {}, func };
}

export function getLayer<T>(layer: Layer<T>, p: Point): T {
  const upc = unparseCoord(p);
  if (layer.cache[upc] === undefined) {
    layer.cache[upc] = layer.func(p);
  }
  return layer.cache[upc];
}
