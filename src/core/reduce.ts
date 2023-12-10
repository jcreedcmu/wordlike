import * as effectful from '../ui/use-effectful-reducer';
import { canvas_from_drag_tile, pan_canvas_from_canvas_of_mouse_state, pan_canvas_from_world_of_state } from '../ui/view-helpers';
import { WidgetPoint, canvas_from_hand, getWidgetPoint } from '../ui/widget-helpers';
import { produce } from '../util/produce';
import { SE2, apply, compose, composen, inverse, scale, translate } from '../util/se2';
import { Point } from '../util/types';
import { getRandomOrder } from '../util/util';
import { vm, vscale, vsub } from '../util/vutil';
import { Action, Effect, GameAction } from './action';
import { mkPointDecayAnimation } from './animations';
import { getBonusLayer } from './bonus';
import { getBonusFromLayer } from './bonus-helpers';
import { activeChunks, ensureChunk } from './chunk';
import { getPanicFraction, now_in_game } from './clock';
import { getIntentOfMouseDown, reduceIntent } from './intent';
import { mkOverlayFrom, setOverlay } from './layer';
import { reduceKey } from './reduceKey';
import { resolveSelection } from './selection';
import { CoreState, GameState, Location, SceneState, mkGameSceneState } from './state';
import { MoveTile, checkValid, drawOfState, filterExpiredAnimations, filterExpiredWordBonusState, isCollision, isOccupied, isTilePinned, proposedHandDragOverLimit, tileFall, unpauseState, withCoreState } from './state-helpers';
import { cellAtPoint, getTileId, get_hand_tiles, get_tiles, putTileInHand, putTileInWorld, putTilesInHandFromNotHand, setTileLoc, tileAtPoint } from "./tile-helpers";
import { bombIntent, dynamiteIntent, getCurrentTool, reduceToolSelect } from './tools';
import { shouldDisplayBackButton } from './winState';

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

      const wp = getWidgetPoint(state.coreState, ms.p_in_canvas);
      if (wp.t == 'world') {

        const selected = state.coreState.selected;
        if (selected) {

          // FIXME: ensure the dragged tile is in the selection
          const remainingTiles = get_tiles(state.coreState).filter(tile => !selected.selectedIds.includes(tile.id));

          const new_tile_in_world_int: Point = tileFall(state.coreState, ms);
          const old_tile_loc: Location = ms.orig_loc;
          if (old_tile_loc.t != 'world') {
            console.error(`Unexpected non-world tile`);
            return state;
          }
          const old_tile_in_world_int = old_tile_loc.p_in_world_int;
          const new_tile_from_old_tile: SE2 = translate(vsub(new_tile_in_world_int, old_tile_in_world_int));

          const moves: MoveTile[] = selected.selectedIds.flatMap(id => {
            const tile = getTileId(state.coreState, id);
            const loc = tile.loc;
            if (loc.t == 'world') {
              let drag_tile_from_other_tile = translate(vsub(loc.p_in_world_int, old_tile_in_world_int));
              if (ms.flipped) {
                drag_tile_from_other_tile = {
                  scale: drag_tile_from_other_tile.scale, translate: {
                    x: drag_tile_from_other_tile.translate.y,
                    y: drag_tile_from_other_tile.translate.x,
                  }
                };
              }
              return [{ id, letter: tile.letter, p_in_world_int: apply(drag_tile_from_other_tile, new_tile_in_world_int) }];
            }
            else return [];
          });

          const tgts = moves.map(x => x.p_in_world_int);
          if (isCollision(remainingTiles, moves, state.coreState.bonusOverlay, getBonusLayer(state.coreState.bonusLayerSeed))) {
            return state;
          }

          const afterDrop = produce(state, s => {
            moves.forEach(({ id, p_in_world_int }) => {
              setTileLoc(s.coreState, id, { t: 'world', p_in_world_int });
            });
            s.coreState.selected = { overlay: mkOverlayFrom(tgts), selectedIds: selected.selectedIds };
          });
          return withCoreState(afterDrop, cs => checkValid(cs));
        }
        else {

          const moveTile: MoveTile = {
            p_in_world_int: vm(compose(
              inverse(state.coreState.canvas_from_world),
              canvas_from_drag_tile(state.coreState, ms)).translate,
              Math.round),
            id: ms.id,
            letter: getTileId(state.coreState, ms.id).letter,
          }

          const afterDrop = !isOccupied(state.coreState, moveTile)
            ? withCoreState(state, cs => putTileInWorld(cs, ms.id, moveTile.p_in_world_int))
            : state;
          return withCoreState(afterDrop, cs => checkValid(cs));
        }
      }
      else if (wp.t == 'hand') {
        const handTiles = get_hand_tiles(state.coreState);
        const new_tile_in_hand_int: Point = vm(compose(
          inverse(canvas_from_hand()),
          canvas_from_drag_tile(state.coreState, ms)).translate,
          Math.round);

        if (proposedHandDragOverLimit(state.coreState, state.mouseState)) {
          return state;
        }

        if (state.coreState.selected) {
          const selectedIds = state.coreState.selected.selectedIds;
          return withCoreState(state, cs => checkValid(putTilesInHandFromNotHand(cs, selectedIds, new_tile_in_hand_int.y)));
        }
        else {
          return withCoreState(state, cs => checkValid(putTileInHand(cs, ms.id, new_tile_in_hand_int.y)));
        }
      }
      else {
        // we dragged somewhere other than world or hand
        return state;
      }
    }
    case 'exchange_tiles': {
      const wp = getWidgetPoint(state.coreState, ms.p_in_canvas);
      if (wp.t != 'world')
        return state;
      const id0 = ms.id;
      const loc0 = getTileId(state.coreState, id0).loc;
      const tile = tileAtPoint(state.coreState, wp.p_in_local);
      if (tile == undefined)
        return state;
      const id1 = tile.id;
      const loc1 = getTileId(state.coreState, id1).loc;
      return withCoreState(state, cs => checkValid(produce(cs, s => {
        setTileLoc(s, id0, loc1);
        setTileLoc(s, id1, loc0);
      })));
    }

    case 'up': return state; // no drag to resolve
    case 'down': return state;
  }
}

export function deselect(state: CoreState): CoreState {
  return produce(state, s => { s.selected = undefined; });
}

export function vacuous_down(state: GameState, wp: WidgetPoint): GameState {
  return produce(state, s => { s.mouseState = { t: 'down', p_in_canvas: wp.p_in_canvas }; });
}

function reduceMouseDownInWorld(state: GameState, wp: WidgetPoint & { t: 'world' }, button: number, mods: Set<string>): GameState {
  const p_in_world_int = vm(wp.p_in_local, Math.floor);
  const hoverCell = cellAtPoint(state.coreState, p_in_world_int);
  let pinned =
    (hoverCell.t == 'tile' && hoverCell.tile.loc.t == 'world') ? isTilePinned(state.coreState, hoverCell.tile.id, hoverCell.tile.loc) : false;
  const intent = getIntentOfMouseDown(getCurrentTool(state.coreState), wp, button, mods, hoverCell, pinned);
  return reduceIntent(state, intent, wp);
}

function reduceMouseDownInHand(state: GameState, wp: WidgetPoint & { t: 'hand' }, button: number, mods: Set<string>): GameState {
  if (state.coreState.winState.t == 'lost')
    return vacuous_down(state, wp);

  const p_in_hand_int = vm(wp.p_in_local, Math.floor);
  const tiles = get_hand_tiles(state.coreState);
  const tool = getCurrentTool(state.coreState);
  if (tool == 'dynamite') return reduceIntent(state, dynamiteIntent, wp);
  else if (tool == 'bomb') return reduceIntent(state, bombIntent, wp);
  else {
    const hoverTile = p_in_hand_int.x == 0 && p_in_hand_int.y >= 0 && p_in_hand_int.y < tiles.length;
    if (hoverTile) {
      return produce(withCoreState(state, deselect), s => {
        s.mouseState = {
          t: 'drag_tile',
          orig_loc: { t: 'hand', p_in_hand_int },
          id: tiles[p_in_hand_int.y].id,
          orig_p_in_canvas: wp.p_in_canvas,
          p_in_canvas: wp.p_in_canvas,
          flipped: false,
        }
      });
    }
    else
      return withCoreState(state, cs => drawOfState(deselect(cs)));
  }
}

function reduceMouseDownInToolbar(state: GameState, wp: WidgetPoint & { t: 'toolbar' }, button: number, mods: Set<string>): GameState {
  const tool = wp.tool;
  if (tool !== undefined) {
    return withCoreState(vacuous_down(state, wp), cs => reduceToolSelect(cs, wp.tool));
  }
  else {
    return vacuous_down(state, wp);
  }
}

function reducePauseButton(state: GameState, wp: WidgetPoint): GameState {
  return produce(vacuous_down(state, wp), s => { s.coreState.paused = { pauseTime_in_clock: Date.now() }; });
}

function reduceShuffleButton(state: GameState, wp: WidgetPoint): GameState {
  const hs = get_hand_tiles(state.coreState);
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
    newLocs.forEach(({ id, loc }) => { setTileLoc(s.coreState, id, loc); });
  });
}

function reduceMouseDown(state: GameState, wp: WidgetPoint, button: number, mods: Set<string>): GameState {
  const paused = state.coreState.paused;
  if (paused) {
    return withCoreState(vacuous_down(state, wp), cs => unpauseState(cs, paused));
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

export function keyCaptured(keyCode: string): boolean {
  switch (keyCode) {
    case 'C-S-i': return false;
    case 'C-S-r': return false;
    case 'C-r': return false;
    default: return true;
  }
}

export function reduceZoom(state: GameState, p_in_canvas: Point, delta: number): GameState {
  const sf = delta < 0 ? 1.1 : 1 / 1.1;
  const zoomed_canvas_of_unzoomed_canvas = composen(
    translate(p_in_canvas),
    scale({ x: sf, y: sf }),
    translate(vscale(p_in_canvas, -1)),
  );
  const canvas_from_world = compose(zoomed_canvas_of_unzoomed_canvas, state.coreState.canvas_from_world);
  const MAX_ZOOM_OUT = 7.5;
  const MAX_ZOOM_IN = 150;
  if (canvas_from_world.scale.x < MAX_ZOOM_OUT || canvas_from_world.scale.y < MAX_ZOOM_OUT
    || canvas_from_world.scale.x > MAX_ZOOM_IN || canvas_from_world.scale.y > MAX_ZOOM_IN) {
    return state;
  }
  return produce(state, s => {
    s.coreState.canvas_from_world = canvas_from_world;
  });

}

function reduceGameAction(state: GameState, action: GameAction): effectful.Result<SceneState, Effect> {
  function gs(state: GameState): effectful.Result<SceneState, Effect> {
    return { state: { t: 'game', gameState: state, revision: 0 }, effects: [] };
  }
  switch (action.t) {
    case 'key': {
      return gs(reduceKey(state, action.code));
    }
    case 'none': return gs(state);
    case 'wheel': {
      return gs(reduceZoom(state, action.p, action.delta));
    }
    case 'mouseDown': {
      const wp = getWidgetPoint(state.coreState, action.p);
      if (wp.t == 'pauseButton' && shouldDisplayBackButton(state.coreState.winState))
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

      // ensure chunk cache is full enough
      let cache = state.coreState._cachedTileChunkMap;
      for (const p of activeChunks(pan_canvas_from_world_of_state(state))) {
        cache = ensureChunk(cache, state.coreState, p);
      }

      const t_in_game = now_in_game(state.coreState.game_from_clock);
      const newAnimations = filterExpiredAnimations(t_in_game, state.coreState.animations);
      const [newWordBonusState, destroys] = filterExpiredWordBonusState(t_in_game, state.coreState.wordBonusState);
      destroys.forEach(destroy_p => {
        newAnimations.push(mkPointDecayAnimation(destroy_p, state.coreState.game_from_clock));
      });
      state = produce(state, s => {
        s.coreState._cachedTileChunkMap = cache;
        s.coreState.animations = newAnimations;
        s.coreState.wordBonusState = newWordBonusState;
        destroys.forEach(destroy_p => {
          setOverlay(s.coreState.bonusOverlay, destroy_p, { t: 'empty' });
        });
      });
      if (state.coreState.panic !== undefined) {
        if (getPanicFraction(state.coreState.panic, state.coreState.game_from_clock) > 1) {
          return gs(produce(state, s => {
            s.coreState.winState = { t: 'lost' };
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
      return {
        state: mkGameSceneState(Date.now(), action.creative ?? false, Date.now()), effects: [],
      };
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
