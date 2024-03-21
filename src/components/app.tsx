import * as React from 'react';
import { useEffect } from 'react';
import { Action, Dispatch } from '../core/action';
import { Effect, SoundEffect } from '../core/effect-types';
import { keyCaptured, reduce } from '../core/reduce';
import { GameState } from '../core/state';
import { SceneState, mkSceneState } from '../core/scene-state';
import { getCurrentTool } from '../core/tools';
import { GlEnv, glCopyCanvas } from '../ui/gl-common';
import { glInitialize, renderGlPane } from '../ui/gl-render';
import { key } from '../ui/key';
import { paintWithScale } from '../ui/render';
import { resizeView } from '../ui/ui-helpers';
import { CanvasGlInfo, CanvasInfo, useCanvas, useCanvasGl, useNonreactiveCanvasGl } from '../ui/use-canvas';
import { useEffectfulReducer } from '../ui/use-effectful-reducer';
import { DEBUG } from '../util/debug';
import { relpos } from '../util/dutil';
import { BugReport } from './bug-report';
import { Settings } from './settings';
import { Instructions } from './instructions';
import { getWidgetPoint } from '../layout/widget-helpers';
import { soundService } from '../sound/sound';
import { unreachable } from '../util/util';

const ANIMATION_INTERVAL_MS = 35;

export type GameProps = {
  state: GameState,
  dispatch: Dispatch,
}

export type ForRenderState = GameState;
type CanvasProps = {
  main: ForRenderState,
};

export function App(_props: {}): JSX.Element {
  const [state, dispatch] = useEffectfulReducer<Action, SceneState, Effect>(mkSceneState(), reduce, doEffect);

  if (DEBUG.stateExporter) {
    (window as any).state = () => { return state; }
  }
  if (DEBUG.stateImporter) {
    (window as any).importState = (state: SceneState) => { dispatch({ t: 'setSceneState', state }); }
  }

  switch (state.t) {
    case 'menu': {

      const githubLink = `<a href="https://github.com/jcreedcmu/wordlike">
<svg width="80" height="80"
   viewBox="0 0 250 250"
   style="z-index: 1000; fill:#000; position: absolute; top: 0; border: 0; right: 0;"
   aria-hidden="true">
<path d="M 0 0 L 36.80 36.80 C 36.76 36.83 37.98 37.27 38.33 36.92 L 40.66 34.60 C 36.53 31.71 38.08 28.67 38.08 28.67 C 39.04 26.46 38.56 25.15 38.56 25.15 C 38.14 23.04 39.48 24.41 39.48 24.41 C 40.73 25.88 40.16 27.93 40.16 27.93 C 39.43 30.80 41.20 32.21 42.48 32.81 L 42.78 32.51 C 43.80 31.74 44.76 31.48 45.50 31.55 C 42.81 28.16 40.79 23.80 46.01 18.56 C 47.51 17.08 49.27 16.38 51.10 16.32 C 51.29 15.80 52.22 13.95 54.84 12.83 C 54.84 12.83 56.35 13.60 57.21 17.98 C 58.59 18.75 59.90 19.77 61.08 20.92 C 62.23 22.07 63.26 23.42 64.03 24.83 C 68.41 25.66 69.21 27.16 69.21 27.16 C 68.06 29.79 66.20 30.72 65.72 30.91 C 65.63 32.76 64.95 34.49 63.45 36 C 58.20 41.24 53.85 39.19 50.46 36.51 C 50.52 37.40 50.14 38.68 48.86 39.96 L 45.11 43.67 C 44.73 44.06 45.31 45.40 45.37 45.37 L 80 80 L 80 0 L 0 0 z " transform="scale(3.125)"/></svg></a>`;

      return (
        <span>
          <div dangerouslySetInnerHTML={{ __html: githubLink }}></div>
          <div className="container">
            <img src="assets/title.png" className="hero" /><br />
          </div>
          <div className="buttons-container">
            <div style={{ textAlign: 'center', fontSize: 48, fontFamily: 'sans-serif' }}>
              <button onClick={() => dispatch({ t: 'newGame' })}>Start Game</button>
              <p /><p />
              <button onClick={() => dispatch({ t: 'newGame', creative: true })}>Start Game (Sandbox Mode)</button>
              <p /><p />
              <button onClick={() => dispatch({ t: 'setSceneState', state: { t: 'instructions', page: 0 } })}>Instructions</button>
            </div>
          </div>
        </span>);
    }
    case 'game': {
      return <div className="game-container"><Game dispatch={dispatch} state={state.gameState} /></div>;
    }
    case 'instructions': {
      return <div className="game-container"><Instructions page={state.page} dispatch={dispatch} /></div>;
    }
  }
}

function glRender(ci: CanvasGlInfo, env: GlEnv, props: CanvasProps): void {
  if (props.main.coreState.slowState.renderToGl && !DEBUG.fastAnimation) {
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

  const canvasDependency = (state.coreState.slowState.renderToGl && !DEBUG.noRenderSlowState)
    ? state.coreState.slowState
    : state.coreState;

  const render = (ci: CanvasInfo, props: CanvasProps) => {
    paintWithScale(ci, props.main, props.main.coreState.slowState.renderToGl);
    glCopyCanvas(glmc.current!.env, ci.c);
  };

  const [cref, mc] = useCanvas<CanvasProps>(
    { main: state }, render, [canvasDependency], ci => {
      dispatch({ t: 'resize', vd: resizeView(ci.c) });
    });

  const cs = state.coreState;

  function withCanvas(k: (c: HTMLCanvasElement) => void): void {
    if (!cs.slowState.renderToGl && mc.current) {
      k(mc.current.c);
    }
    else if (cs.slowState.renderToGl && glmc.current) {
      k(glmc.current.ci.c);
    }
  }

  function handleResize(_e: UIEvent) {
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
    dispatch({ t: 'tick' });
    if (DEBUG.fastAnimation) {
      if (!going) {
        console.log('abandoning requestanimationframe loop');
        return;
      }
      if (glmc.current) {
        const state = stateRef.current;
        renderGlPane(glmc.current.ci, glmc.current.env, state);
        const n = state.coreState._cacheUpdateQueue.length;
        if (n > 0)
          dispatch({ t: 'popCacheUpdateQueue', n });
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

    const wp = getWidgetPoint(state.coreState, state.mouseState.p_in_canvas);
    if (wp.t != 'world' && wp.t != 'toolbar' && wp.t != 'hand')
      return 'pointer';

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
    if (tool == 'magnifying-glass') {
      return 'zoom-in';
    }
    switch (state.mouseState.t) {
      case 'up': return undefined;
      case 'drag_world': return 'grab';
      case 'drag_mobile': return 'pointer';
    }
  }

  const normalStyle: React.CSSProperties = {
    cursor: cursorOfState(state),
    display: state.coreState.slowState.renderToGl ? 'none' : undefined,
    zIndex: 1000,
    position: 'absolute',
    top: 0,
    left: 0,
  };
  const glStyle: React.CSSProperties = {
    cursor: cursorOfState(state),
    display: state.coreState.slowState.renderToGl ? undefined : 'none',
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
  const bugReport = state.coreState.modals.bugReport;
  const bugReportModal = bugReport ? <BugReport dispatch={dispatch} {...bugReport} /> : undefined;
  const settings = state.coreState.modals.settings;
  const settingsModal = settings ? <Settings dispatch={dispatch} settings={state.coreState.settings} /> : undefined;
  return <div className="inner-container">
    {normalCanvas}
    {glCanvas}
    {bugReportModal}
    {settingsModal}
  </div>;
}

export function doSoundEffect(se: SoundEffect): void {
  switch (se.t) {
    case 'click': soundService.click(); return;
    case 'beep': soundService.beep(); return;
    case 'setGain': soundService.setGain(se.gain); return;
    default: unreachable(se);
  }
}

export function doEffect(_state: SceneState, _dispatch: (action: Action) => void, effect: Effect): void {
  switch (effect.t) {
    case 'none': return;
    case 'soundEffect': doSoundEffect(effect.sound); return;
    default: unreachable(effect);
  }
}
