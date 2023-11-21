import { DragWidgetPoint, WidgetPoint } from "../ui/widget-helpers";
import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vequal, vint } from "../util/vutil";
import { Animation, mkExplosionAnimation } from './animations';
import { setOverlay } from "./layer";
import { KillIntent } from './reduce';
import { GameState, MainTile } from "./state";
import { bonusOfStatePoint, checkValid } from './state-helpers';
import { get_hand_tiles, get_main_tiles, removeTile } from "./tile-helpers";
import { BOMB_RADIUS } from './tools';

function eligibleKillIntent(state: GameState, intent: KillIntent): boolean {
  switch (intent.t) {
    case 'kill': return state.coreState.score >= intent.cost;
    case 'bomb': return state.coreState.inventory.bombs >= 1;
  }
}
function spendKillIntent(state: GameState, intent: KillIntent): GameState {
  switch (intent.t) {
    case 'kill': return produce(state, s => { s.coreState.score -= intent.cost; });
    case 'bomb': return produce(state, s => { s.coreState.inventory.bombs--; });
  }
}

export function tryKillTileOfState(state: GameState, wp: WidgetPoint, intent: KillIntent): GameState {
  if (!eligibleKillIntent(state, intent))
    return state;

  if (!(wp.t == 'world' || wp.t == 'hand'))
    return state;

  return killTileOfState(state, wp, intent);
}
function splashDamage(center: Point, radius: number): Point[] {
  if (radius == 0)
    return [center];
  const pts: Point[] = [];
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      pts.push({ x: center.x + x, y: center.y + y });
    }
  }
  return pts;
}
function killTileOfState(state: GameState, wp: DragWidgetPoint, intent: KillIntent): GameState {
  const radius = intent.t == 'kill' ? intent.radius : BOMB_RADIUS;

  // Definitely want to clear the selection, because invariants get
  // violated if a tileId gets deleted but remains in the selection
  state = produce(state, s => { s.coreState.selected = undefined; });

  switch (wp.t) {
    case 'world': {
      const p_in_world_int = vint(wp.p_in_local);
      const anim: Animation = mkExplosionAnimation(p_in_world_int, radius, state.coreState.game_from_clock);

      function tileAt(p: Point): MainTile | undefined {
        return get_main_tiles(state).find(tile => vequal(tile.loc.p_in_world_int, p));
      }
      function killableBonusAt(p: Point) {
        return ['block', 'required'].includes(bonusOfStatePoint(state.coreState, p).t);
      }

      const tilesToDestroy: Point[] = splashDamage(p_in_world_int, radius);
      // remove all tiles in radius
      tilesToDestroy.forEach(p => {
        const tileAtP = tileAt(p);
        if (tileAtP !== undefined)
          state = removeTile(state, tileAtP.id);
      });
      // remove all killable bonuses in radius
      state = produce(state, s => {
        tilesToDestroy.forEach(p => {
          if (killableBonusAt(p))
            setOverlay(s.coreState.bonusOverlay, p, { t: 'empty' });
        });
      });

      return checkValid(produce(spendKillIntent(state, intent), s => {
        s.coreState.animations.push(anim);
      }));
    }
    case 'hand': {
      const p_in_hand_int = vint(wp.p_in_local);
      const hand_tiles = get_hand_tiles(state);
      if (p_in_hand_int.x == 0 && p_in_hand_int.y < hand_tiles.length) {
        const tile = hand_tiles[p_in_hand_int.y];
        if (tile == undefined)
          return state;
        return checkValid(produce(removeTile(state, tile.id), s => {
          s.coreState.score--;
        }));
      }
      else {
        return state;
      }
    }
  }
}
