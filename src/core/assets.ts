import { imgProm } from "../util/dutil";

type Assets = {
  dictionary: Record<string, boolean>,
  toolbarImg: HTMLImageElement,
};

// Any data that goes here is effectively test data for consumption by
// unit tests. initAssets, which will be called early in
// initialization in actual execution, will overwrite it.
let assets: Assets = {
  dictionary: { 'foo': true, 'bar': true, 'baz': true },
  toolbarImg: undefined as any, // cheating here and assuming tests won't use toolbarImg
}

export async function initAssets() {
  const toolbarImg = await imgProm('assets/toolbar.png');
  const wordlist = (await (await fetch('assets/dictionary.txt')).text())
    .split('\n').filter(x => x);
  const dictionary = Object.fromEntries(wordlist.map(word => [word, true]));
  assets = {
    dictionary,
    toolbarImg,
  };
}

export function getAssets(): Assets {
  return assets as Assets;
}
