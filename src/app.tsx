import * as React from 'react';
import { useEffect } from 'react';
import { reduce } from './core/reduce';
import { Action, Effect, MouseState, SceneState, mkGameState } from './core/state';
import { CanvasInfo, useCanvas } from './ui/use-canvas';
import { useEffectfulReducer } from './ui/use-effectful-reducer';
import { relpos, rrelpos } from './util/dutil';
import { paint } from './ui/render';
import { Point } from './util/types';
import { vint } from './util/vutil';
import { key } from './ui/key';

export type AppProps = {
}

export type ForRenderState = SceneState;
type CanvasProps = {
  main: ForRenderState,
};


export function App(props: AppProps): JSX.Element {

  const [state, dispatch] = useEffectfulReducer<Action, SceneState, Effect>(mkGameState(), reduce, doEffect);
  const [cref, mc] = useCanvas<CanvasProps>(
    { main: state }, render, [state], ci => {
      dispatch({ t: 'resize', vd: resizeView(ci.c) });
    });

  function handleResize(e: UIEvent) {
    dispatch({ t: 'resize', vd: resizeView(mc.current!.c) });
  }

  function mouseDownListener(e: MouseEvent) {
    dispatch({ t: 'mouseDown', p: relpos(e, mc.current!.c) })
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

  useEffect(() => {

    document.addEventListener('mouseup', mouseUpListener);
    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mousedown', mouseDownListener);
    document.addEventListener('wheel', wheelListener);
    document.addEventListener('keydown', keyListener);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mouseup', mouseUpListener);
      document.removeEventListener('mousemove', mouseMoveListener);
      document.removeEventListener('mousedown', mouseDownListener);
      document.removeEventListener('wheel', wheelListener);
      document.removeEventListener('keydown', keyListener);
      window.removeEventListener('resize', handleResize);

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
    { cursor: cursorOfMouseState(state.gameState.mouseState) };
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
  const w = 640;
  const h = 480;

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
