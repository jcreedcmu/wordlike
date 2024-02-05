import { LayoutTree, layout, nameRect } from '../src/ui/layout';
import { Rect } from '../src/util/types';

describe('horizontal layout', () => {
  test('should work with stretch glue to the left', () => {
    const tree: LayoutTree = {
      t: 'horiz', kids: [
        { t: 'rect', single: { stretch: { x: 1, y: 0 } } },
        nameRect('foo',
          { t: 'rect', single: { base: { x: 100, y: 100 } } }),
      ]
    };
    const rect: Rect = { p: { x: 3, y: 5 }, sz: { x: 200, y: 100 } };
    const result = layout(rect, tree);
    expect(result.foo).toEqual({
      p: { x: 103, y: 5 },
      sz: { x: 100, y: 100 },
    });
  });

  test('should work with stretch glue to the right', () => {
    const tree: LayoutTree = {
      t: 'horiz', kids: [
        nameRect('foo',
          { t: 'rect', single: { base: { x: 100, y: 100 } } }),
        { t: 'rect', single: { stretch: { x: 1, y: 0 } } },
      ]
    };
    const rect: Rect = { p: { x: 3, y: 5 }, sz: { x: 200, y: 100 } };
    const result = layout(rect, tree);
    expect(result.foo).toEqual({
      p: { x: 3, y: 5 },
      sz: { x: 100, y: 100 },
    });
  });

  test('should work with stretch glue to the left and right', () => {
    const tree: LayoutTree = {
      t: 'horiz', kids: [
        { t: 'rect', single: { stretch: { x: 1, y: 0 } } },
        nameRect('foo',
          { t: 'rect', single: { base: { x: 100, y: 100 } } }),
        { t: 'rect', single: { stretch: { x: 2, y: 0 } } },
        { t: 'rect', single: { stretch: { x: 1, y: 0 } } },
      ]
    };
    const rect: Rect = { p: { x: 3, y: 5 }, sz: { x: 200, y: 100 } };
    const result = layout(rect, tree);
    expect(result.foo).toEqual({
      p: { x: 3 + 25, y: 5 },
      sz: { x: 100, y: 100 },
    });
  });

});

describe('vertical layout', () => {

  test('should work with stretch glue above and below', () => {
    const tree: LayoutTree = {
      t: 'vert', kids: [
        { t: 'rect', single: { stretch: { x: 1, y: 1 } } },
        nameRect('foo',
          { t: 'rect', single: { base: { x: 100, y: 100 } } }),
        { t: 'rect', single: { stretch: { x: 2, y: 2 } } },
        { t: 'rect', single: { stretch: { x: 1, y: 1 } } },
      ]
    };
    const rect: Rect = { p: { x: 3, y: 5 }, sz: { x: 100, y: 200 } };
    const result = layout(rect, tree);
    expect(result.foo).toEqual({
      p: { x: 3, y: 5 + 25 },
      sz: { x: 100, y: 100 },
    });
  });


  test('should work with shrink glue', () => {
    const tree: LayoutTree = {
      t: 'vert', kids: [
        { t: 'rect', single: { base: { x: 100, y: 100 }, shrink: { x: 0, y: 1 } } },
        nameRect('foo',
          { t: 'rect', single: { base: { x: 100, y: 100 } } }),
      ]
    };
    const rect: Rect = { p: { x: 0, y: 0 }, sz: { x: 100, y: 110 } };
    const result = layout(rect, tree);
    expect(result.foo).toEqual({
      p: { x: 0, y: 10 },
      sz: { x: 100, y: 100 },
    });
  });

});
