import { world_bds_in_canvas } from "../ui/widget-constants";
import * as se1 from '../util/se1';
import { vsnorm } from '../util/vutil';
import { Bonus } from './bonus';
import { BIT_VISIBLE } from './chunk';
import { mkChunkUpdate } from "../ui/chunk-helpers";
import { initialEnergies } from './distribution';
import { mkGridOf } from './grid';
import { Overlay, mkOverlay, setOverlay } from './layer';
import { GameState, SceneState } from './state';
import { CacheUpdate } from './cache-types';

const DEFAULT_SCALE = 48.001;
const epsilon = 0.0001;
const INITIAL_SEEN_CELLS_RADIUS = 5.5;

export function mkGameState(seed: number, creative: boolean, bonusLayerSeed: number): GameState {
  const rad = INITIAL_SEEN_CELLS_RADIUS;
  const irad = Math.ceil(rad);

  const seen_cells: Overlay<boolean> = mkOverlay();
  const _cacheUpdateQueue: CacheUpdate[] = [];
  for (let x = -irad; x <= irad; x++) {
    for (let y = -irad; y <= irad; y++) {
      const p_in_world_int = { x, y };
      if (vsnorm(p_in_world_int) <= rad * rad) {
        setOverlay(seen_cells, p_in_world_int, true);
        _cacheUpdateQueue.push(mkChunkUpdate(p_in_world_int, { t: 'setBit', bit: BIT_VISIBLE }));
      }
    }
  }
  return {
    coreState: {
      slowState: {
        generation: 0,
        inventory: {
          dynamites: 5,
          bombs: 0,
          vowels: 0,
          consonants: 0,
          copies: 0,
          times: 0,
          glasses: 0,
        },
        resource: {
          wood: 0,
          stone: 0,
        },
        scoring: { score: 0, highWaterMark: 0 },
        currentTool: 'pointer',
        invalidWords: [],
        renderToGl: true,
        paused: undefined,
        winState: { t: creative ? 'creative' : 'playing' },
      },
      wordBonusState: {
        active: [],
        numAllocated: 0,
      },
      animations: [],
      mobile_entities: {},
      seen_cells,
      bonusOverlay: mkOverlay<Bonus>(),
      canvas_from_world: {
        scale: { x: DEFAULT_SCALE, y: DEFAULT_SCALE },
        translate: {
          x: epsilon + world_bds_in_canvas.p.x + world_bds_in_canvas.sz.x / 2 - DEFAULT_SCALE / 2,
          y: epsilon + world_bds_in_canvas.p.y + world_bds_in_canvas.sz.y / 2 - DEFAULT_SCALE / 2
        }
      },
      connectedSet: mkGridOf([]),
      energies: initialEnergies(),
      seed,
      panic: undefined,
      game_from_clock: se1.translate(-Date.now()),
      bonusLayerSeed,
      mobsState: { mobs: {} },
      _cacheUpdateQueue,
    },
    mouseState: { t: 'up', p_in_canvas: { x: 0, y: 0 } },
  };
}

export function mkGameSceneState(seed: number, creative: boolean, bonusLayerSeed: number): SceneState {
  return {
    t: 'game',
    gameState: mkGameState(seed, creative, bonusLayerSeed), revision: 0
  };
}
