import { Point, Rect } from "./types";
import { vm2, vsub } from "./vutil";

export function mapval<T, U>(m: { [k: string]: T }, f: (x: T, k?: string) => U): { [k: string]: U } {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, f(v, k)]));
}

export class Rand {
  n: number;
  constructor(n?: number) { this.n = n || 42; for (let i = 0; i < 3; i++) this.f(); }
  f(): number {
    this.n = (2147483629 * this.n + 2147483587) % 2147483647;
    return (this.n & 0xffff) / (1 << 16);
  }
  i(n: number): number {
    return Math.floor(this.f() * n);
  }
}

export function zeropad(str: string, length: number): string {
  return repeat('0', Math.max(0, length - str.length)) + str;
}

export function repeat(x: string, n: number) {
  if (n < 0)
    throw 'negative repeat';

  let s = '';
  for (; ;) {
    if (n & 1) s += x;
    n >>= 1;
    if (n) x += x;
    else break;
  }
  return s;
}

export const int = Math.floor;

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// multiplicative interpolation
export function mlerp(a: number, b: number, t: number) {
  return Math.exp(lerp(Math.log(a), Math.log(b), t));
}

export function unreachable<T>(x: never): T {
  throw new Error('unreachable');
}

export function filterKeys<T>(rec: Record<string, T>, pred: (x: string) => boolean): Record<string, T> {
  return Object.fromEntries(
    Object.entries(rec)
      .filter(([k, v]) => pred(k))
  );
}

// RtlUniform from Native API[13] from
// https://en.wikipedia.org/wiki/Linear_congruential_generator
export function next_rand(seed: number): { seed: number, float: number } {
  const next = (2147483629 * seed + 2147483587) % 2147483647;
  return { seed: next, float: (next & 0xffff) / (1 << 16) };
}

export function boundRect(points: Point[]): Rect {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const mins = { x: Math.min(...xs), y: Math.min(...ys) };
  const maxs = { x: Math.max(...xs), y: Math.max(...ys) };
  return { p: mins, sz: vsub(maxs, mins) };
}

export function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.p.x && p.y >= r.p.y && p.x <= r.p.x + r.sz.x && p.y <= r.p.y + r.sz.y;
}

export function point_hash(p: Point): number {
  let c = 1000 * p.x + 3758 * p.y;

  const z: () => number = () => {
    const { seed, float } = next_rand(c);
    c = seed;
    return float;
  };
  for (let i = 0; i < 10; i++)
    z();
  return z();
}

export function midpointOfRect(rect: Rect): Point {
  return vm2(rect.p, rect.sz, (p, s) => p + s / 2);
}
