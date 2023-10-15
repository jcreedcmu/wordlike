import * as React from 'react';
import { useEffect } from 'react';
import { Dispatch } from '../core/action';
import { bonusGenerator } from '../core/bonus';
import { mkGridOf } from '../core/grid';
import { mkLayer } from '../core/layer';
import { SceneState } from '../core/state';

export function Instructions(props: { dispatch: Dispatch }): JSX.Element {
  const { dispatch } = props;
  function mouseDownListener(e: MouseEvent) {
    dispatch({ t: 'setSceneState', state: { t: 'menu' } });
    e.preventDefault();
    e.stopPropagation();
  }

  useEffect(() => {
    document.addEventListener('mousedown', mouseDownListener);
    return () => {
      document.removeEventListener('mousedown', mouseDownListener);
    }
  });
  return <span>Instructions go here</span>;
}

const state: SceneState = {
  t: "game",
  gameState: {
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
    main_tiles: [
      { letter: "p", p_in_world_int: { x: 0, y: 0 }, used: true },
      { letter: "i", p_in_world_int: { x: 2, y: 2 }, used: true },
      { letter: "t", p_in_world_int: { x: 2, y: 0 }, used: true },
      { letter: "o", p_in_world_int: { x: 1, y: 0 }, used: true },
      { letter: "w", p_in_world_int: { x: 2, y: 1 }, used: true },
      { letter: "c", p_in_world_int: { x: 9, y: -3 }, used: true },
      { letter: "e", p_in_world_int: { x: 2, y: 4 }, used: true },
      { letter: "q", p_in_world_int: { x: 1, y: 2 }, used: true },
      { letter: "h", p_in_world_int: { x: 1, y: 4 }, used: true },
      { letter: "n", p_in_world_int: { x: 6, y: 2 }, used: true },
      { letter: "l", p_in_world_int: { x: 3, y: 4 }, used: true },
      { letter: "s", p_in_world_int: { x: 0, y: 4 }, used: true },
      { letter: "v", p_in_world_int: { x: 4, y: 4 }, used: true },
      { letter: "e", p_in_world_int: { x: 5, y: 4 }, used: true },
      { letter: "d", p_in_world_int: { x: 6, y: 4 }, used: true },
      { letter: "l", p_in_world_int: { x: 9, y: -1 }, used: true },
      { letter: "i", p_in_world_int: { x: 6, y: 1 }, used: true },
      { letter: "e", p_in_world_int: { x: 6, y: 3 }, used: true },
      { letter: "i", p_in_world_int: { x: 8, y: 4 }, used: true },
      { letter: "m", p_in_world_int: { x: 9, y: 0 }, used: true },
      { letter: "r", p_in_world_int: { x: 11, y: -2 }, used: true },
      { letter: "r", p_in_world_int: { x: 6, y: 0 }, used: true },
      { letter: "n", p_in_world_int: { x: 2, y: 3 }, used: true },
      { letter: "a", p_in_world_int: { x: 9, y: -2 }, used: true },
      { letter: "u", p_in_world_int: { x: 0, y: -1 }, used: true },
      { letter: "o", p_in_world_int: { x: 7, y: -1 }, used: true },
      { letter: "n", p_in_world_int: { x: 8, y: 5 }, used: true },
      { letter: "e", p_in_world_int: { x: 7, y: 3 }, used: true },
      { letter: "i", p_in_world_int: { x: 8, y: -1 }, used: true },
      { letter: "b", p_in_world_int: { x: 6, y: -1 }, used: true },
      { letter: "l", p_in_world_int: { x: 8, y: 3 }, used: true },
      { letter: "t", p_in_world_int: { x: 8, y: 6 }, used: true },
      { letter: "c", p_in_world_int: { x: 11, y: 0 }, used: true },
      { letter: "k", p_in_world_int: { x: 12, y: 0 }, used: true },
      { letter: "f", p_in_world_int: { x: 11, y: -4 }, used: true },
      { letter: "r", p_in_world_int: { x: 10, y: -3 }, used: true },
      { letter: "a", p_in_world_int: { x: 11, y: -3 }, used: true },
      { letter: "g", p_in_world_int: { x: 12, y: -3 }, used: true },
      { letter: "e", p_in_world_int: { x: 12, y: -2 }, used: true },
      { letter: "e", p_in_world_int: { x: 12, y: -1 }, used: true },
      { letter: "u", p_in_world_int: { x: 10, y: 0 }, used: true },
      { letter: "y", p_in_world_int: { x: 13, y: 0 }, used: true },
      { letter: "x", p_in_world_int: { x: 13, y: -2 }, used: true },
      { letter: "j", p_in_world_int: { x: 6, y: 6 }, used: true },
      { letter: "o", p_in_world_int: { x: 7, y: 6 }, used: true }
    ],
    hand_tiles: [],
    canvas_from_world: {
      scale: {
        x: 39.6694214876033,
        y: 39.6694214876033
      },
      translate: {
        x: 50.80991735537191,
        y: 215.56198347107437
      }
    },
    mouseState: {
      t: "up",
      p: {
        x: 962,
        y: 88
      }
    },
    bonusLayer: mkLayer(bonusGenerator),
    bonusOverlay: {
      cells: {
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
    panic: undefined,
  },
  revision: 0,
};
