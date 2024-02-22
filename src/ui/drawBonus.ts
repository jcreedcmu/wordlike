import { getAssets } from '../core/assets';
import { Bonus, rectOfBonus } from '../core/bonus';
import { AbstractLetter } from '../core/letters';
import { drawImage, fillRect } from '../util/dutil';
import { SE2 } from '../util/se2';
import { apply_to_rect } from "../util/se2-extra";
import { Point, Rect } from "../util/types";
import { midpointOfRect } from "../util/util";
import { vadd } from '../util/vutil';
import { drawTileLetter } from './render';
import { spriteLocOfBonus, spriteRectOfPos } from './sprite-sheet';

export function drawBonusPoint(d: CanvasRenderingContext2D, pan_canvas_from_world: SE2, p: Point, fraction: number = 1) {
  const rect_in_canvas = apply_to_rect(pan_canvas_from_world, { p, sz: { x: 1, y: 1 } });
  d.fillStyle = 'rgba(0,0,255,0.5)';
  d.beginPath();
  const m = midpointOfRect(rect_in_canvas);
  d.moveTo(m.x, m.y);
  d.arc(rect_in_canvas.p.x + rect_in_canvas.sz.x / 2,
    rect_in_canvas.p.y + rect_in_canvas.sz.y / 2,
    rect_in_canvas.sz.y * 0.4,
    0, 2 * Math.PI * fraction,
  );
  d.fill();
}

export function drawRequiredLetterBonus(d: CanvasRenderingContext2D, letter: AbstractLetter, rect_in_canvas: Rect) {
  drawTileLetter(d, letter, rect_in_canvas, '#aaa');
}

export function drawBonus(d: CanvasRenderingContext2D, bonus: Bonus, canvas_from_world: SE2, p_in_world: Point, active: boolean = false) {
  const sprites = getAssets().spritesBuf.c;
  const rect_in_canvas = apply_to_rect(canvas_from_world, { p: p_in_world, sz: { x: 1, y: 1 } });

  switch (bonus.t) {
    case 'tree':
      drawBonusPoint(d, canvas_from_world, p_in_world);
      return;
    case 'empty':
      return;
    case 'water': {
      fillRect(d, rect_in_canvas, 'gray');
      return;
    }
    case 'required': {
      const rect_in_canvas = apply_to_rect(canvas_from_world, { p: p_in_world, sz: { x: 1, y: 1 } });
      drawRequiredLetterBonus(d, bonus.letter, rect_in_canvas);
    } return;
    case 'word': {
      drawImage(d, sprites, spriteRectOfPos(vadd(spriteLocOfBonus(bonus), { x: 0, y: active ? 1 : 0 })), rect_in_canvas);
      return;
    }
    default: {
      drawImage(d, sprites, rectOfBonus(bonus), rect_in_canvas);
      return;
    }
  }
}
