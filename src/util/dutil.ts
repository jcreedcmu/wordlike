import { Color, Point, Rect } from './types';
import { vint, vm, vsub } from './vutil';

export type Buffer = {
  c: HTMLCanvasElement,
  d: CanvasRenderingContext2D,
}

export function imgProm(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const sprite = new Image();
    sprite.src = src;
    sprite.onload = function() { res(sprite); }
  });
}

export function fbuf(sz: Point, getPixel: (x: number, y: number) => Color): Buffer {
  const c = document.createElement('canvas');
  c.width = sz.x;
  c.height = sz.y;
  const d = c.getContext('2d');
  if (d == null) {
    throw "couldn't create canvas rendering context for buffer";
  }
  const dd = d.getImageData(0, 0, sz.x, sz.y);
  for (let x = 0; x < dd.width; x++) {
    for (let y = 0; y < dd.height; y++) {
      const base = 4 * (y * dd.width + x);
      const cn = getPixel(x, y);
      dd.data[base] = cn.r;
      dd.data[base + 1] = cn.g;
      dd.data[base + 2] = cn.b;
      dd.data[base + 3] = cn.a;
    }
  }
  d.putImageData(dd, 0, 0);
  return { c, d };
}

export function buffer(sz: Point): Buffer {
  const c = document.createElement('canvas');
  c.width = sz.x;
  c.height = sz.y;
  const d = c.getContext('2d');
  if (d == null) {
    throw "couldn't create canvas rendering context for buffer";
  }
  return { c, d };
}

export function relpos(e: MouseEvent, c: HTMLElement): Point {
  const r = c.getBoundingClientRect();
  const or = vm({ x: r.left, y: r.top }, Math.floor);
  return vsub({ x: e.pageX, y: e.pageY }, or);
}

export function rrelpos(e: React.MouseEvent): Point {
  const rect = e.currentTarget.getBoundingClientRect();
  return vint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
}

export function fillRect(d: CanvasRenderingContext2D, rect: Rect, color: string) {
  d.fillStyle = color;
  d.fillRect(rect.p.x, rect.p.y, rect.sz.x, rect.sz.y);
}

export function strokeRect(d: CanvasRenderingContext2D, rect: Rect, color: string, width: number = 1) {
  d.strokeStyle = color;
  d.lineWidth = width;
  d.strokeRect(rect.p.x + 0.5, rect.p.y + 0.5, rect.sz.x, rect.sz.y);
}
