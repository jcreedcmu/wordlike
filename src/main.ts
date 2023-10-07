import { initAssets } from "./core/assets";
import { WakeTime } from './core/clock';
import { Action, Effect, mkState, SceneState, State } from "./core/state";
import { reduce } from './core/reduce';
import { eph_canvas_from_world_of_state } from "./ui/view_helpers";
import { key } from './ui/key';
import { logger } from './util/debug';
import { produce } from './util/produce';
import { apply_to_rect } from "./util/se2-extra";
import { Rect } from "./util/types";
import { apply, inverse } from './util/se2';
import { vm } from "./util/vutil";
import { relpos } from "./util/dutil";
import { make_pane } from "./ui/render";

// return whether a evaluated at t-1 is equal to b at time t, sort of?
function equalWake(a: WakeTime, b: WakeTime): boolean {
  switch (a.t) {
    case 'live': return false;
    case 'infinite': return b.t == 'infinite';
    case 'tick': return b.t == 'tick' && b.tick == a.tick;
  }
}


async function go() {

  await initAssets();

  let prevSceneState: SceneState | null = null; // think about optimizing rendering

  document.addEventListener('mouseup', mouseUpListener);
  document.addEventListener('mousemove', mouseMoveListener);

  function mouseDownListener(e: MouseEvent) {
    dispatch({ t: 'mouseDown', p: relpos(e, c) })
  }
  function mouseUpListener(e: MouseEvent) {
    dispatch({ t: 'mouseUp', p: relpos(e, c) })
  }
  function mouseMoveListener(e: MouseEvent) {
    dispatch({ t: 'mouseMove', p: relpos(e, c) })
  }

  const c = document.getElementById('c') as HTMLCanvasElement;
  c.addEventListener('mousedown', mouseDownListener);
  const pane = await make_pane(c);
  const state: State[] = [mkState()];

  function handleEffect(state: SceneState, effect: Effect): SceneState {
    return state;
    // switch (effect.t) {
    // }
  }

  function dispatch(action: Action): void {
    let [sceneState, effects] = reduce(state[0].sceneState, action);
    effects.forEach(e => {
      sceneState = handleEffect(sceneState, e);
    });

    state[0] = produce(state[0], s => { s.sceneState = sceneState; });

  }
  window.onkeydown = (k: KeyboardEvent) => {
    dispatch({ t: 'key', code: key(k) });
  }

  function repaint() {
    let screen: Screen | undefined = undefined;
    if (state[0].sceneState == prevSceneState) {
      // Do nothing here. We don't need to rerender the Screen.
      //
      // this equality check seems to work ok, but I'm a little
      // nervous about whether immer (and/or my pattern of use of it)
      // really guarantees different data
      // to be referentially different.
    }
    else {
      logger('rendering', `Rendering screen. This shouldn't be constant.`);
      prevSceneState = state[0].sceneState;
      pane.draw(state[0].sceneState);
    }

    requestAnimationFrame(repaint);
  }

  requestAnimationFrame(repaint);
}

window.onload = go;
