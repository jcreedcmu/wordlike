import * as React from 'react';
import { useEffect } from 'react';
import { Dispatch } from '../core/action';
import { PANIC_INTERVAL_MS } from '../core/clock';
import { mkGridOf } from '../core/grid';
import { GameState, Tile } from '../core/state';
import { addHandTiles, addWorldTiles, checkValid, resolveValid, withCoreState } from '../core/state-helpers';
import { ensureTileId } from "../core/tile-helpers";
import { DEBUG } from '../util/debug';
import { relpos } from '../util/dutil';
import * as SE1 from '../util/se1';
import { Point } from '../util/types';
import { rawPaint } from './render';
import { resizeView } from './ui-helpers';
import { CanvasInfo, useCanvas } from './use-canvas';
import { produce } from '../util/produce';

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


  const state = exampleState();
  const [cref, mc] = useCanvas<CanvasProps>(
    { main: state }, render, [state], ci => {
      dispatch({ t: 'resize', vd: resizeView(ci.c) });
    });

  if (page == 0) {
    return <div>
      <canvas
        style={{ cursor: 'pointer' }}
        ref={cref} />
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

function render(ci: CanvasInfo, props: CanvasProps) {
  const { d } = ci;
  d.save();
  d.scale(devicePixelRatio, devicePixelRatio);
  rawPaint(ci, props.main);

  drawBubble(ci, `This is the origin.\nAll tiles must connect here, and\nthe tile cannot be moved once placed.`,
    { x: 250, y: 100 }, { x: 170, y: 230 });

  drawBubble(ci, `This is your hand.\nDrag tiles from here to\nmake intersecting words.`,
    { x: 670, y: 197 }, { x: 732, y: 140 });

  drawBubble(ci, `Click in this space (or hit [spacebar])\n to get more tiles.`,
    { x: 670, y: 347 }, { x: 732, y: 290 });

  drawBubble(ci, `This is the panic bar. When it\nruns out, you lose!\nYou\x27re safe when your hand is\nempty, and all tiles form words.`,
    { x: 163, y: 453 }, { x: 301, y: 593 });
  d.restore();
}

function exampleState(): GameState {
  const state: GameState = {
    coreState: {
      animations: [],
      currentTool: 'pointer',
      invalidWords: [],
      tile_entities: {},
      connectedSet: mkGridOf([]),
      energies: {
        byLetter: [
          -0.20972339977922094,
          0.7840271889992784,
          1.3068528194400546,
          0.3068528194400547,
          0.5636791674230779,
          1.6534264097200273,
          0.3068528194400547,
          0.7840271889992784,
          0.6791654891096679,
          4,
          4,
          1.1041202653859723,
          0.7840271889992784,
          0.4602792291600821,
          0.4602792291600821,
          0.7840271889992784,
          4,
          0.4602792291600821,
          -0.0047189562170500965,
          -0.039720770839917874,
          0.79528104378295,
          1.6534264097200273,
          1.6534264097200273,
          4,
          1.6534264097200273,
          0
        ],
        byClass: [0, 0,],
      },
      seed: 1533311107,
      bonusLayerSeed: 46,
      canvas_from_world: {
        scale: {
          x: 39.6694214876033,
          y: 39.6694214876033
        },
        translate: {
          x: 150.80991735537191,
          y: 215.56198347107437
        }
      },
      game_from_clock: SE1.ident(),
      bonusOverlay: {
        cells: {

        }
      },
      scoring: {
        score: 7,
        highWaterMark: 7,
      },
      winState: { t: 'playing' },
      panic: { currentTime_in_game: Date.now(), lastClear_in_game: Date.now() - PANIC_INTERVAL_MS / 3 },
      paused: undefined,
      inventory: {
        bombs: 3,
        vowels: 0,
        consonants: 0,
        copies: 0,
      },
    },
    mouseState: {
      t: "up",
      p_in_canvas: {
        x: 962,
        y: 88
      }
    },
  };

  const tiles: Tile[] = [
    { letter: "p", p_in_world_int: { x: 0, y: 0 } },
    { letter: "i", p_in_world_int: { x: 2, y: 2 } },
    { letter: "t", p_in_world_int: { x: 2, y: 0 } },
    { letter: "o", p_in_world_int: { x: 1, y: 0 } },
    { letter: "w", p_in_world_int: { x: 2, y: 1 } },
    { letter: "c", p_in_world_int: { x: 9, y: -3 } },
    { letter: "e", p_in_world_int: { x: 2, y: 4 } },
    { letter: "q", p_in_world_int: { x: 1, y: 2 } },
    { letter: "h", p_in_world_int: { x: 1, y: 4 } },
    { letter: "n", p_in_world_int: { x: 6, y: 2 } },
    { letter: "l", p_in_world_int: { x: 3, y: 4 } },
    { letter: "s", p_in_world_int: { x: 0, y: 4 } },
    { letter: "v", p_in_world_int: { x: 4, y: 4 } },
    { letter: "e", p_in_world_int: { x: 5, y: 4 } },
    { letter: "d", p_in_world_int: { x: 6, y: 4 } },
    { letter: "l", p_in_world_int: { x: 9, y: -1 } },
    { letter: "i", p_in_world_int: { x: 6, y: 1 } },
    { letter: "e", p_in_world_int: { x: 6, y: 3 } },
    { letter: "i", p_in_world_int: { x: 8, y: 4 } },
    { letter: "m", p_in_world_int: { x: 9, y: 0 } },
    { letter: "r", p_in_world_int: { x: 11, y: -2 } },
    { letter: "r", p_in_world_int: { x: 6, y: 0 } },
    { letter: "n", p_in_world_int: { x: 2, y: 3 } },
    { letter: "a", p_in_world_int: { x: 9, y: -2 } },
    { letter: "u", p_in_world_int: { x: 0, y: -1 } },
    { letter: "o", p_in_world_int: { x: 7, y: -1 } },
    { letter: "n", p_in_world_int: { x: 8, y: 5 } },
    { letter: "e", p_in_world_int: { x: 7, y: 3 } },
    { letter: "i", p_in_world_int: { x: 8, y: -1 } },
    { letter: "b", p_in_world_int: { x: 6, y: -1 } },
    { letter: "l", p_in_world_int: { x: 8, y: 3 } },
    { letter: "t", p_in_world_int: { x: 8, y: 6 } },
    { letter: "c", p_in_world_int: { x: 11, y: 0 } },
    { letter: "k", p_in_world_int: { x: 12, y: 0 } },
    { letter: "f", p_in_world_int: { x: 11, y: -4 } },
    { letter: "r", p_in_world_int: { x: 10, y: -3 } },
    { letter: "a", p_in_world_int: { x: 11, y: -3 } },
    { letter: "g", p_in_world_int: { x: 12, y: -3 } },
    { letter: "e", p_in_world_int: { x: 12, y: -2 } },
    { letter: "e", p_in_world_int: { x: 12, y: -1 } },
    { letter: "u", p_in_world_int: { x: 10, y: 0 } },
    { letter: "y", p_in_world_int: { x: 13, y: 0 } },
    { letter: "x", p_in_world_int: { x: 13, y: -2 } },
    { letter: "j", p_in_world_int: { x: 6, y: 6 } },
    { letter: "o", p_in_world_int: { x: 7, y: 6 } }
  ].map(ensureTileId);
  const handTiles: Tile[] = [
    { letter: "e", p_in_world_int: { x: 0, y: 0 } },
    { letter: "t", p_in_world_int: { x: 0, y: 1 } },
    { letter: "a", p_in_world_int: { x: 0, y: 2 } },
  ].map(ensureTileId);
  const almost = withCoreState(state, cs => resolveValid(checkValid(addHandTiles(addWorldTiles(cs, tiles), handTiles))));
  return produce(almost, s => {
    s.coreState.animations = [];
  });
}

function drawBubble(ci: CanvasInfo, text: string, textCenter: Point, coneApex: Point): void {
  const { d } = ci;
  const fontSize = 12;
  const lines = text.split('\n');
  d.font = `${fontSize}px sans-serif`;
  const maxWidth = Math.max(...lines.map(line => d.measureText(line).width));
  const MARGIN = 8;
  const RADIUS = 5;

  function bubble(color: string, thick: number): void {
    d.fillStyle = color;
    d.strokeStyle = color;
    d.lineWidth = thick;
    d.beginPath();

    d.roundRect(textCenter.x - maxWidth / 2 - MARGIN, textCenter.y - fontSize / 2 - MARGIN,
      maxWidth + MARGIN * 2, fontSize * lines.length + MARGIN * 2, RADIUS);

    const OFFSET = textCenter.y < coneApex.y ? 10 : -10;
    d.moveTo(textCenter.x - OFFSET, textCenter.y);
    d.lineTo(textCenter.x + OFFSET, textCenter.y);
    d.lineTo(coneApex.x, coneApex.y);
    d.lineTo(textCenter.x - OFFSET, textCenter.y);

    d.fill();
    if (thick != 0)
      d.stroke();
  }
  bubble('black', 2);
  bubble('white', 0);

  d.fillStyle = 'black';
  d.textAlign = 'center';
  d.textBaseline = 'middle';

  for (let i = 0; i < lines.length; i++) {
    d.fillText(lines[i], textCenter.x, textCenter.y + i * fontSize);
  }

}
