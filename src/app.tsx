import * as React from 'react';
import { useEffect } from 'react';
import { Action, Dispatch, Effect } from './core/action';
import { reduce } from './core/reduce';
import { GameState, MouseState, SceneState, mkSceneState } from './core/state';
import { Instructions } from './ui/instructions';
import { key } from './ui/key';
import { paint } from './ui/render';
import { CanvasInfo, useCanvas } from './ui/use-canvas';
import { useEffectfulReducer } from './ui/use-effectful-reducer';
import { canvas_bds_in_canvas } from './ui/widget-helpers';
import { DEBUG } from './util/debug';
import { relpos } from './util/dutil';
import { Point } from './util/types';
import { vint } from './util/vutil';

export type GameProps = {
  state: GameState,
  dispatch: Dispatch,
}

export type ForRenderState = GameState;
type CanvasProps = {
  main: ForRenderState,
};

export function App(props: {}): JSX.Element {
  const [state, dispatch] = useEffectfulReducer<Action, SceneState, Effect>(mkSceneState(), reduce, doEffect);

  if (DEBUG.stateExporter) {
    (window as any).state = () => { return state; }
  }

  switch (state.t) {
    case 'menu': {
      const style: React.CSSProperties = {
        backgroundColor: 'white',
        padding: 15,
        border: '1px solid gray',
        borderRadius: 10,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        cursor: 'pointer',
      };
      return <div style={{ textAlign: 'center', fontSize: 48, fontFamily: 'sans-serif' }}>
        Wordlike<p />
        <button style={style} onClick={() => dispatch({ t: 'newGame' })}>Start Game</button>
        <p /><p />
        <button style={style} onClick={() => dispatch({ t: 'setSceneState', state: { t: 'instructions' } })}>Instructions</button>
      </div>;
    }
    case 'game':
      return <Game dispatch={dispatch} state={state.gameState} />;
    case 'instructions': {
      return <Instructions dispatch={dispatch} />;
    }
  }
}

export function Game(props: GameProps): JSX.Element {
  const { state, dispatch } = props;
  const [cref, mc] = useCanvas<CanvasProps>(
    { main: state }, render, [state], ci => {
      dispatch({ t: 'resize', vd: resizeView(ci.c) });
    });

  function handleResize(e: UIEvent) {
    dispatch({ t: 'resize', vd: resizeView(mc.current!.c) });
  }

  function mouseDownListener(e: MouseEvent) {
    dispatch({ t: 'mouseDown', button: e.buttons, p: relpos(e, mc.current!.c) })
    e.preventDefault();
    e.stopPropagation();
  }

  function contextMenuListener(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  function mouseUpListener(e: MouseEvent) {
    dispatch({ t: 'mouseUp', p: relpos(e, mc.current!.c) })
  }
  function mouseMoveListener(e: MouseEvent) {
    dispatch({ t: 'mouseMove', p: relpos(e, mc.current!.c) })
  }
  function wheelListener(e: WheelEvent) {
    dispatch({ t: 'wheel', p: relpos(e, mc.current!.c), delta: e.deltaY })
  }

  function keyListener(k: KeyboardEvent) {
    dispatch({ t: 'key', code: key(k) });
  }

  function intervalHandler() {
    dispatch({ t: 'repaint' });
  }

  let interval: number | undefined = undefined;
  useEffect(() => {

    document.addEventListener('mouseup', mouseUpListener);
    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mousedown', mouseDownListener);
    document.addEventListener('contextmenu', contextMenuListener);
    document.addEventListener('wheel', wheelListener);
    document.addEventListener('keydown', keyListener);
    window.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    interval = setInterval(intervalHandler, 200);

    return () => {
      document.removeEventListener('mouseup', mouseUpListener);
      document.removeEventListener('mousemove', mouseMoveListener);
      document.removeEventListener('mousedown', mouseDownListener);
      document.removeEventListener('contextmenu', contextMenuListener);
      document.removeEventListener('wheel', wheelListener);
      document.removeEventListener('keydown', keyListener);
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
      console.log('clearing interval');
    };
  }, []);

  type CursorType = React.CSSProperties['cursor'];
  function cursorOfMouseState(ms: MouseState): CursorType {
    switch (ms.t) {
      case 'up': return undefined;
      case 'drag_world': return 'grab';
      case 'drag_main_tile': return 'pointer';
      case 'drag_hand_tile': return 'pointer';
    }
  }

  const style: React.CSSProperties =
    { cursor: cursorOfMouseState(state.mouseState) };
  return <div>
    <canvas
      style={style}
      ref={cref} />
  </div>;
}

function render(ci: CanvasInfo, props: CanvasProps) {
  paint(ci, props.main);
}

export type ViewData = {
  wsize: Point,
};

export function resizeView(c: HTMLCanvasElement): ViewData {
  const ratio = devicePixelRatio;

  const parent = c.parentElement?.getBoundingClientRect();
  const w = canvas_bds_in_canvas.sz.x;
  const h = canvas_bds_in_canvas.sz.y;

  c.width = w;
  c.height = h;

  const ow = w;
  const oh = h;

  c.width = ow * ratio;
  c.height = oh * ratio;

  c.style.width = ow + 'px';
  c.style.height = oh + 'px';

  const wsize = vint({ x: c.width / ratio, y: c.height / ratio });

  return { wsize };
}

export function doEffect(state: SceneState, dispatch: (action: Action) => void, effect: Effect): void {
  return;
  // switch (effect.t) {
  // }
}
