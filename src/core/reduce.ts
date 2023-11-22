import * as effectful from '../ui/use-effectful-reducer';
import { canvas_from_drag_tile, pan_canvas_from_canvas_of_mouse_state } from '../ui/view-helpers';
import { WidgetPoint, canvas_from_hand, getWidgetPoint } from '../ui/widget-helpers';
import { debugTiles } from '../util/debug';
import { produce } from '../util/produce';
import { SE2, apply, compose, composen, inverse, scale, translate } from '../util/se2';
import { apply_to_rect } from '../util/se2-extra';
import { Point } from '../util/types';
import { boundRect, getRandomOrder, pointInRect } from '../util/util';
import { vadd, vequal, vm, vscale, vsub } from '../util/vutil';
import { Action, Effect, GameAction } from './action';
import { getBonusLayer } from './bonus';
import { getPanicFraction, now_in_game } from './clock';
import { mkOverlay, mkOverlayFrom, setOverlay } from './layer';
import { GameState, HAND_TILE_LIMIT, Location, SceneState, TileEntity, mkGameSceneState } from './state';
import { MoveTile, addWorldTiles, bonusOfStatePoint, checkValid, drawOfState, filterExpiredAnimations, isCollision, isOccupied, isTilePinned, unpauseState } from './state-helpers';
import { tryKillTileOfState } from './kill-helpers';
import { getTileId, get_hand_tiles, get_main_tiles, get_tiles, putTileInHand, putTileInWorld, putTilesInHand, removeAllTiles, setTileLoc } from "./tile-helpers";
import { Tool, bombIntent, dynamiteIntent, getCurrentTool, reduceToolSelect } from './tools';
import { resolveSelection } from './selection';

function resolveMouseup(state: GameState): GameState {
  // FIXME: Setting the mouse state to up *before* calling
  // resolveMouseupInner had some problems I think. I should investigate
  // why.
  return produce(resolveMouseupInner(state), s => {
    s.mouseState = { t: 'up', p_in_canvas: state.mouseState.p_in_canvas };
  });
}

function resolveMouseupInner(state: GameState): GameState {
  const ms = state.mouseState;

  switch (ms.t) {
    case 'drag_selection': {
      const newCs = resolveSelection(state.coreState, ms);
      return produce(state, s => { s.coreState = newCs; });
    }
    case 'drag_world': {

      const new_canvas_from_world = compose(pan_canvas_from_canvas_of_mouse_state(ms), state.coreState.canvas_from_world);

      return produce(state, s => {
        s.coreState.canvas_from_world = new_canvas_from_world;
      });
    }

    case 'drag_tile': {

      const wp = getWidgetPoint(state, ms.p_in_canvas);
      if (wp.t == 'world') {

        const selected = state.coreState.selected;
        if (selected) {

          // FIXME: ensure the dragged tile is in the selection
          const remainingTiles = get_tiles(state).filter(tile => !selected.selectedIds.includes(tile.id));

          const new_tile_in_world_int: Point = vm(compose(
            inverse(state.coreState.canvas_from_world),
            canvas_from_drag_tile(state, ms)).translate,
            Math.round);
          const old_tile_loc: Location = ms.orig_loc;
          if (old_tile_loc.t != 'world') {
            console.error(`Unexpected non-world tile`);
            return state;
          }
          const old_tile_in_world_t = old_tile_loc.p_in_world_int;
          const new_tile_from_old_tile: SE2 = translate(vsub(new_tile_in_world_int, old_tile_in_world_t));

          const moves: MoveTile[] = selected.selectedIds.flatMap(id => {
            const tile = getTileId(state.coreState, id);
            const loc = tile.loc;
            if (loc.t == 'world') {
              return [{ id, letter: tile.letter, p_in_world_int: apply(new_tile_from_old_tile, loc.p_in_world_int) }];
            }
            else return [];
          });

          const tgts = moves.map(x => x.p_in_world_int);
          if (isCollision(remainingTiles, moves, state.coreState.bonusOverlay, getBonusLayer(state.coreState.bonusLayerName))) {
            return state;
          }

          const afterDrop = produce(state, s => {
            moves.forEach(({ id, p_in_world_int }) => {
              setTileLoc(s, id, { t: 'world', p_in_world_int });
            });
            s.coreState.selected = { overlay: mkOverlayFrom(tgts), selectedIds: selected.selectedIds };
          });
          return checkValid(afterDrop);
        }
        else {

          const moveTile: MoveTile = {
            p_in_world_int: vm(compose(
              inverse(state.coreState.canvas_from_world),
              canvas_from_drag_tile(state, ms)).translate,
              Math.round),
            id: ms.id,
            letter: getTileId(state.coreState, ms.id).letter,
          }

          const afterDrop = !isOccupied(state, moveTile)
            ? putTileInWorld(state, ms.id, moveTile.p_in_world_int)
            : state;
          return checkValid(afterDrop);
        }


      }
      else if (wp.t == 'hand') {
        const handTiles = get_hand_tiles(state);
        const new_tile_in_hand_int: Point = vm(compose(
          inverse(canvas_from_hand()),
          canvas_from_drag_tile(state, ms)).translate,
          Math.round);

        if (state.coreState.selected) {
          const selectedIds = state.coreState.selected.selectedIds;

          // check hand size limit
          if (selectedIds.length + handTiles.length > HAND_TILE_LIMIT)
            return state;

          return checkValid(putTilesInHand(state, selectedIds, new_tile_in_hand_int.y));
        }
        else {
          // check hand size limit
          if (handTiles.length >= HAND_TILE_LIMIT)
            return state;

          return ms.orig_loc.t == 'world'
            ? checkValid(putTileInHand(state, ms.id, new_tile_in_hand_int.y))
            : state;
        }
      }
      else {
        // we dragged somewhere other than world or hand
        return state;
      }
    }
    case 'up': return state; // no drag to resolve
    case 'down': return state;
  }
}

function deselect(state: GameState): GameState {
  return produce(state, s => { s.coreState.selected = undefined; });
}


export type KillIntent =
  | { t: 'kill', radius: number, cost: number }
  | { t: 'bomb' }
  ;

export type Intent =
  | { t: 'dragTile', id: string }
  | { t: 'vacuous' }
  | { t: 'panWorld' }
  | { t: 'startSelection' }
  | KillIntent
  ;

function getIntentOfMouseDown(tool: Tool, wp: WidgetPoint, button: number, mods: Set<string>, hoverTile: TileEntity | undefined, hoverBlock: boolean, pinned: boolean): Intent {
  if (button == 2)
    return { t: 'panWorld' };

  switch (tool) {
    case 'pointer':
      if (hoverTile) {
        if (pinned)
          return { t: 'panWorld' };
        return { t: 'dragTile', id: hoverTile.id };
      }
      return { t: 'startSelection' };
    case 'hand': return { t: 'panWorld' };
    case 'dynamite':
      if (hoverTile || hoverBlock) {
        return dynamiteIntent;
      }
      else {
        return { t: 'vacuous' };
      }
    case 'bomb':
      return bombIntent;
    case 'vowel': throw new Error(`shoudn't be able have vowel tool active`);
    case 'consonant': throw new Error(`shoudn't be able have consonant tool active`);
  }
}

function reduceIntent(state: GameState, intent: Intent, wp: WidgetPoint): GameState {
  switch (intent.t) {
    case 'dragTile':
      if (wp.t != 'world' && wp.t != 'hand') return vacuous_down(state, wp);
      const p_in_world_int = vm(wp.p_in_local, Math.floor);
      let state2 = state;
      if (state.coreState.selected) {
        // If we start dragging a tile not in the selection, we should deselect it first
        if (!state.coreState.selected.selectedIds.includes(intent.id)) {
          state2 = produce(state, s => { s.coreState.selected = undefined; });
        }
      }
      return produce(state2, s => {
        s.mouseState = {
          t: 'drag_tile',
          orig_loc: { t: 'world', p_in_world_int },
          id: intent.id,
          orig_p_in_canvas: wp.p_in_canvas,
          p_in_canvas: wp.p_in_canvas,
        };
      });
    case 'vacuous': return vacuous_down(state, wp);
    case 'panWorld':
      if (wp.t != 'world') return vacuous_down(state, wp);
      return produce(state, s => {
        s.mouseState = {
          t: 'drag_world',
          orig_p: wp.p_in_canvas,
          p_in_canvas: wp.p_in_canvas,
        }
      });
    case 'kill': return tryKillTileOfState(vacuous_down(state, wp), wp, intent);
    case 'bomb': return tryKillTileOfState(vacuous_down(state, wp), wp, intent);
    case 'startSelection':
      if (wp.t != 'world') return vacuous_down(state, wp);
      return produce(deselect(state), s => {
        s.mouseState = {
          t: 'drag_selection',
          orig_p: wp.p_in_canvas,
          p_in_canvas: wp.p_in_canvas,
          // XXX generalize to different operations depending on modifier keys
          opn: 'set',
        }
      });
  }
}

function vacuous_down(state: GameState, wp: WidgetPoint): GameState {
  return produce(state, s => { s.mouseState = { t: 'down', p_in_canvas: wp.p_in_canvas }; });
}

function reduceMouseDownInWorld(state: GameState, wp: WidgetPoint & { t: 'world' }, button: number, mods: Set<string>): GameState {
  let hoverTile: TileEntity | undefined = undefined;
  const p_in_world_int = vm(wp.p_in_local, Math.floor);
  for (const tile of get_main_tiles(state.coreState)) {
    if (vequal(p_in_world_int, tile.loc.p_in_world_int)) {
      hoverTile = tile;
      break;
    }
  }
  const hoverBlock = bonusOfStatePoint(state.coreState, p_in_world_int).t == 'block';
  let pinned =
    (hoverTile && hoverTile.loc.t == 'world') ? isTilePinned(state, hoverTile.id, hoverTile.loc) : false;
  const intent = getIntentOfMouseDown(getCurrentTool(state), wp, button, mods, hoverTile, hoverBlock, pinned);
  return reduceIntent(state, intent, wp);
}

function reduceMouseDownInHand(state: GameState, wp: WidgetPoint & { t: 'hand' }, button: number, mods: Set<string>): GameState {
  if (state.coreState.lost)
    return vacuous_down(state, wp);

  const p_in_hand_int = vm(wp.p_in_local, Math.floor);
  const tiles = get_hand_tiles(state);
  const tool = getCurrentTool(state);
  if (tool == 'dynamite') return reduceIntent(state, dynamiteIntent, wp);
  else if (tool == 'bomb') return reduceIntent(state, bombIntent, wp);
  else {
    const hoverTile = p_in_hand_int.x == 0 && p_in_hand_int.y >= 0 && p_in_hand_int.y < tiles.length;
    if (hoverTile) {
      return produce(deselect(state), s => {
        s.mouseState = {
          t: 'drag_tile',
          orig_loc: { t: 'hand', p_in_hand_int },
          id: tiles[p_in_hand_int.y].id,
          orig_p_in_canvas: wp.p_in_canvas,
          p_in_canvas: wp.p_in_canvas,
        }
      });
    }
    else
      return drawOfState(deselect(state));
  }
}

function reduceMouseDownInToolbar(state: GameState, wp: WidgetPoint & { t: 'toolbar' }, button: number, mods: Set<string>): GameState {
  const tool = wp.tool;
  if (tool !== undefined) {
    return reduceToolSelect(vacuous_down(state, wp), wp.tool);
  }
  else {
    return vacuous_down(state, wp);
  }
}

function reducePauseButton(state: GameState, wp: WidgetPoint): GameState {
  return produce(vacuous_down(state, wp), s => { s.coreState.paused = { pauseTime_in_clock: Date.now() }; });
}

function reduceShuffleButton(state: GameState, wp: WidgetPoint): GameState {
  const hs = get_hand_tiles(state);
  let randomOrder = getRandomOrder(hs.length);
  let retries = 0;
  while (randomOrder.every((v, i) => hs[v].letter == hs[i].letter) && retries < 5) {
    randomOrder = getRandomOrder(hs.length);
    retries++;
  }
  const newLocs: { id: string, loc: Location }[] = hs.map((h, ix) => {
    return { id: h.id, loc: { t: 'hand', p_in_hand_int: { x: 0, y: randomOrder[ix] } } };
  });
  return produce(vacuous_down(state, wp), s => {
    newLocs.forEach(({ id, loc }) => { setTileLoc(s, id, loc); });
  });
}

function reduceMouseDown(state: GameState, wp: WidgetPoint, button: number, mods: Set<string>): GameState {
  if (state.coreState.paused) {
    return unpauseState(vacuous_down(state, wp), state.coreState.paused);
  }
  switch (wp.t) {
    case 'world': return reduceMouseDownInWorld(state, wp, button, mods);
    case 'hand': return reduceMouseDownInHand(state, wp, button, mods);
    case 'toolbar': return reduceMouseDownInToolbar(state, wp, button, mods);
    case 'pauseButton': return reducePauseButton(state, wp);
    case 'shuffleButton': return reduceShuffleButton(state, wp);
    case 'nowhere': return vacuous_down(state, wp);
  }
}

function reduceGameAction(state: GameState, action: GameAction): effectful.Result<SceneState, Effect> {
  function gs(state: GameState): effectful.Result<SceneState, Effect> {
    return { state: { t: 'game', gameState: state, revision: 0 }, effects: [] };
  }
  switch (action.t) {
    case 'key': {
      if (action.code == '<space>') {
        return gs(drawOfState(state));
      }
      if (action.code == 'k') {
        return gs(tryKillTileOfState(state, getWidgetPoint(state, state.mouseState.p_in_canvas), dynamiteIntent));
      }
      if (action.code == 'd') {
        return gs(checkValid(produce(addWorldTiles(removeAllTiles(state), debugTiles()), s => {
          s.coreState.score = 1000;
          s.coreState.inventory.bombs = 15;
          s.coreState.inventory.vowels = 15;
          s.coreState.inventory.consonants = 15;
        })));
      }
      return gs(state);
    }
    case 'none': return gs(state);
    case 'wheel': {
      const sf = action.delta < 0 ? 1.1 : 1 / 1.1;
      const zoomed_canvas_of_unzoomed_canvas = composen(
        translate(action.p),
        scale({ x: sf, y: sf }),
        translate(vscale(action.p, -1)),
      );
      const canvas_from_world = compose(zoomed_canvas_of_unzoomed_canvas, state.coreState.canvas_from_world);
      const MAX_ZOOM_OUT = 7.5;
      const MAX_ZOOM_IN = 150;
      if (canvas_from_world.scale.x < MAX_ZOOM_OUT || canvas_from_world.scale.y < MAX_ZOOM_OUT
        || canvas_from_world.scale.x > MAX_ZOOM_IN || canvas_from_world.scale.y > MAX_ZOOM_IN) {
        return gs(state);
      }
      return gs(produce(state, s => {
        s.coreState.canvas_from_world = canvas_from_world;
      }));
    }
    case 'mouseDown': {
      const wp = getWidgetPoint(state, action.p);
      if (state.coreState.lost && wp.t == 'pauseButton')
        return { state: { t: 'menu' }, effects: [] };
      return gs(reduceMouseDown(state, wp, action.button, action.mods));
    }
    case 'mouseUp': return gs(resolveMouseup(state));
    case 'mouseMove': return gs(produce(state, s => {
      s.mouseState.p_in_canvas = action.p;
    }));
    case 'repaint':
      if (state.coreState.paused)
        return gs(state);

      const t_in_game = now_in_game(state.coreState.game_from_clock);
      const newAnimations = filterExpiredAnimations(t_in_game, state.coreState.animations);
      state = produce(state, s => {
        s.coreState.animations = newAnimations;
      });
      if (state.coreState.panic !== undefined) {
        if (getPanicFraction(state.coreState.panic, state.coreState.game_from_clock) > 1) {
          return gs(produce(state, s => {
            s.coreState.lost = true;
          }));
        }
        return gs(produce(state, s => { s.coreState.panic!.currentTime_in_game = t_in_game; }));
      }
      else {
        return gs(state);
      }
  }
}

export function reduce(scState: SceneState, action: Action): effectful.Result<SceneState, Effect> {
  switch (action.t) {
    case 'resize': return { state: scState, effects: [] }; // XXX maybe stash viewdata this in state somewhere?
    case 'newGame':
      return { state: mkGameSceneState(Date.now()), effects: [] };
    case 'setSceneState':
      return { state: action.state, effects: [] };
    default:
      if (scState.t == 'game') {
        return reduceGameAction(scState.gameState, action);
      }
      else {
        return { state: scState, effects: [] };
      }
  }


}
