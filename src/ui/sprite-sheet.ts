import { Bonus } from "../core/bonus";
import { TOOL_IMAGE_WIDTH, indexOfTool } from "../core/tools";
import { Buffer, buffer, fillRect } from "../util/dutil";
import { scale } from "../util/se2";
import { apply_to_rect } from "../util/se2-extra";
import { Point, Rect } from "../util/types";
import { vdiag, vscale } from "../util/vutil";
import { drawRequiredLetterBonus } from "./drawBonus";

export function spriteRectOfPos(pos: Point): Rect {
  const S_in_image = TOOL_IMAGE_WIDTH;
  return { p: vscale(pos, S_in_image), sz: vdiag(S_in_image) };
}

export function spriteLocOfBonus(bonus: Bonus): Point {
  switch (bonus.t) {
    case 'bonus': return { x: 1, y: 1 };
    case 'bomb': return { x: 0, y: indexOfTool('bomb') };
    case 'required': return spriteLocOfRequiredBonus(bonus.letter.charCodeAt(0) - 97);
    case 'consonant': return { x: 0, y: indexOfTool('consonant') };
    case 'vowel': return { x: 0, y: indexOfTool('vowel') };
    case 'copy': return { x: 0, y: indexOfTool('copy') };
    case 'empty': return { x: 0, y: 7 };
    case 'block': return { x: 1, y: 0 };
    case 'word': return { x: 0, y: 8 };
  }
}

function spriteLocOfRequiredBonus(letterIndex: number): Point {
  return { x: 12 + Math.floor(letterIndex / 16), y: letterIndex % 16 };
}

export function prerenderSpriteSheet(img: HTMLImageElement): Buffer {
  const buf = buffer({ x: img.width, y: img.height });
  buf.d.drawImage(img, 0, 0);

  for (let i = 0; i < 26; i++) {
    const rect_in_canvas = apply_to_rect(scale(vdiag(TOOL_IMAGE_WIDTH)), { p: spriteLocOfRequiredBonus(i), sz: { x: 1, y: 1 } });
    fillRect(buf.d, rect_in_canvas, 'white');
    drawRequiredLetterBonus(buf.d, String.fromCharCode(65 + i), rect_in_canvas);
  }
  return buf;
}
