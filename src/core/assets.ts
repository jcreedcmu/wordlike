type Assets = {
};

// Any data that goes here is effectively test data for consumption by
// unit tests. initAssets, which will be called early in
// initialization in actual execution, will overwrite it.
let assets: Assets = {
}

export async function initAssets() {
}

export function getAssets(): Assets {
  return assets as Assets;
}
