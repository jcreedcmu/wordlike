import * as React from 'react';
import { useEffect } from 'react';
import { Dispatch } from '../core/action';
import { bonusGenerator } from '../core/bonus';
import { PANIC_INTERVAL_MS } from '../core/clock';
import { mkGridOf } from '../core/grid';
import { mkLayer } from '../core/layer';
import { GameState, Tile } from '../core/state';
import { checkValid, addWorldTiles, addHandTiles } from '../core/state-helpers';
import { addHandTile, ensureTileId } from "../core/tile-helpers";
import { DEBUG } from '../util/debug';
import { relpos } from '../util/dutil';
import { Point } from '../util/types';
import { rawPaint } from './render';
import { resizeView } from './ui-helpers';
import { CanvasInfo, useCanvas } from './use-canvas';

export type ForRenderState = GameState;
type CanvasProps = {
  main: ForRenderState,
};

export function Instructions(props: { dispatch: Dispatch }): JSX.Element {
  const { dispatch } = props;
  function mouseDownListener(e: MouseEvent) {
    if (DEBUG.instructions) {
      console.log(relpos(e, mc.current!.c));
    }
    else {
      dispatch({ t: 'setSceneState', state: { t: 'menu' } });
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

  return <div>
    <canvas
      style={{ cursor: 'pointer' }}
      ref={cref} />
  </div>;
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
    animations: [],
    toolIndex: 0,
    invalidWords: [],
    connectedSet: mkGridOf([]),
    energies: [
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
    seed: 1533311107,
    tile_entities: {},
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
    mouseState: {
      t: "up",
      p_in_canvas: {
        x: 962,
        y: 88
      }
    },
    bonusLayer: mkLayer(bonusGenerator),
    bonusOverlay: {
      cells: {
        "12,0": "empty",
        "11,-4": "empty",
        "8,3": "empty",
        "5,6": "empty",
        "7,1": "empty",
        "5,1": "empty",
        "8,0": "empty",
        "9,-1": "empty",
        "2,7": "empty",
        "8,4": "empty"
      }
    },
    score: 7,
    panic: { currentTime: Date.now(), lastClear: Date.now() - PANIC_INTERVAL_MS / 3 },
    paused: undefined,
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
  return checkValid(addHandTiles(addWorldTiles(state, tiles), handTiles));
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
