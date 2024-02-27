import { AbstractLetter, stringOfLetter } from '../core/letters';
import { Rect } from '../util/types';

export function drawTileLetter(d: CanvasRenderingContext2D, letter: AbstractLetter, rect_in_canvas: Rect, color: string) {
  d.fillStyle = color;
  d.textBaseline = 'middle';
  d.textAlign = 'center';
  const fontSize = Math.round(0.6 * rect_in_canvas.sz.x);
  d.font = `bold ${fontSize}px sans-serif`;
  d.fillText(stringOfLetter(letter).toUpperCase(), rect_in_canvas.p.x + rect_in_canvas.sz.x / 2 + 0.5,
    rect_in_canvas.p.y + rect_in_canvas.sz.y / 2 + 1.5);
}
