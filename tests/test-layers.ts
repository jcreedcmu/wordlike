import { Layer, getLayer, mkLayer } from '../src/core/layer';
import { vequal } from '../src/util/vutil';

describe('mkLayer', () => {
  test('should work', () => {

    const layer = mkLayer('bonus', p =>
      vequal(p, { x: 1, y: 10 }) || vequal(p, { x: -2, y: 20 }) ? "yes" : "no"
    )

    const layer2 = mkLayer('bonus2', p =>
      vequal(p, { x: 1, y: 10 }) || vequal(p, { x: -2, y: 20 }) ? "no" : "yes"
    )

    expect(getLayer(layer, { x: 1, y: 10 })).toBe("yes");
    expect(getLayer(layer2, { x: 1, y: 10 })).toBe("no"); // make sure no cache pollution
    expect(getLayer(layer, { x: -2, y: 20 })).toBe("yes");
    expect(getLayer(layer, { x: -2, y: 10 })).toBe("no");

  });;
});
