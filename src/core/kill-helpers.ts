import { produce } from "../util/produce";
import { Point } from "../util/types";
import { vequal } from "../util/vutil";
import { Animation } from "./animation-types";
import { mkExplosionAnimation } from './animations';
import { getBonusFromLayer, updateBonusLayer } from "./bonus-helpers";
import { WidgetPoint, locationOfWidgetPoint } from "./core-ui-types";
import { KillIntent, killableBonus } from './intent-types';
import { deselect } from "./selection-operations";
import { CoreState } from "./state";
import { checkValid } from './state-helpers';
import { Location, MainTile } from './state-types';
import { get_hand_tiles, get_main_tiles, removeMobile } from "./tile-helpers";
import { BOMB_RADIUS } from './tools';

function eligibleKillIntent(state: CoreState, intent: KillIntent): boolean {
  switch (intent.t) {
    case 'kill': return state.slowState.inventory.dynamites >= 1;
    case 'bomb': return state.slowState.inventory.bombs >= 1;
    case 'fillWater': return true;
  }
}
function spendKillIntent(state: CoreState, intent: KillIntent): CoreState {
  switch (intent.t) {
    case 'kill': return produce(state, s => { s.slowState.inventory.dynamites--; });
    case 'bomb': return produce(state, s => { s.slowState.inventory.bombs--; });
    case 'fillWater': return state;
  }
}

export function tryKillTileOfStateLoc(state: CoreState, loc: Location, intent: KillIntent): CoreState {
  if (!eligibleKillIntent(state, intent))
    return state;

  return killTileOfStateLoc(state, loc, intent);
}

export function tryKillTileOfState(state: CoreState, wp: WidgetPoint, intent: KillIntent): CoreState {
  if (!eligibleKillIntent(state, intent))
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


function killTileOfState(state: CoreState, wp: WidgetPoint, intent: KillIntent): CoreState {
  return killTileOfStateLoc(state, locationOfWidgetPoint(wp), intent);
}

function killTileOfStateLoc(state: CoreState, loc: Location, intent: KillIntent): CoreState {
  const radius = intent.t == 'bomb' ? BOMB_RADIUS : intent.t == 'fillWater' ? 0 : intent.radius;

  // Definitely want to clear the selection, because invariants get
  // violated if a tileId gets deleted but remains in the selection
  state = deselect(state);

  switch (loc.t) {
    case 'world': {
      const p_in_world_int = loc.p_in_world_int;
      const anim: Animation = mkExplosionAnimation(p_in_world_int, radius, state.game_from_clock);

      function tileAt(p: Point): MainTile | undefined {
        return get_main_tiles(state).find(tile => vequal(tile.loc.p_in_world_int, p));
      }

      const tilesToDestroy: Point[] = splashDamage(p_in_world_int, radius);
      // remove all tiles in radius
      tilesToDestroy.forEach(p => {
        const tileAtP = tileAt(p);
        if (tileAtP !== undefined)
          state = removeMobile(state, tileAtP.id);
      });
      // remove all killable bonuses in radius
      tilesToDestroy.forEach(p => {
        if (killableBonus(intent, getBonusFromLayer(state, p))) {
          state = updateBonusLayer(state, p, { t: 'empty' });
        }
      });
      return checkValid(produce(spendKillIntent(state, intent), s => {
        s.animations.push(anim);
      }));
    }
    case 'hand': {
      const index = loc.index;
      const hand_tiles = get_hand_tiles(state);
      if (index >= 0 && index < hand_tiles.length) {
        const tile = hand_tiles[index];
        if (tile == undefined)
          return state;
        return checkValid(spendKillIntent(removeMobile(state, tile.id), intent));
      }
      else {
        return state;
      }
    }
    case 'nowhere':
      return state;
  }
}
