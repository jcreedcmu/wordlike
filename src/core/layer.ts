import { DEBUG } from "../util/debug";
import { Point } from "../util/types";

// Implements a lazily-evaluated, cached, immutable sparse map from coordinates to T

// This is global
const cache: Record<string, any> = {};
if (DEBUG.cacheExporter) {
  (window as any).layerCache = cache;
}

export type Layer<T> = {
  name: string,
  func: (p: Point) => T,
};

export type Overlay<T> = {
  cells: Record<string, T>;
};

function parseCoord(x: string): Point {
  const parts = x.split(',');
  return { x: parseInt(parts[1]), y: parseInt(parts[2]) };
}

function unparseNamedCoord(name: string, p: Point): string {
  return `${name},${p.x},${p.y}`;
}

function unparseCoord(p: Point): string {
  return `${p.x},${p.y}`;
}

export function mkLayer<T>(name: string, func: (p: Point) => T): Layer<T> {
  return { name, func };
}

export function mkOverlay<T>(): Overlay<T> {
  return { cells: {} };
}

export function getLayer<T>(layer: Layer<T>, p: Point): T {
  const upc = unparseNamedCoord(layer.name, p);
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

export function overlayPoints<T>(layer: Overlay<T>): Point[] {
  return Object.keys(layer.cells).map(k => parseCoord(k));
}

export function overlayAny<T>(layer: Overlay<T>, predicate: (p: Point) => boolean): boolean {
  for (const k of Object.keys(layer.cells)) {
    if (predicate(parseCoord(k))) {
      return true;
    }
  }
  return false;
}

export function mkOverlayFrom(points: Point[]): Overlay<boolean> {
  const layer: Overlay<boolean> = mkOverlay();
  points.forEach(p => {
    setOverlay(layer, p, true);
  });
  return layer;
}

export function combineOverlay<T>(layer1: Overlay<T>, layer2: Overlay<T>): Overlay<T> {
  return {
    cells: { ...layer1.cells, ...layer2.cells }
  }
}
