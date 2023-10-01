import { initAssets } from "./core/assets";
import { clockedNextWake, ClockState, delayUntilTickMs, nowTicks, WakeTime } from './core/clock';
import { Action, Effect, GameState, mkState, SceneState, State } from "./core/model";
import { reduce } from './core/reduce';
import { key } from './ui/key';
import { logger } from './util/debug';
import { produce } from './util/produce';
import { inverse } from "./util/se2";
import { apply_to_rect } from "./util/se2-extra";
import { Rect } from "./util/types";



// return whether a evaluated at t-1 is equal to b at time t, sort of?
function equalWake(a: WakeTime, b: WakeTime): boolean {
  switch (a.t) {
    case 'live': return false;
    case 'infinite': return b.t == 'infinite';
    case 'tick': return b.t == 'tick' && b.tick == a.tick;
  }
}

class RenderPane {
  d: CanvasRenderingContext2D;
  constructor(public c: HTMLCanvasElement) {
    this.d = c.getContext('2d')!;
    c.width = 640;
    c.height = 480;
  }
  draw(state: SceneState) {
    const { c, d } = this;
    const rect_in_world: Rect = { p: { x: 0, y: 0 }, sz: { x: 1, y: 1 } };
    const rect_in_canvas = apply_to_rect(state.gameState.canvas_of_world, rect_in_world);
    d.fillStyle = 'white';
    d.fillRect(0, 0, 640, 480);
    d.fillStyle = 'black';
    d.fillRect(rect_in_canvas.p.x, rect_in_canvas.p.y, rect_in_canvas.sz.x, rect_in_canvas.sz.y);
  }
}

function make_pane(c: HTMLCanvasElement): RenderPane {
  return new RenderPane(c);
}

async function go() {

  await initAssets();

  let prevSceneState: SceneState | null = null; // think about optimizing rendering

  const c = document.getElementById('c') as HTMLCanvasElement;
  const pane = await make_pane(c);
  const state: State[] = [mkState()];

  function handleEffect(state: SceneState, effect: Effect): SceneState {
    return state;
    // switch (effect.t) {
    // }
  }

  function maybeRescheduleGame(priorState: GameState, state: GameState): GameState {
    return state;
  }

  function maybeReschedule(priorState: SceneState, state: SceneState): SceneState {
    if (state.t == 'game' && priorState.t == 'game') {
      return { t: 'game', gameState: maybeRescheduleGame(priorState.gameState, state.gameState), revision: state.revision };
    }
    else return state;
  }

  function dispatch(action: Action): void {
    let [sceneState, effects] = reduce(state[0].sceneState, action);

    sceneState = maybeReschedule(state[0].sceneState, sceneState);

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
    }
    pane.draw(state[0].sceneState);

    requestAnimationFrame(repaint);
  }

  requestAnimationFrame(repaint);
}

window.onload = go;
