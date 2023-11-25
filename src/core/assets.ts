import { imgProm } from "../util/dutil";
import { grab } from "../util/util";

type Assets = {
  dictionary: Record<string, boolean>,
  toolbarImg: HTMLImageElement,
  vert: string,
  frag: string,
};

// Any data that goes here is effectively test data for consumption by
// unit tests. initAssets, which will be called early in
// initialization in actual execution, will overwrite it.
let assets: Assets = {
  dictionary: { 'foo': true, 'bar': true, 'baz': true },
  toolbarImg: undefined as any, // cheating here and assuming tests won't use toolbarImg
  vert: '',
  frag: '',
}

export async function initAssets() {
  const toolbarImg = await imgProm('assets/toolbar.png');
  const vert = await grab('assets/vertex.vert');
  const frag = await grab('assets/fragment.frag');
  const wordlist = (await (await fetch('assets/dictionary.txt')).text())
    .split('\n').filter(x => x);
  const dictionary = Object.fromEntries(wordlist.map(word => [word, true]));
  assets = {
    dictionary,
    toolbarImg,
    vert,
    frag,
  };
}

export function getAssets(): Assets {
  return assets as Assets;
}
