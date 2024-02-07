import { DragWidgetPoint, WidgetPoint } from "../ui/widget-helpers";
import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vequal, vint } from "../util/vutil";
import { Animation, mkExplosionAnimation } from './animations';
import { getBonusFromLayer, updateBonusLayer } from "./bonus-helpers";
import { KillIntent } from './intent';
import { getScore, incrementScore } from "./scoring";
import { deselect } from "./selection";
import { CoreState, MainTile } from "./state";
import { checkValid } from './state-helpers';
import { get_hand_tiles, get_main_tiles, removeTile } from "./tile-helpers";
import { BOMB_RADIUS } from './tools';

function eligibleKillIntent(state: CoreState, intent: KillIntent): boolean {
  switch (intent.t) {
    case 'kill': return state.slowState.inventory.dynamites >= 1;
    case 'bomb': return state.slowState.inventory.bombs >= 1;
  }
}
function spendKillIntent(state: CoreState, intent: KillIntent): CoreState {
  switch (intent.t) {
    case 'kill': return produce(state, s => { s.slowState.inventory.dynamites--; });
    case 'bomb': return produce(state, s => { s.slowState.inventory.bombs--; });
  }
}

export function tryKillTileOfState(state: CoreState, wp: WidgetPoint, intent: KillIntent): CoreState {
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
function killTileOfState(state: CoreState, wp: DragWidgetPoint, intent: KillIntent): CoreState {
  const radius = intent.t == 'kill' ? intent.radius : BOMB_RADIUS;

  // Definitely want to clear the selection, because invariants get
  // violated if a tileId gets deleted but remains in the selection
  state = deselect(state);

  switch (wp.t) {
    case 'world': {
      const p_in_world_int = vint(wp.p_in_local);
      const anim: Animation = mkExplosionAnimation(p_in_world_int, radius, state.game_from_clock);

      function tileAt(p: Point): MainTile | undefined {
        return get_main_tiles(state).find(tile => vequal(tile.loc.p_in_world_int, p));
      }
      function killableBonusAt(p: Point) {
        // FIXME: any unbombable ones? Maybe 'water', in the future?
        return getBonusFromLayer(state, p).t != 'empty';
      }

      const tilesToDestroy: Point[] = splashDamage(p_in_world_int, radius);
      // remove all tiles in radius
      tilesToDestroy.forEach(p => {
        const tileAtP = tileAt(p);
        if (tileAtP !== undefined)
          state = removeTile(state, tileAtP.id);
      });
      // remove all killable bonuses in radius
      tilesToDestroy.forEach(p => {
        if (killableBonusAt(p)) {
          state = updateBonusLayer(state, p, { t: 'empty' });
        }
      });
      return checkValid(produce(spendKillIntent(state, intent), s => {
        s.animations.push(anim);
      }));
    }
    case 'hand': {
      const index = wp.index;
      const hand_tiles = get_hand_tiles(state);
      if (wp.indexValid && index >= 0 && index < hand_tiles.length) {
        const tile = hand_tiles[index];
        if (tile == undefined)
          return state;
        return checkValid(spendKillIntent(removeTile(state, tile.id), intent));
      }
      else {
        return state;
      }
    }
  }
}
