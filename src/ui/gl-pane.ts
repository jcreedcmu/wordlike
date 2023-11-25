import { Dispatch } from "../core/action";
import { GameState } from "../core/state";
import { resizeView } from "./ui-helpers";
import { CanvasGlInfo } from "./use-canvas";

export type GlEnv = {

}
export function renderGlPane(ci: CanvasGlInfo, env: GlEnv, state: GameState) {

}

export function glInitialize(ci: CanvasGlInfo, dispatch: Dispatch): GlEnv {
  dispatch({ t: 'resize', vd: resizeView(ci.c) });
  const { d: gl } = ci;
  gl.clearColor(0.3, 0.3, 0.3, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return {};
}
