import * as React from 'react';
import { useEffect } from 'react';
import { Dispatch } from '../core/action';
import { GameState } from '../core/state';
import { DEBUG } from '../util/debug';
import { relpos } from '../util/dutil';
import { GlEnv, glCopyCanvas } from './gl-common';
import { glInitialize, renderGlPane } from './gl-render';
import { rawPaint } from './render';
import { resizeView } from './ui-helpers';
import { CanvasInfo, useCanvas, useNonreactiveCanvasGl } from './use-canvas';
import { drawBubble } from './bubble-helpers';
import { exampleState } from '../core/exampleState';

export const NUM_PAGES = 2;

export type ForRenderState = GameState;
type CanvasProps = {
  main: ForRenderState,
};

export function Instructions(props: { dispatch: Dispatch, page: number }): JSX.Element {
  const { dispatch, page } = props;
  function mouseDownListener(e: MouseEvent) {
    if (DEBUG.instructions) {
      console.log(relpos(e, mc.current!.c));
    }
    else {
      const nextPage = page + 1;
      if (nextPage >= NUM_PAGES)
        dispatch({ t: 'setSceneState', state: { t: 'menu' } });
      else
        dispatch({ t: 'setSceneState', state: { t: 'instructions', page: nextPage } });
    }
    e.preventDefault();
    e.stopPropagation();
  }

  useEffect(() => {
    document.addEventListener('mousedown', mouseDownListener);
    return () => {
      document.removeEventListener('mousedown', mouseDownListener);
    }
  });


  function renderBubbles(ci: CanvasInfo, _props: {}) {
    const { d } = ci;
    d.save();
    d.scale(devicePixelRatio, devicePixelRatio);

    drawBubble(d, `This is the origin.\nAll tiles must connect here, and\nthe tile cannot be moved once placed.`,
      { x: 250, y: 100 }, { x: 170, y: 230 });

    drawBubble(d, `This is your hand.\nDrag tiles from here to\nmake intersecting words.`,
      { x: 470, y: 467 }, { x: 389, y: 734 });

    drawBubble(d, `Click in this space (or hit [spacebar])\n to get more tiles.`,
      { x: 670, y: 547 }, { x: 562, y: 734 });

    drawBubble(d, `This is the panic bar. When it\nruns out, you lose!\nYou\x27re safe when your hand is\nempty, and all tiles form words.`,
      { x: 263, y: 553 }, { x: 307, y: 682 });
    d.restore();
  }

  function render(ci: CanvasInfo, props: CanvasProps) {
    const { d } = ci;
    d.save();
    d.scale(devicePixelRatio, devicePixelRatio);
    rawPaint(mc.current!, props.main, true);
    d.restore();

    glCopyCanvas(glmc.current!.env, ci.c);
    renderGlPane(glmc.current!.ci, glmc.current!.env, state);
  }

  const state = exampleState();
  const [glcref, glmc] = useNonreactiveCanvasGl<GlEnv>(ci => glInitialize(ci, dispatch))
  const [cref, mc] = useCanvas<CanvasProps>(
    { main: state }, render, [state.coreState], ci => {
      dispatch({ t: 'resize', vd: resizeView(ci.c) });
    });

  const [bubcref, _bubmc] = useCanvas<{}>(
    {}, renderBubbles, [], ci => {
      dispatch({ t: 'resize', vd: resizeView(ci.c) });
    });


  if (page == 0) {

    const normalStyle: React.CSSProperties = {
      cursor: 'pointer',
      display: 'none',
      zIndex: 1000,
      position: 'absolute',
      top: 0,
      left: 0,
    };
    const glStyle: React.CSSProperties = {
      cursor: 'pointer',
      zIndex: 0,
      position: 'absolute',
      top: 0,
      left: 0,
    };
    const bubbleCanvasStyle: React.CSSProperties = {
      cursor: 'pointer',
      zIndex: 2000,
      position: 'absolute',
      top: 0,
      left: 0,
    };

    return <div className="inner-container">
      <canvas
        style={normalStyle}
        ref={cref} />
      <canvas
        style={glStyle}
        ref={glcref} />
      <canvas
        style={bubbleCanvasStyle}
        ref={bubcref} />

    </div>;
  }
  else if (page == 1) {
    const divStyle: React.CSSProperties = {
      backgroundColor: 'white',
      padding: '2em',
    };
    return <div style={divStyle}><h2>Shortcuts</h2>
      <br />
      <table className="instrTable">
        <tbody>
          <tr><td><span className="keycap">A</span></td><td>Drop first tile from hand where mouse is</td></tr>
          <tr><td><span className="keycap">K</span></td><td>Delete tile (costs one point)</td></tr>
          <tr><td><span className="keycap">Esc</span></td><td>Pointer Tool</td></tr>
          <tr><td><span className="keycap">V</span></td><td>Draw Vowel (if bonus available)</td></tr>
          <tr><td><span className="keycap">C</span></td><td>Draw Consonant (if bonus available)</td></tr>
          <tr><td><span className="keycap">X</span></td><td>Copy Tool</td></tr>
          <tr><td><span className="keycap">D</span></td><td>Dynamite Tool</td></tr>
          <tr><td><span className="keycap">B</span></td><td>Bomb Tool</td></tr>
          <tr><td><span className="keycap">Shift</span>&nbsp;<span className="keycap">D</span></td><td>Debug</td></tr>
          <tr><td><span className="keycap">`</span> or <span className="keycap">/</span></td><td>Flip orientation of dragged tile group</td></tr>
          <tr><td><span className="keycap">space</span></td><td>Draw Tile</td></tr>
          <tr><td>mouse wheel</td><td>Zoom in/out</td></tr>
          <tr><td>right mouse button</td><td>Pan</td></tr>
          <tr><td>right mouse button in hand</td><td>Shuffle</td></tr>
          <tr><td>(starting from tile) <span className="keycap">Alt</span>&nbsp;drag</td><td>Swap tiles</td></tr>
          <tr><td><span className="keycap">Shift</span>&nbsp;drag</td><td>Add to selection</td></tr>
          <tr><td><span className="keycap">Ctrl</span>&nbsp;drag</td><td>Subtract from selection</td></tr>
          <tr><td><span className="keycap">Shift</span>&nbsp;<span className="keycap">Ctrl</span>&nbsp;drag</td><td>Intersect with selection</td></tr>
        </tbody>
      </table>
    </div>;
  }
  else {
    throw new Error(`undefined instructions page ${page}`);
  }
}
