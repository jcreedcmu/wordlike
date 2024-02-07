import { Bonus } from "../core/bonus";
import { ChunkValue } from "../core/chunk";
import { MobState } from "../core/mobs";
import { LARGE_SPRITE_PIXEL_WIDTH, Resource, SPRITE_PIXEL_WIDTH, Tool } from "../core/tools";
import { Buffer, buffer, fillRect } from "../util/dutil";
import { scale } from "../util/se2";
import { apply_to_rect } from "../util/se2-extra";
import { Point, Rect } from "../util/types";
import { vdiag, vscale } from "../util/vutil";
import { drawRequiredLetterBonus } from "./drawBonus";

// In number of sprites
export const SPRITE_SHEET_SIZE = { x: 16, y: 16 };


export function spriteRectOfPos(pos: Point): Rect {
  const S_in_image = SPRITE_PIXEL_WIDTH;
  return { p: vscale(pos, S_in_image), sz: vdiag(S_in_image) };
}

export function largeSpriteRectOfPos(pos: Point): Rect {
  const S_in_image = LARGE_SPRITE_PIXEL_WIDTH;
  return { p: vscale(pos, S_in_image), sz: vdiag(S_in_image) };
}

export function spriteLocOfChunkValue(cval: ChunkValue) {
  switch (cval.t) {
    case 'tile':
      const letterIndex = cval.tile.letter.charCodeAt(0) - 97;
      return {
        x: 14 + Math.floor(letterIndex / SPRITE_SHEET_SIZE.y),
        y: letterIndex % SPRITE_SHEET_SIZE.y,
      };
    case 'bonus':
      return spriteLocOfBonus(cval.bonus);
  }
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

export function resourceSpriteLoc(res: Resource): Point {
  switch (res) {
    case 'wood': return { y: 6, x: 1 };
  }
}

export function largeSpriteLoc(tool: Tool | Resource): Point {
  switch (tool) {
    case 'pointer': return { y: 0, x: 0 };
    case 'hand': return { y: 0, x: 1 };
    case 'dynamite': return { y: 0, x: 2 };
    case 'bomb': return { y: 0, x: 3 };
    case 'vowel': return { y: 0, x: 4 };
    case 'consonant': return { y: 0, x: 5 };
    case 'copy': return { y: 0, x: 6 };
    case 'time': return { y: 0, x: 7 };
    case 'wood': return { y: 0, x: 8 };
  }
}

export function spriteLocOfMob(mobState: MobState): Point {
  switch (mobState.t) {
    case 'snail':
      switch (mobState.orientation) {
        case 'E': return { x: 1, y: 2 };
        case 'N': return { x: 1, y: 3 };
        case 'W': return { x: 1, y: 4 };
        case 'S': return { x: 1, y: 5 };
      }
  }
}

function spriteLocOfRequiredBonus(letterIndex: number): Point {
  return { x: 12 + Math.floor(letterIndex / 16), y: letterIndex % 16 };
}

export function prerenderSpriteSheet(img: HTMLImageElement): Buffer {
  const buf = buffer({ x: img.width, y: img.height });
  buf.d.drawImage(img, 0, 0);

  for (let i = 0; i < 26; i++) {
    const rect_in_canvas = apply_to_rect(scale(vdiag(SPRITE_PIXEL_WIDTH)), { p: spriteLocOfRequiredBonus(i), sz: { x: 1, y: 1 } });
    fillRect(buf.d, rect_in_canvas, 'white');
    drawRequiredLetterBonus(buf.d, String.fromCharCode(65 + i), rect_in_canvas);
  }
  return buf;
}

export function prerenderFontSheet(img: HTMLImageElement): Buffer {
  const buf = buffer({ x: img.width, y: img.height });
  buf.d.drawImage(img, 0, 0);
  return buf;
}

export function prerenderToolbar(img: HTMLImageElement): Buffer {
  const buf = buffer({ x: img.width, y: img.height });
  buf.d.drawImage(img, 0, 0);
  return buf;
}
