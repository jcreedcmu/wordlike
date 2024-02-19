import { gl_from_canvas } from "../src/ui/gl-helpers";
import { apply } from "../src/util/se2";


describe('canvas_from_gl', () => {
  test('should map points as expected', () => {

    expect(apply(gl_from_canvas, { x: 0, y: 0 })).toEqual({ x: -1, y: 1 });
    expect(apply(gl_from_canvas, { x: 1024, y: 0 })).toEqual({ x: 1, y: 1 });

    expect(apply(gl_from_canvas, { x: 0, y: 768 })).toEqual({ x: -1, y: -1 });
    expect(apply(gl_from_canvas, { x: 1024, y: 768 })).toEqual({ x: 1, y: -1 });

  });

});
