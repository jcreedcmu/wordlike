import { imgProm, Buffer, buffer } from "../util/dutil";

export function prerenderSpriteSheet(img: HTMLImageElement): Buffer {
  const buf = buffer({ x: img.width, y: img.height });
  buf.d.drawImage(img, 0, 0);
  return buf;
}
