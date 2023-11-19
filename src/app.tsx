import * as React from 'react';
import { useEffect } from 'react';
import { Action, Dispatch, Effect } from './core/action';
import { reduce } from './core/reduce';
import { GameState, SceneState, mkSceneState } from './core/state';
import { currentTool } from './core/tools';
import { Instructions } from './ui/instructions';
import { key } from './ui/key';
import { paintWithScale } from './ui/render';
import { resizeView } from './ui/ui-helpers';
import { CanvasInfo, useCanvas } from './ui/use-canvas';
import { useEffectfulReducer } from './ui/use-effectful-reducer';
import { DEBUG } from './util/debug';
import { relpos } from './util/dutil';

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
    { main: state }, render, [state.coreState], ci => {
      dispatch({ t: 'resize', vd: resizeView(ci.c) });
    });

  function handleResize(e: UIEvent) {
    dispatch({ t: 'resize', vd: resizeView(mc.current!.c) });
  }

  function mouseDownListener(e: MouseEvent) {
    const mods = new Set<string>();
    if (e.ctrlKey)
      mods.add('ctrl');
    dispatch({ t: 'mouseDown', button: e.buttons, p: relpos(e, mc.current!.c), mods })
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
    interval = window.setInterval(intervalHandler, ANIMATION_INTERVAL_MS);

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
  function cursorOfState(state: GameState): CursorType {
    const tool = currentTool(state);
    if (tool == 'dynamite') {
      return 'url(assets/dynamite-cursor.png) 16 16, pointer';
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

  const style: React.CSSProperties =
  {
    cursor: cursorOfState(state)
  };
  return <div>
    <canvas
      style={style}
      ref={cref} />
  </div>;
}

function render(ci: CanvasInfo, props: CanvasProps) {
  paintWithScale(ci, props.main);
}



export function doEffect(state: SceneState, dispatch: (action: Action) => void, effect: Effect): void {
  return;
  // switch (effect.t) {
  // }
}
