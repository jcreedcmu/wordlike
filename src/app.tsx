import * as React from 'react';
import { useEffect } from 'react';
import { Action, Dispatch, Effect } from './core/action';
import { keyCaptured, reduce } from './core/reduce';
import { GameState, SceneState, mkSceneState } from './core/state';
import { getCurrentTool } from './core/tools';
import { Instructions } from './ui/instructions';
import { key } from './ui/key';
import { paintWithScale } from './ui/render';
import { resizeView } from './ui/ui-helpers';
import { CanvasGlInfo, CanvasInfo, useCanvas, useCanvasGl, useNonreactiveCanvasGl } from './ui/use-canvas';
import { useEffectfulReducer } from './ui/use-effectful-reducer';
import { DEBUG } from './util/debug';
import { relpos } from './util/dutil';
import { glInitialize, renderGlPane } from './ui/gl-render';
import { GlEnv } from './ui/gl-common';

const ANIMATION_INTERVAL_MS = 35;

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
  if (DEBUG.stateImporter) {
    (window as any).importState = (state: SceneState) => { dispatch({ t: 'setSceneState', state }); }
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

      const githubLink = `<a href="https://github.com/jcreedcmu/wordlike"><svg width="80" height="80" viewBox="0 0 250 250" style="fill:#151513; color:#878787; position: absolute; top: 0; border: 0; right: 0;" aria-hidden="true"><path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path><path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path><path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path></svg></a>`;

      return <div style={{ textAlign: 'center', fontSize: 48, fontFamily: 'sans-serif' }}>
        <div dangerouslySetInnerHTML={{ __html: githubLink }}></div>
        Wordlike<p />
        <button style={style} onClick={() => dispatch({ t: 'newGame' })}>Start Game</button>
        <p /><p />
        <button style={style} onClick={() => dispatch({ t: 'newGame', creative: true })}>Start Game (Sandbox Mode)</button>
        <p /><p />
        <button style={style} onClick={() => dispatch({ t: 'setSceneState', state: { t: 'instructions', page: 0 } })}>Instructions</button>
      </div>;
    }
    case 'game':
      return <Game dispatch={dispatch} state={state.gameState} />;
    case 'instructions': {
      return <Instructions page={state.page} dispatch={dispatch} />;
    }
  }
}

function glRender(ci: CanvasGlInfo, env: GlEnv, props: CanvasProps): void {
  if (props.main.coreState.renderToGl && !DEBUG.fastAnimation) {
    renderGlPane(ci, env, props.main);
  }
}

export function Game(props: GameProps): JSX.Element {
  const { state, dispatch } = props;
  const stateRef = React.useRef(state);
  useEffect(() => {
    // This effect runs whenever state changes
    stateRef.current = state;
  }, [state]);

  let going = true;


  const [glcref, glmc] = DEBUG.fastAnimation
    ? useNonreactiveCanvasGl<GlEnv>(ci => glInitialize(ci, dispatch))
    : useCanvasGl<CanvasProps, GlEnv>(
      { main: state }, glRender, [state.coreState], ci => glInitialize(ci, dispatch));

  const [cref, mc] = useCanvas<CanvasProps>(
    { main: state }, render, [state.coreState], ci => {
      dispatch({ t: 'resize', vd: resizeView(ci.c) });
    });

  const cs = state.coreState;

  function withCanvas(k: (c: HTMLCanvasElement) => void): void {
    if (!cs.renderToGl && mc.current) {
      k(mc.current.c);
    }
    else if (cs.renderToGl && glmc.current) {
      k(glmc.current.ci.c);
    }
  }

  function handleResize(e: UIEvent) {
    withCanvas(c => dispatch({ t: 'resize', vd: resizeView(c) }));
  }

  function reactMouseDownListener(e: React.PointerEvent) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

    withCanvas(c => {
      const mods = new Set<string>();
      if (e.ctrlKey)
        mods.add('ctrl');
      if (e.shiftKey)
        mods.add('shift');
      if (e.altKey)
        mods.add('meta');
      if (e.metaKey)
        mods.add('meta');
      dispatch({ t: 'mouseDown', button: e.buttons, p: relpos(e.nativeEvent, c), mods })
      e.preventDefault();
      e.stopPropagation();
    });
  }

  function contextMenuListener(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  function dblclickListener(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  function reactMouseUpListener(e: React.PointerEvent) {
    (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    withCanvas(c => dispatch({ t: 'mouseUp', p: relpos(e.nativeEvent, c) }));
  }
  function reactMouseMoveListener(e: React.PointerEvent) {
    withCanvas(c => dispatch({ t: 'mouseMove', p: relpos(e.nativeEvent, c) }));
  }

  function reactWheelListener(e: React.WheelEvent) {
    withCanvas(c => dispatch({ t: 'wheel', p: relpos(e.nativeEvent, c), delta: e.deltaY }));
  }

  function keyListener(k: KeyboardEvent) {
    const code = key(k);
    dispatch({ t: 'key', code });
    if (keyCaptured(code)) {
      k.preventDefault();
      k.stopPropagation();
    }
  }

  function intervalHandler() {
    dispatch({ t: 'repaint' });
    if (DEBUG.fastAnimation) {
      if (!going) {
        console.log('abandoning requestanimationframe loop');
      }
      if (glmc.current) {
        renderGlPane(glmc.current.ci, glmc.current.env, stateRef.current);
      }
      window.requestAnimationFrame(intervalHandler);
    }

  }

  let interval: number | undefined = undefined;
  useEffect(() => {

    document.addEventListener('dblclick', dblclickListener);
    document.addEventListener('contextmenu', contextMenuListener);
    document.addEventListener('keydown', keyListener);
    window.addEventListener('resize', handleResize);

    if (DEBUG.fastAnimation) {
      window.requestAnimationFrame(intervalHandler);
    }
    else {
      interval = window.setInterval(intervalHandler, ANIMATION_INTERVAL_MS);
    }

    return () => {
      document.removeEventListener('dblclick', dblclickListener);
      document.removeEventListener('contextmenu', contextMenuListener);
      document.removeEventListener('keydown', keyListener);
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
      going = false;
      if (DEBUG.interval)
        console.log('clearing interval');
    };
  }, []);

  type CursorType = React.CSSProperties['cursor'];
  function cursorOfState(state: GameState): CursorType {
    const tool = getCurrentTool(state.coreState);
    if (tool == 'dynamite') {
      return 'url(assets/dynamite-cursor.png) 16 16, pointer';
    }
    if (tool == 'bomb') {
      return 'url(assets/bomb-cursor.png) 16 16, pointer';
    }
    if (tool == 'copy') {
      return 'url(assets/copy-cursor.png) 8 8, pointer';
    }
    if (tool == 'hand') {
      return 'grab';
    }
    switch (state.mouseState.t) {
      case 'up': return undefined;
      case 'drag_world': return 'grab';
      case 'drag_tile': return 'pointer';
    }
  }

  const normalStyle: React.CSSProperties = {
    cursor: cursorOfState(state),
    display: state.coreState.renderToGl ? undefined : undefined,
    zIndex: 1000,
    position: 'absolute',
    top: 0,
    left: 0,
  };
  const glStyle: React.CSSProperties = {
    cursor: cursorOfState(state),
    display: state.coreState.renderToGl ? undefined : 'none',
    zIndex: 0,
    position: 'absolute',
    top: 0,
    left: 0,
  };

  const normalCanvas = <canvas
    onPointerDown={reactMouseDownListener}
    onPointerUp={reactMouseUpListener}
    onPointerMove={reactMouseMoveListener}
    onWheel={reactWheelListener}
    key="normal"
    style={normalStyle}
    ref={cref} />;
  const glCanvas = <canvas
    onPointerDown={reactMouseDownListener}
    onPointerUp={reactMouseUpListener}
    onPointerMove={reactMouseMoveListener}
    onWheel={reactWheelListener}
    key="gl"
    style={glStyle}
    ref={glcref} />;
  return <div className="inner-container">
    {normalCanvas}
    {glCanvas}
  </div>;
}

function render(ci: CanvasInfo, props: CanvasProps) {
  paintWithScale(ci, props.main, props.main.coreState.renderToGl);
}



export function doEffect(state: SceneState, dispatch: (action: Action) => void, effect: Effect): void {
  return;
  // switch (effect.t) {
  // }
}
