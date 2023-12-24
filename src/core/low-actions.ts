import { canvas_from_drag_tile, pan_canvas_from_canvas_of_mouse_state, pan_canvas_from_world_of_state } from '../ui/view-helpers';
import { WidgetPoint, canvas_from_hand, getWidgetPoint } from '../ui/widget-helpers';
import { debugTiles } from '../util/debug';
import { produce } from '../util/produce';
import { SE2, apply, compose, composen, inverse, scale, translate } from '../util/se2';
import { Point } from '../util/types';
import { getRandomOrder } from '../util/util';
import { vm, vscale, vsub } from '../util/vutil';
import { GameAction, GameLowAction, LowAction } from './action';
import { mkPointDecayAnimation } from './animations';
import { getBonusLayer } from './bonus';
import { activeChunks, ensureChunk } from './chunk';
import { getPanicFraction, now_in_game } from './clock';
import { getIntentOfMouseDown, reduceIntent } from './intent';
import { tryKillTileOfState } from './kill-helpers';
import { mkOverlayFrom, setOverlay } from './layer';
import { reduceKey } from './reduceKey';
import { incrementScore, setScore } from './scoring';
import { deselect, resolveSelection, setSelected } from './selection';
import { GameState, Location, SceneState } from './state';
import { MoveTile, addWorldTiles, checkValid, drawOfState, dropTopHandTile, filterExpiredAnimations, filterExpiredWordBonusState, isCollision, isOccupied, isTilePinned, proposedHandDragOverLimit, tileFall, unpauseState, withCoreState } from './state-helpers';
import { cellAtPoint, getTileId, get_hand_tiles, get_tiles, moveTiles, putTileInHand, putTileInWorld, putTilesInHandFromNotHand, putTilesInWorld, removeAllTiles, setTileLoc, tileAtPoint } from "./tile-helpers";
import { bombIntent, dynamiteIntent, getCurrentTool, reduceToolSelect, toolPrecondition } from './tools';
import { shouldDisplayBackButton } from './winState';

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

export function vacuous_down(state: GameState, wp: WidgetPoint): GameState {
  return produce(state, s => { s.mouseState = { t: 'down', p_in_canvas: wp.p_in_canvas }; });
}

function reduceMouseDownInWorld(state: GameState, wp: WidgetPoint & { t: 'world' }, button: number, mods: Set<string>): GameLowAction {
  const p_in_world_int = vm(wp.p_in_local, Math.floor);
  const hoverCell = cellAtPoint(state.coreState, p_in_world_int);
  let pinned =
    (hoverCell.t == 'tile' && hoverCell.tile.loc.t == 'world') ? isTilePinned(state.coreState, hoverCell.tile.id, hoverCell.tile.loc) : false;
  const intent = getIntentOfMouseDown(getCurrentTool(state.coreState), wp, button, mods, hoverCell, pinned);
  return { t: 'mouseDownIntent', intent, wp };
}

function reduceMouseDownInHand(state: GameState, wp: WidgetPoint & { t: 'hand' }, button: number, mods: Set<string>): GameLowAction {
  if (state.coreState.winState.t == 'lost')
    return { t: 'vacuousDown', wp }

  const p_in_hand_int = vm(wp.p_in_local, Math.floor);
  const tiles = get_hand_tiles(state.coreState);
  const tool = getCurrentTool(state.coreState);
  if (tool == 'dynamite') return { t: 'mouseDownIntent', intent: dynamiteIntent, wp };
  else if (tool == 'bomb') return { t: 'mouseDownIntent', intent: bombIntent, wp };
  else {
    const hoverTile = p_in_hand_int.x == 0 && p_in_hand_int.y >= 0 && p_in_hand_int.y < tiles.length;
    if (hoverTile) {
      return { t: 'startDragHandTile', p_in_hand_int, wp };
    }
    else
      return { t: 'drawTileAndDeselect' };
  }
}

function reduceMouseDownInToolbar(state: GameState, wp: WidgetPoint & { t: 'toolbar' }, button: number, mods: Set<string>): GameLowAction {
  const tool = wp.tool;
  if (tool !== undefined) {
    return {
      t: 'multiple', actions: [
        { t: 'vacuousDown', wp },
        reduceToolSelect(state.coreState, wp.tool)
      ]
    };
  }
  else {
    return { t: 'vacuousDown', wp };
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

function reduceMouseDown(state: GameState, wp: WidgetPoint, button: number, mods: Set<string>): GameLowAction {
  const paused = state.coreState.paused;
  if (paused) {
    return { t: 'vacuousDownAnd', wp, action: { t: 'unpause', paused } };
  }
  switch (wp.t) {
    case 'world': return reduceMouseDownInWorld(state, wp, button, mods);
    case 'hand': return reduceMouseDownInHand(state, wp, button, mods);
    case 'toolbar': return reduceMouseDownInToolbar(state, wp, button, mods);
    case 'pauseButton': return { t: 'pause', wp };
    case 'shuffleButton': return { t: 'shuffle', wp };
    case 'nowhere': return { t: 'vacuousDown', wp };
  }
}

function resolveMouseup(state: GameState): GameLowAction {
  // FIXME: Setting the mouse state to up *before* calling
  // resolveMouseupInner had some problems I think. I should investigate
  // why.
  return {
    t: 'setGameState',
    state: produce(resolveMouseupInner(state), s => {
      s.mouseState = { t: 'up', p_in_canvas: state.mouseState.p_in_canvas };
    })
  };
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
          const tcs = setSelected(putTilesInWorld(state.coreState, moves),
            { overlay: mkOverlayFrom(tgts), selectedIds: selected.selectedIds });
          return withCoreState(state, cs => checkValid(tcs));
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
      const tcs = moveTiles(state.coreState, [{ id: id0, loc: loc1 }, { id: id1, loc: loc0 }]);
      return withCoreState(state, cs => checkValid(tcs));
    }

    case 'up': return state; // no drag to resolve
    case 'down': return state;
  }
}

export function getLowAction(state: GameState, action: GameAction): LowAction {
  function gla(action: GameLowAction): LowAction {
    return { t: 'gameLowAction', action };
  }
  switch (action.t) {
    case 'key': return gla(reduceKey(state, action.code));
    case 'none': return gla({ t: 'none' });
    case 'wheel':
      return { t: 'gameLowAction', action: { t: 'zoom', amount: action.delta, center: action.p } };
    case 'mouseDown': {
      const wp = getWidgetPoint(state.coreState, action.p);
      if (wp.t == 'pauseButton' && shouldDisplayBackButton(state.coreState.winState))
        return { t: 'setSceneState', state: { t: 'menu' } };
      return gla(reduceMouseDown(state, wp, action.button, action.mods));
    }
    case 'mouseUp': return gla(resolveMouseup(state));
    case 'mouseMove': return gla({ t: 'mouseMove', p: action.p });
    case 'repaint': return gla({ t: 'repaint' });
  }
}

export function resolveGameLowActions(state: GameState, gameLowActions: GameLowAction[]): GameState {
  for (const action of gameLowActions) {
    state = resolveGameLowAction(state, action);
  }
  return state;
}

function resolveGameLowAction(state: GameState, action: GameLowAction): GameState {
  switch (action.t) {
    case 'zoom': return reduceZoom(state, action.center, action.amount)
    case 'drawTile': return withCoreState(state, cs => drawOfState(cs));
    case 'flipOrientation': {
      const ms = state.mouseState;
      if (ms.t == 'drag_tile' && state.coreState.selected) {
        const flippedMs = produce(ms, mss => { mss.flipped = !mss.flipped; });
        return produce(state, s => { s.mouseState = flippedMs; });
      }
      return state;
    }
    case 'dynamiteTile':
      return withCoreState(state, cs => tryKillTileOfState(cs, action.wp, dynamiteIntent));
    case 'dropTopHandTile': return dropTopHandTile(state);
    case 'debug': {
      return withCoreState(state, cs => checkValid(produce(addWorldTiles(removeAllTiles(cs), debugTiles()), s => {
        setScore(s, 900);
        s.inventory.bombs = 15;
        s.inventory.vowels = 15;
        s.inventory.consonants = 15;
        s.inventory.copies = 15;
        s.inventory.times = 15;
      })));
    }
    case 'incrementScore':
      return withCoreState(state, cs => checkValid(produce(cs, s => {
        incrementScore(s, action.amount);
      })));

    case 'toggleGl':
      return withCoreState(state, cs => produce(cs, s => {
        s.renderToGl = !s.renderToGl;
      }));
    case 'setTool':
      if (toolPrecondition(state.coreState, action.tool))
        return withCoreState(state, cs => produce(cs, s => {
          s.currentTool = action.tool;
        }));
      else return state;
    case 'mouseDownIntent':
      return reduceIntent(state, action.intent, action.wp);
    case 'setGameState': return action.state;
    case 'mouseMove': return produce(state, s => {
      s.mouseState.p_in_canvas = action.p;
    });
    case 'none': return state;
    case 'repaint': {
      if (state.coreState.paused)
        return state;

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
          return produce(state, s => {
            s.coreState.winState = { t: 'lost' };
          });
        }
        return produce(state, s => { s.coreState.panic!.currentTime_in_game = t_in_game; });
      }
      else {
        return state;
      }
    }
    case 'vacuousDown': return vacuous_down(state, action.wp);
    case 'shuffle': return reduceShuffleButton(state, action.wp);
    case 'pause': return reducePauseButton(state, action.wp);
    case 'multiple': return resolveGameLowActions(state, action.actions);
    case 'setCoreState': return produce(state, s => { s.coreState = action.state; });
    case 'drawTileAndDeselect':
      return withCoreState(state, cs => drawOfState(deselect(cs)));
    case 'startDragHandTile': {
      const tiles = get_hand_tiles(state.coreState);
      return produce(withCoreState(state, deselect), s => {
        s.mouseState = {
          t: 'drag_tile',
          orig_loc: { t: 'hand', p_in_hand_int: action.p_in_hand_int },
          id: tiles[action.p_in_hand_int.y].id,
          orig_p_in_canvas: action.wp.p_in_canvas,
          p_in_canvas: action.wp.p_in_canvas,
          flipped: false,
        }
      });
    }
    case 'unpause':
      return withCoreState(state, cs => unpauseState(cs, action.paused))
    case 'vacuousDownAnd':
      return resolveGameLowAction(vacuous_down(state, action.wp), action.action);
  }
}

export function resolveLowAction(state: SceneState, action: LowAction): SceneState {
  switch (action.t) {
    case 'setSceneState': return action.state;
    case 'gameLowAction':
      if (state.t == 'game') {
        return { t: 'game', gameState: resolveGameLowAction(state.gameState, action.action), revision: 0 };
      }
      else
        return state;
  }
}
