import { Point } from "../util/types";

// Implements a lazily-evaluated, cached, immutable sparse map from coordinates to T

// FIXME(#26): the fact that this is global is bad
const cache: Record<string, any> = {};

export type Layer<T> = {
  func: (p: Point) => T,
};

export type Overlay<T> = {
  cells: Record<string, T>;
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

export function mkOverlay<T>(): Overlay<T> {
  return { cells: {} };
}

export function getLayer<T>(layer: Layer<T>, p: Point): T {
  const upc = unparseCoord(p);
  if (cache[upc] === undefined) {
    cache[upc] = layer.func(p);
  }
  return cache[upc];
}

export function setOverlay<T>(layer: Overlay<T>, p: Point, v: T): void {
  layer.cells[unparseCoord(p)] = v;
}

export function getOverlayLayer<T>(layer1: Overlay<T>, layer2: Layer<T>, p: Point): T {
  const k = unparseCoord(p);
  const v1 = layer1.cells[k];
  if (v1 !== undefined) return v1;
  return getLayer(layer2, p);
}

export function getOverlay<T>(layer: Overlay<T>, p: Point): T | undefined {
  return layer.cells[unparseCoord(p)];
}

export function overlayForEach<T>(layer: Overlay<T>, kont: (p: Point) => void): void {
  Object.keys(layer.cells).forEach(k => {
    kont(parseCoord(k));
  });
}
