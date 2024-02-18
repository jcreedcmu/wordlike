import { prerenderFontSheet, prerenderSpriteSheet, prerenderToolbar } from "../ui/sprite-sheet";
import { asyncReplace } from "../util/async-replace";
import { Buffer, imgProm } from "../util/dutil";
import { grab } from "../util/util";

export type ShaderProgramText = {
  name: string, // for debugging
  vert: string,
  frag: string,
};

type Assets = {
  dictionary: Record<string, boolean>,
  spritesBuf: Buffer,
  largeSpritesBuf: Buffer,
  fontSheetBuf: Buffer,
  worldShaders: ShaderProgramText,
  tileShaders: ShaderProgramText,
  spriteShaders: ShaderProgramText,
  debugQuadShaders: ShaderProgramText,
  canvasShaders: ShaderProgramText,
  bonusShaders: ShaderProgramText,
};

// Any data that goes here is effectively test data for consumption by
// unit tests. initAssets, which will be called early in
// initialization in actual execution, will overwrite it.
let assets: Assets = {
  dictionary: { 'foo': true, 'bar': true, 'baz': true },

  // We assume tests don't exercise any of the below data:
  spritesBuf: undefined as any,
  largeSpritesBuf: undefined as any,
  fontSheetBuf: undefined as any,
  worldShaders: { name: '', frag: '', vert: '' },
  tileShaders: { name: '', frag: '', vert: '' },
  spriteShaders: { name: '', frag: '', vert: '' },
  debugQuadShaders: { name: '', frag: '', vert: '' },
  canvasShaders: { name: '', frag: '', vert: '' },
  bonusShaders: { name: '', frag: '', vert: '' },
}

async function preprocess(shaderText: string): Promise<string> {
  return await asyncReplace(shaderText, /^#include "(.*?)"/mg, async (ms) => {
    const file = ms[1];
    // XXX recursively preprocess?
    // XXX cache fetches?
    return await grab(`assets/${file}`);
  });
}

async function getShaders(prefix: string): Promise<ShaderProgramText> {
  const vert = await preprocess(await grab(`assets/${prefix}.vert`));
  const frag = await preprocess(await grab(`assets/${prefix}.frag`));
  return { name: prefix, vert, frag };
}

export async function initAssets() {
  const spritesImg = await imgProm('assets/sprites.png');
  const fontSheetImg = await imgProm('assets/font-sheet.png');
  const largeSpritesImg = await imgProm('assets/sprites-large.png');
  const wordlist = (await (await fetch('assets/dictionary.txt')).text())
    .split('\n').filter(x => x);
  const dictionary = Object.fromEntries(wordlist.map(word => [word, true]));
  assets = {
    dictionary,
    spritesBuf: prerenderSpriteSheet(spritesImg),
    largeSpritesBuf: prerenderToolbar(largeSpritesImg),
    fontSheetBuf: prerenderFontSheet(fontSheetImg),
    worldShaders: await getShaders('world'),
    tileShaders: await getShaders('tile'),
    spriteShaders: await getShaders('sprite'),
    debugQuadShaders: await getShaders('debug-quad'),
    canvasShaders: await getShaders('canvas'),
    bonusShaders: await getShaders('bonus'),
  };
}

export function getAssets(): Assets {
  return assets as Assets;
}
