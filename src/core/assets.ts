import { prerenderFontSheet, prerenderSpriteSheet } from "../ui/sprite-sheet";
import { asyncReplace } from "../util/async-replace";
import { Buffer, imgProm } from "../util/dutil";
import { grab } from "../util/util";

export type ShaderProgramText = {
  vert: string,
  frag: string,
};

type Assets = {
  dictionary: Record<string, boolean>,
  spriteSheetBuf: Buffer,
  fontSheetBuf: Buffer,
  chunkShaders: ShaderProgramText,
  worldShaders: ShaderProgramText,
  tileShaders: ShaderProgramText,
  texQuadShaders: ShaderProgramText,
};

// Any data that goes here is effectively test data for consumption by
// unit tests. initAssets, which will be called early in
// initialization in actual execution, will overwrite it.
let assets: Assets = {
  dictionary: { 'foo': true, 'bar': true, 'baz': true },

  // We assume tests don't exercise any of the below data:
  spriteSheetBuf: undefined as any,
  fontSheetBuf: undefined as any,
  chunkShaders: { frag: '', vert: '' },
  worldShaders: { frag: '', vert: '' },
  tileShaders: { frag: '', vert: '' },
  texQuadShaders: { frag: '', vert: '' },
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
  return { vert, frag };
}

export async function initAssets() {
  const spriteSheetImg = await imgProm('assets/toolbar.png');
  const fontSheetImg = await imgProm('assets/font-sheet.png');
  const wordlist = (await (await fetch('assets/dictionary.txt')).text())
    .split('\n').filter(x => x);
  const dictionary = Object.fromEntries(wordlist.map(word => [word, true]));
  assets = {
    dictionary,
    spriteSheetBuf: prerenderSpriteSheet(spriteSheetImg),
    fontSheetBuf: prerenderFontSheet(fontSheetImg),
    chunkShaders: await getShaders('chunk'),
    worldShaders: await getShaders('world'),
    tileShaders: await getShaders('tile'),
    texQuadShaders: await getShaders('tex-quad'),
  };
}

export function getAssets(): Assets {
  return assets as Assets;
}
