import { prerenderFontSheet, prerenderSpriteSheet } from "../ui/sprite-sheet";
import { Buffer, imgProm } from "../util/dutil";
import { grab } from "../util/util";

type Assets = {
  dictionary: Record<string, boolean>,
  spriteSheetBuf: Buffer,
  fontSheetBuf: Buffer,
  vert: string,
  frag: string,
};

// Any data that goes here is effectively test data for consumption by
// unit tests. initAssets, which will be called early in
// initialization in actual execution, will overwrite it.
let assets: Assets = {
  dictionary: { 'foo': true, 'bar': true, 'baz': true },
  spriteSheetBuf: undefined as any, // cheating here and assuming tests won't use toolbarImg
  fontSheetBuf: undefined as any, // cheating here and assuming tests won't use fontSheetImg
  vert: '',
  frag: '',
}

export async function initAssets() {
  const spriteSheetImg = await imgProm('assets/toolbar.png');
  const fontSheetImg = await imgProm('assets/font-sheet.png');
  const vert = await grab('assets/vertex.vert');
  const frag = await grab('assets/frag.frag');
  const wordlist = (await (await fetch('assets/dictionary.txt')).text())
    .split('\n').filter(x => x);
  const dictionary = Object.fromEntries(wordlist.map(word => [word, true]));
  assets = {
    dictionary,
    spriteSheetBuf: prerenderSpriteSheet(spriteSheetImg),
    fontSheetBuf: prerenderFontSheet(fontSheetImg),
    vert,
    frag,
  };
}

export function getAssets(): Assets {
  return assets as Assets;
}
