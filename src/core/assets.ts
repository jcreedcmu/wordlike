type Assets = {
  dictionary: Record<string, boolean>,
};

// Any data that goes here is effectively test data for consumption by
// unit tests. initAssets, which will be called early in
// initialization in actual execution, will overwrite it.
let assets: Assets = {
  dictionary: { 'foo': true, 'bar': true, 'baz': true },
}

export async function initAssets() {
  const wordlist = (await (await fetch('assets/dictionary.txt')).text())
    .split('\n').filter(x => x);
  assets = {
    dictionary: Object.fromEntries(wordlist.map(word => [word, true]))
  };
}

export function getAssets(): Assets {
  return assets as Assets;
}
