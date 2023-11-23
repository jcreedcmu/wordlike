import { getAssets } from '../core/assets';
import { Bonus } from '../core/bonus';
import { rectOfTool } from '../core/tools';
import { drawImage, fillRect } from '../util/dutil';
import { SE2 } from '../util/se2';
import { apply_to_rect } from "../util/se2-extra";
import { Point } from "../util/types";
import { midpointOfRect, unreachable } from "../util/util";
import { drawTileLetter } from './render';

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

export function drawBonusBomb(d: CanvasRenderingContext2D, pan_canvas_from_world: SE2, p: Point, fraction: number = 1) {
  const rect_in_canvas = apply_to_rect(pan_canvas_from_world, { p, sz: { x: 1, y: 1 } });
  const toolbarImg = getAssets().toolbarImg;
  drawImage(d, toolbarImg, rectOfTool('bomb'), rect_in_canvas);
}

export function drawBonus(d: CanvasRenderingContext2D, bonus: Bonus, pan_canvas_from_world: SE2, p: Point, fraction: number = 1) {
  const toolbarImg = getAssets().toolbarImg;
  const rect_in_canvas = apply_to_rect(pan_canvas_from_world, { p, sz: { x: 1, y: 1 } });

  switch (bonus.t) {
    case 'bonus':
      drawBonusPoint(d, pan_canvas_from_world, p);
      return;
    case 'bomb':
      drawImage(d, toolbarImg, rectOfTool('bomb'), rect_in_canvas);
      return;
    case 'empty':
      return;
    case 'block': {
      fillRect(d, rect_in_canvas, 'gray');
      return;
    }
    case 'required': {
      const rect_in_canvas = apply_to_rect(pan_canvas_from_world, { p, sz: { x: 1, y: 1 } });
      drawTileLetter(d, bonus.letter, rect_in_canvas, '#aaa');
    } return;
    case 'consonant': {
      drawImage(d, toolbarImg, rectOfTool('consonant'), rect_in_canvas);
      return;
    }
    case 'vowel': {
      drawImage(d, toolbarImg, rectOfTool('vowel'), rect_in_canvas);
      return;
    }
    case 'copy': {
      drawImage(d, toolbarImg, rectOfTool('copy'), rect_in_canvas);
      return;
    }
  }
  unreachable(bonus);
}
