import { apply, SE2 } from "./se2";
import { Rect } from "./types";
import { vm2 } from "./vutil";

export function apply_to_rect(a: SE2, x: Rect): Rect {
  return {
    p: apply(a, x.p),
    sz: vm2(a.scale, x.sz, (s, sz) => s * sz)
  }
}
