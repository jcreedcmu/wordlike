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

export function colorOfRgbColor(c: RgbColor): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// This is assumed to be 0..255
export type RgbColor = [number, number, number];
export type RgbaColor = [number, number, number, number];

export function fillRectRgb(d: CanvasRenderingContext2D, rect: Rect, color: RgbColor) {
  fillRect(d, rect, colorOfRgbColor(color));
}

export function clearRect(d: CanvasRenderingContext2D, rect: Rect) {
  d.clearRect(rect.p.x, rect.p.y, rect.sz.x, rect.sz.y);
}

export function strokeRect(d: CanvasRenderingContext2D, rect: Rect, color: string, width: number = 1) {
  d.strokeStyle = color;
  d.lineWidth = width;
  d.strokeRect(rect.p.x + 0.5, rect.p.y + 0.5, rect.sz.x, rect.sz.y);
}

export function fillText(d: CanvasRenderingContext2D, text: string, p: Point, color: string, font: string) {
  d.fillStyle = color;
  d.font = font;
  d.fillText(text, p.x, p.y);
}

export function strokeText(d: CanvasRenderingContext2D, text: string, p: Point, color: string, thickness: number, font: string) {
  d.strokeStyle = color;
  d.lineWidth = thickness;
  d.font = font;
  d.strokeText(text, p.x, p.y);
}

export function drawImage(d: CanvasRenderingContext2D, img: CanvasImageSource, srcRect: Rect, dstRect: Rect) {
  d.drawImage(img,
    srcRect.p.x, srcRect.p.y, srcRect.sz.x, srcRect.sz.y,
    dstRect.p.x, dstRect.p.y, dstRect.sz.x, dstRect.sz.y,
  );
}

export function pathRectCircle(d: CanvasRenderingContext2D, rect: Rect) {
  d.beginPath();
  d.arc(rect.p.x + rect.sz.x / 2,
    rect.p.y + rect.sz.y / 2,
    rect.sz.y / 2,
    0, 360,
  );
}

export function pathRect(d: CanvasRenderingContext2D, rect: Rect) {
  d.rect(rect.p.x, rect.p.y, rect.sz.x, rect.sz.y);
}

export function pathCircle(d: CanvasRenderingContext2D, center: Point, radius: number) {
  d.beginPath();
  d.arc(center.x,
    center.y,
    radius,
    0, 360,
  );
}

export function moveTo(d: CanvasRenderingContext2D, p: Point) {
  d.moveTo(p.x, p.y);
}

export function lineTo(d: CanvasRenderingContext2D, p: Point) {
  d.lineTo(p.x, p.y);
}

export function randomColor(): string {
  return `rgb(${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)})`;
}

export function imageDataOfImage(im: HTMLImageElement): ImageData {
  const buf = buffer({ x: im.width, y: im.height });
  buf.d.drawImage(im, 0, 0);
  return buf.d.getImageData(0, 0, im.width, im.height);
}

export function imageDataOfBuffer(buf: Buffer): ImageData {
  return buf.d.getImageData(0, 0, buf.c.width, buf.c.height);
}
