import { doOnceEvery } from "../src/util/debug";

describe('doOnceEvery', () => {
  test('work as expected', () => {

    let x = 0;
    for (let i = 0; i < 100; i++) {
      doOnceEvery('foo', 3, () => {
        x++;
      });
    }
    expect(x).toEqual(34);
  });
});
