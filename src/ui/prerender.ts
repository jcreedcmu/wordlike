import { Prerenderers } from "../core/assets";
import { NUM_LETTERS, letterOfIndex } from "../core/letters";
import { SPRITE_PIXEL_WIDTH } from "../core/tool-types";
import { Buffer, buffer, fillRect } from "../util/dutil";
import { scale } from "../util/se2";
import { apply_to_rect } from "../util/se2-extra";
import { vdiag } from "../util/vutil";
import { drawRequiredLetterBonus } from "./drawBonus";
import { spriteLocOfRequiredBonus } from "./sprite-sheet";

function prerenderSpriteSheet(img: HTMLImageElement): Buffer {
  const buf = buffer({ x: img.width, y: img.height });
  buf.d.drawImage(img, 0, 0);

  for (let i = 0; i < NUM_LETTERS; i++) {
    const rect_in_canvas = apply_to_rect(scale(vdiag(SPRITE_PIXEL_WIDTH)), { p: spriteLocOfRequiredBonus(i), sz: { x: 1, y: 1 } });
    fillRect(buf.d, rect_in_canvas, 'white');
    drawRequiredLetterBonus(buf.d, letterOfIndex(i), rect_in_canvas);
  }
  return buf;
}
function prerenderFontSheet(img: HTMLImageElement): Buffer {
  const buf = buffer({ x: img.width, y: img.height });
  buf.d.drawImage(img, 0, 0);
  return buf;
}
function prerenderToolbar(img: HTMLImageElement): Buffer {
  const buf = buffer({ x: img.width, y: img.height });
  buf.d.drawImage(img, 0, 0);
  return buf;
}

export function getPrerenderers(): Prerenderers {
  return { prerenderFontSheet, prerenderSpriteSheet, prerenderToolbar };
}
