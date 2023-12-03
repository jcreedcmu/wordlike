import { Bonus } from "../core/bonus";
import { TOOL_IMAGE_WIDTH, Tool, indexOfTool } from "../core/tools";
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
    case 'bomb': return spriteLocOfTool('bomb');
    case 'required': return spriteLocOfRequiredBonus(bonus.letter.charCodeAt(0) - 97);
    case 'consonant': return spriteLocOfTool('consonant');
    case 'vowel': return spriteLocOfTool('vowel');
    case 'copy': return spriteLocOfTool('copy');
    case 'empty': return { x: 0, y: 7 };
    case 'block': return { x: 1, y: 0 };
    case 'word': return { x: 0, y: 8 };
    case 'time': return spriteLocOfTool('time');
  }
}

export function spriteLocOfTool(tool: Tool): Point {
  switch (tool) {
    case 'pointer': return { x: 0, y: 0 };
    case 'hand': return { x: 0, y: 1 };
    case 'dynamite': return { x: 0, y: 2 };
    case 'bomb': return { x: 0, y: 3 };
    case 'vowel': return { x: 0, y: 4 };
    case 'consonant': return { x: 0, y: 5 };
    case 'copy': return { x: 0, y: 6 };
    case 'time': return { x: 0, y: 10 };
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
