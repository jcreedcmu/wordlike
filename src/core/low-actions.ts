import { dropTopHandTile, tileFall } from "../layout/tile-fall";
import { canvas_from_drag_mobile, pan_canvas_from_canvas_of_mouse_state } from '../layout/view-helpers';
import { getWidgetPoint } from '../layout/widget-helpers';
import { TOOLBAR_WIDTH } from "../ui/widget-constants";
import { DEBUG, DEBUG_CONFIG } from '../util/debug';
import { debugTiles } from "../util/debugTiles";
import { produce } from '../util/produce';
import { apply, compose, composen, inverse, scale, translate } from '../util/se2';
import { Point } from '../util/types';
import { flatUndef, getRandomOrder } from '../util/util';
import { vequal, vint, vm, vscale, vsub } from '../util/vutil';
import { GameAction, GameLowAction, GamePresAction, LowAction } from './action';
import { isActiveCanvasAnimation } from './animation-types';
import { MobileId } from './basic-types';
import { globalActionQueue, handleButtonBarButton } from "./button-bar-handlers";
import { CacheUpdate, mkChunkUpdate } from './cache-types';
import { getPanicFraction, now_in_game } from './clock';
import { WidgetPoint } from './core-ui-types';
import { getIntentOfMouseDown, reduceIntent, vacuous_down } from './intent';
import { tryKillTileOfState } from './kill-helpers';
import { landingMoveIdOfMoveMobile, requireNoCollision, resolveLandResult } from './landing-resolve';
import { landMoveOnState, landMoveOnStateForMobiles, landingMoveOfMoveMobile } from './landing-result';
import { mkOverlayFrom } from './layer';
import { addRandomMob, advanceMob } from './mob-helpers';
import { mobsMapVal } from "./mobs-map";
import { reduceKey } from './reduceKey';
import { SceneState } from './scene-state';
import { incrementScore, setScore } from './scoring';
import { deselect, resolveSelection, setSelected } from "./selection-helpers";
import { SETTINGS_LOCAL_STORAGE_KEY } from "./settings-types";
import { CoreState, GameState } from './state';
import { addWorldTiles, checkValid, drawOfState, filterExpiredAnimations, filterExpiredWordBonusState, isMobilePinned, needsRefresh, proposedHandDragOverLimit, unpauseState, withCoreState } from './state-helpers';
import { Location, MobsState, MoveMobile } from './state-types';
import { cellAtPoint, getMobileId, getMobileLoc, getRenderableMobile, get_hand_tiles, get_mobiles, mobileAtPoint, moveTiles, moveToHandLoc, putTileInHand, putTilesInHandFromNotHand, removeAllMobiles } from "./tile-helpers";
import { bombIntent, dynamiteIntent } from "./tool-intents";
import { getCurrentTool, reduceToolSelect, toolPrecondition } from './tools';
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

function reduceMouseDownInWorld(state: GameState, wp: WidgetPoint & { t: 'world' }, button: number, mods: Set<string>): GameLowAction {
  const p_in_world_int = vm(wp.p_in_local, Math.floor);
  const hoverCell = cellAtPoint(state.coreState, p_in_world_int);
  let pinned =
    (hoverCell.t == 'mobile' && hoverCell.mobile.loc.t == 'world') ? isMobilePinned(state.coreState, hoverCell.mobile.id, hoverCell.mobile.loc) : false;
  const intent = getIntentOfMouseDown(getCurrentTool(state.coreState), button, mods, hoverCell, pinned);
  return { t: 'mouseDownIntent', intent, wp };
}

function reduceMouseDownInHand(state: GameState, wp: WidgetPoint & { t: 'hand' }, button: number, _mods: Set<string>): GameLowAction {
  if (state.coreState.slowState.winState.t == 'lost')
    return { t: 'vacuousDown', wp }

  const index = wp.index;
  const tiles = get_hand_tiles(state.coreState);
  const tool = getCurrentTool(state.coreState);
  if (tool == 'dynamite') return { t: 'mouseDownIntent', intent: dynamiteIntent, wp };
  else if (tool == 'bomb') return { t: 'mouseDownIntent', intent: bombIntent, wp };
  else {
    if (button == 2)
      return { t: 'shuffle' };

    const hoverTile = wp.indexValid && index >= 0 && index < tiles.length;
    if (hoverTile) {
      return { t: 'startDragHandTile', index, wp };
    }
    else
      return { t: 'multiple', actions: [{ t: 'deselect' }, { t: 'drawTile' }] };
  }
}

function reduceMouseDownInToolbar(state: GameState, wp: WidgetPoint & { t: 'toolbar' }, _button: number, _mods: Set<string>): GameLowAction {
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

function reduceMouseDownInResbar(_state: GameState, wp: WidgetPoint & { t: 'resbar' }, _button: number, _mods: Set<string>): GameLowAction {
  const res = wp.res;
  if (res !== undefined) {
    return {
      t: 'multiple', actions: [
        { t: 'setTool', tool: 'pointer' },
        { t: 'vacuousDown', wp },
        { t: 'startDragResource', wp, res, res_ix: Math.floor(wp.p_in_local.y / TOOLBAR_WIDTH) },
      ]
    };
  }
  else {
    return { t: 'vacuousDown', wp };
  }
}

function reduceMouseDownInButtonBar(_state: GameState, wp: WidgetPoint & { t: 'buttonBar' }, _button: number, _mods: Set<string>): GameLowAction {
  const which = wp.button;
  if (which !== undefined) {
    return { t: 'buttonBar', button: which };
  }
  else {
    return { t: 'vacuousDown', wp };
  }
}

function reducePauseButton(state: CoreState): CoreState {
  return produce(state, s => { s.slowState.paused = { pauseTime_in_clock: Date.now() }; });
}

function reduceShuffle(state: CoreState): CoreState {
  const hs = get_hand_tiles(state);
  let randomOrder = getRandomOrder(hs.length);
  let retries = 0;
  while (randomOrder.every((v, i) => hs[v].letter == hs[i].letter) && retries < 5) {
    randomOrder = getRandomOrder(hs.length);
    retries++;
  }
  const newLocs: { id: MobileId, loc: Location & { t: 'hand' } }[] = hs.map((h, ix) => {
    return { id: h.id, loc: { t: 'hand', index: randomOrder[ix] } };
  });
  return produce(state, s => {
    newLocs.forEach(({ id, loc }) => { moveToHandLoc(s, id, loc); });
  });
}

function reduceMouseDown(state: GameState, wp: WidgetPoint, button: number, mods: Set<string>): GameLowAction {
  const paused = state.coreState.slowState.paused;
  if (paused) {
    return { t: 'vacuousDownAnd', wp, action: { t: 'unpause', paused } };
  }
  switch (wp.t) {
    case 'world': return reduceMouseDownInWorld(state, wp, button, mods);
    case 'hand': return reduceMouseDownInHand(state, wp, button, mods);
    case 'toolbar': return reduceMouseDownInToolbar(state, wp, button, mods);
    case 'resbar': return reduceMouseDownInResbar(state, wp, button, mods);
    case 'buttonBar': return reduceMouseDownInButtonBar(state, wp, button, mods);
    case 'pauseButton': return { t: 'vacuousDownAnd', wp, action: { t: 'pause' } };
    case 'nowhere': return { t: 'vacuousDown', wp };
  }
}

function resolveMouseup(state: GameState, p_in_canvas: Point): GameLowAction {
  // FIXME: Setting the mouse state to up *before* calling
  // resolveMouseupInner had some problems I think. I should investigate
  // why.
  return {
    action: resolveMouseupInner(state, p_in_canvas),
    t: 'andMouseUp',
    p_in_canvas: p_in_canvas,
  };
}

function resolveMouseupInner(state: GameState, p_in_canvas: Point): GameLowAction {
  const ms = produce(state.mouseState, ms => { ms.p_in_canvas = p_in_canvas; });

  switch (ms.t) {
    case 'drag_selection': return { t: 'dragSelectionEnd', ms };

    case 'drag_world': {
      const canvas_from_world = compose(pan_canvas_from_canvas_of_mouse_state(ms), state.coreState.canvas_from_world);
      return { t: 'set_canvas_from_world', canvas_from_world };
    }

    case 'drag_mobile': {
      const selected = state.coreState.selected;

      // This is what we want to return if the mouseup is "bad", in order to put the tiles back in the cache
      const bailout: GameLowAction = { t: 'errorRestoreMobiles', ids: selected ? selected.selectedIds : [ms.id] };

      const wp = getWidgetPoint(state.coreState, ms.p_in_canvas);
      if (wp.t == 'world') {
        if (selected) {

          // FIXME: ensure the dragged tile is in the selection
          const remainingMobiles = get_mobiles(state.coreState).filter(mobile => !selected.selectedIds.includes(mobile.id));

          const new_tile_in_world_int: Point = tileFall(state.coreState, ms);
          const old_tile_loc: Location = ms.orig_loc;
          if (old_tile_loc.t != 'world') {
            console.error(`Unexpected non-world tile`);
            return bailout;
          }
          const old_tile_in_world_int = old_tile_loc.p_in_world_int;

          const moves: MoveMobile[] = selected.selectedIds.flatMap(id => {
            const mobile = getMobileId(state.coreState, id);
            const loc = mobile.loc;
            if (loc.t == 'world') {
              // XXX rename to mobile
              let drag_tile_from_other_tile = translate(vsub(loc.p_in_world_int, old_tile_in_world_int));
              if (ms.flipped) {
                drag_tile_from_other_tile = {
                  scale: drag_tile_from_other_tile.scale, translate: {
                    x: drag_tile_from_other_tile.translate.y,
                    y: drag_tile_from_other_tile.translate.x,
                  }
                };
              }
              const move: MoveMobile = {
                id,
                mobile: getRenderableMobile(mobile),
                p_in_world_int: apply(drag_tile_from_other_tile, new_tile_in_world_int)
              };
              return [move];
            }
            else return [];
          });

          const pairs = flatUndef(moves.map(move => {
            const lr = landMoveOnStateForMobiles(landingMoveOfMoveMobile(move), state.coreState, remainingMobiles);
            const plr = requireNoCollision(lr);
            if (plr == undefined)
              return undefined;
            return { plr, move };
          }));

          if (pairs == undefined) {
            return bailout;
          }

          const tgts = pairs.map(pair => pair.move.p_in_world_int);
          return {
            t: 'multiple', actions: [
              {
                t: 'landResults',
                lrms: pairs.map(pair => ({
                  lr: pair.plr,
                  move: landingMoveIdOfMoveMobile(pair.move),
                }))
              },
              { t: 'setSelected', sel: { overlay: mkOverlayFrom(tgts), selectedIds: selected.selectedIds } },
              { t: 'checkValid' },
            ]
          };
        }
        else {
          const mobile = getMobileId(state.coreState, ms.id);
          const rm = getRenderableMobile(mobile);
          const dest_in_world_int = vm(compose(
            inverse(state.coreState.canvas_from_world),
            canvas_from_drag_mobile(state.coreState, ms)).translate,
            Math.round);
          const moveTile: MoveMobile = {
            p_in_world_int: dest_in_world_int,
            id: ms.id,
            mobile: rm,
          }

          const is_noop = ms.orig_loc.t == 'world' && vequal(dest_in_world_int, ms.orig_loc.p_in_world_int);
          if (is_noop)
            return bailout;

          const lr = landMoveOnState(landingMoveOfMoveMobile(moveTile), state.coreState);
          if (lr.t == 'collision')
            return bailout;

          return {
            t: 'multiple',
            actions: [
              { t: 'landResults', lrms: [{ lr, move: landingMoveIdOfMoveMobile(moveTile) }] },
              { t: 'checkValid' }]
          };
        }
      }
      else if (wp.t == 'hand') {
        const mobile = getMobileId(state.coreState, ms.id);
        if (mobile.t != 'tile') {
          return bailout;
        }

        if (proposedHandDragOverLimit(state.coreState, state.mouseState)) {
          return bailout;
        }

        if (state.coreState.selected) {
          const selectedIds = state.coreState.selected.selectedIds;
          return {
            t: 'multiple', actions: [
              { t: 'deselect' },
              { t: 'putTilesInHandFromNotHand', ids: selectedIds, ix: wp.index },
              { t: 'checkValid' },
            ]
          };
        }
        else {
          return {
            t: 'multiple', actions: [
              { t: 'putTileInHand', id: ms.id, ix: wp.index },
              { t: 'checkValid' },
            ]
          };
        }
      }
      else {
        // we dragged somewhere other than world or hand
        return bailout;
      }
    }
    case 'exchange_tiles': {
      const wp = getWidgetPoint(state.coreState, ms.p_in_canvas);
      if (wp.t != 'world')
        return { t: 'none' };
      const id0 = ms.id;
      const loc0 = getMobileLoc(state.coreState, id0);
      const mobile = mobileAtPoint(state.coreState, wp.p_in_local);
      if (mobile == undefined)
        return { t: 'none' };
      const id1 = mobile.id;
      const loc1 = getMobileLoc(state.coreState, id1);
      return {
        t: 'multiple', actions: [
          { t: 'swap', id0, id1, loc0, loc1 },
          { t: 'checkValid' },
        ]
      };
    }
    case 'drag_resource': {
      const wp = getWidgetPoint(state.coreState, ms.p_in_canvas);
      if (wp.t != 'world')
        return { t: 'none' };

      const p_in_world_int: Point = vint(wp.p_in_local);
      const lr = landMoveOnState({ p_in_world_int, src: { t: 'resource', res: ms.res } }, state.coreState)
      if (lr.t == 'collision') return { t: 'none' };
      return {
        t: 'landResults', lrms: [
          { lr, move: { p_in_world_int, src: { t: 'freshResource', res: ms.res } } }
        ]
      };

    }
    case 'up': return { t: 'none' }; // no drag to resolve
    case 'down': return { t: 'none' };
  }
}

function getGamePresLowAction(state: GameState, action: GamePresAction): GameLowAction {
  switch (action.t) {
    case 'key': return reduceKey(state, action.code);
    case 'none': return { t: 'none' };
    case 'wheel':
      return { t: 'zoom', amount: action.delta, center: action.p };

    case 'mouseUp': return resolveMouseup(state, action.p);
    case 'mouseMove': return { t: 'mouseMove', p: action.p };
    case 'tick': return { t: 'tick' };
    case 'popCacheUpdateQueue': return { t: 'popCacheUpdateQueue', n: action.n };
    case 'cancelModals': return { t: 'cancelModals' };
    case 'setAudioVolume': return { t: 'setAudioVolume', volume: action.volume };
    case 'saveSettings': return action;
    case 'multiple': {
      return { t: 'multiple', actions: action.actions.map(a => getGamePresLowAction(state, a)) }
    }
  }
}

export function getLowAction(state: GameState, action: GameAction): LowAction {
  if (DEBUG.actions) {
    if (action.t != 'tick' && action.t != 'mouseMove')
      console.log(`high action: ${JSON.stringify(action)}`);
  }

  function gla(action: GameLowAction): LowAction {
    return { t: 'gameLowAction', action };
  }
  switch (action.t) {

    case 'mouseDown': {
      const wp = getWidgetPoint(state.coreState, action.p);
      if (wp.t == 'pauseButton' && shouldDisplayBackButton(state.coreState.slowState.winState))
        return { t: 'returnToMenu' };
      return gla(reduceMouseDown(state, wp, action.button, action.mods));
    }
    default:
      return gla(getGamePresLowAction(state, action));
  }
}

export function resolveGameLowActions(state: GameState, gameLowActions: GameLowAction[]): GameState {
  for (const action of gameLowActions) {
    state = resolveGameLowAction(state, action);
  }
  return state;
}


function resolveGameLowAction(state: GameState, action: GameLowAction): GameState {
  const cs = state.coreState;

  if (DEBUG.lowActions) {
    if (action.t != 'tick' && action.t != 'mouseMove')
      console.log(`low action: ${JSON.stringify(action)}`);
  }

  if (DEBUG_CONFIG.bugReportQueueLength > 0) {
    if (action.t != 'tick' && action.t != 'mouseMove') {
      globalActionQueue.push(action);
      if (globalActionQueue.length > DEBUG_CONFIG.bugReportQueueLength) {
        globalActionQueue.shift();
      }
    }
  }

  switch (action.t) {
    case 'zoom': {
      return reduceZoom(produce(state, s => {
        s.coreState.slowState.generation++; // needed because some canvas effects, like word bubbles, depend on zoom level
      }), action.center, action.amount);
    }
    case 'drawTile': return withCoreState(state, cs => drawOfState(cs));
    case 'flipOrientation': {
      const ms = state.mouseState;
      if (ms.t == 'drag_mobile' && cs.selected) {
        const flippedMs = produce(ms, mss => { mss.flipped = !mss.flipped; });
        return produce(state, s => { s.mouseState = flippedMs; });
      }
      return state;
    }
    case 'dynamiteTile':
      return withCoreState(state, cs => tryKillTileOfState(cs, action.wp, dynamiteIntent));
    case 'dropTopHandTile': return dropTopHandTile(state);
    case 'debug': {
      return withCoreState(state, cs => checkValid(produce(addWorldTiles(removeAllMobiles(cs), debugTiles()), s => {
        setScore(s, 900);
        s.slowState.inventory.dynamites = 15;
        s.slowState.inventory.bombs = 15;
        s.slowState.inventory.vowels = 15;
        s.slowState.inventory.consonants = 15;
        s.slowState.inventory.copies = 15;
        s.slowState.inventory.times = 15;
        s.slowState.inventory.glasses = 15;
        s.slowState.resource.stone = 15;
        s.slowState.resource.wood = 15;
      })));
    }
    case 'debug2': {
      return withCoreState(state, cs => checkValid(produce(cs, s => {
        s.slowState.inventory.dynamites = 15;
        s.slowState.inventory.bombs = 15;
        s.slowState.inventory.vowels = 15;
        s.slowState.inventory.consonants = 15;
        s.slowState.inventory.copies = 15;
        s.slowState.inventory.times = 15;
        s.slowState.inventory.glasses = 15;
        s.slowState.resource.stone = 15;
        s.slowState.resource.wood = 15;
      })));
    }
    case 'incrementScore':
      return withCoreState(state, cs => checkValid(produce(cs, s => {
        incrementScore(s, action.amount);
      })));

    case 'toggleGl':
      return withCoreState(state, cs => produce(cs, s => {
        s.slowState.renderToGl = !s.slowState.renderToGl;
      }));
    case 'setTool':
      if (toolPrecondition(cs, action.tool))
        return withCoreState(state, cs => produce(cs, s => {
          s.slowState.currentTool = action.tool;
        }));
      else return state;
    case 'mouseDownIntent':
      return produce(reduceIntent(state, action.intent, action.wp), s => {
        s.coreState.slowState.generation++;
      });
    case 'mouseMove': return produce(state, s => {
      if (!vequal(s.mouseState.p_in_canvas, action.p) && needsRefresh(s.mouseState)) {
        s.coreState.slowState.generation++;
      }
      s.mouseState.p_in_canvas = action.p;
    });
    case 'none': return state;
    case 'tick': {
      if (cs.slowState.paused)
        return state;

      const t_in_game = now_in_game(cs.game_from_clock);
      const activeCanvasAnimation = cs.animations.some(x => isActiveCanvasAnimation(x));
      const newAnimations = filterExpiredAnimations(t_in_game, cs.animations);
      const [newWordBonusState, numExpired] = filterExpiredWordBonusState(t_in_game, cs.wordBonusState);
      const cacheUpdates: CacheUpdate[] = [];
      state = produce(state, s => {
        if (activeCanvasAnimation || cacheUpdates.length > 0 || numExpired > 0) {
          s.coreState.slowState.generation++;
        }
        s.coreState._cacheUpdateQueue.push(...cacheUpdates);
        s.coreState.animations = newAnimations;
        s.coreState.wordBonusState = newWordBonusState;
      });
      if (cs.panic !== undefined) {
        if (getPanicFraction(cs.panic, cs.game_from_clock) > 1) {
          return produce(state, s => {
            s.coreState.slowState.winState = { t: 'lost' };
          });
        }

        // advance mobs
        const newMobs: MobsState = mobsMapVal(cs.mobsState, mob => advanceMob(cs, mob));
        state = produce(state, s => {
          s.coreState.mobsState = newMobs;
        });

        if (cs.slowState.renderToGl)
          return state;
        else
          return produce(state, s => { s.coreState.panic!.currentTime_in_game = t_in_game; });
      }
      else {
        return state;
      }
    }
    case 'vacuousDown': return vacuous_down(state, action.wp);
    case 'shuffle': return withCoreState(state, reduceShuffle);
    case 'pause': return withCoreState(state, reducePauseButton);
    case 'multiple': return resolveGameLowActions(state, action.actions);
    case 'deselect': return withCoreState(state, deselect);
    case 'startDragHandTile': {
      const tiles = get_hand_tiles(cs);
      return produce(withCoreState(state, deselect), s => {
        s.coreState.slowState.generation++;
        s.mouseState = {
          t: 'drag_mobile',
          orig_loc: { t: 'hand', index: action.index },
          id: tiles[action.index].id,
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
    case 'andMouseUp': {
      return produce(resolveGameLowAction(state, action.action), s => {
        s.coreState.slowState.generation++;
        s.mouseState = { t: 'up', p_in_canvas: action.p_in_canvas };
      });
    }
    case 'dragSelectionEnd': {
      const newCs = resolveSelection(cs, action.ms);
      return produce(state, s => { s.coreState = newCs; });
    }
    case 'set_canvas_from_world': {
      return produce(state, s => {
        s.coreState.canvas_from_world = action.canvas_from_world;
      });
    }
    case 'setSelected':
      return withCoreState(state, cs => setSelected(cs, action.sel));
    case 'checkValid':
      return withCoreState(state, cs => checkValid(cs));

    case 'swap':
      return withCoreState(state, cs => moveTiles(cs, [
        { id: action.id0, loc: action.loc1 },
        { id: action.id1, loc: action.loc0 }
      ]));

    case 'putTilesInHandFromNotHand':
      return withCoreState(state, cs => putTilesInHandFromNotHand(cs, action.ids, action.ix));
    case 'putTileInHand':
      return withCoreState(state, cs => putTileInHand(cs, action.id, action.ix));

    case 'decrement':
      return produce(state, s => { s.coreState.slowState.inventory[action.which]--; });

    case 'drawConsonant': {
      let newState = drawOfState(cs, 'consonant');
      if (newState == cs)
        return state;
      else {
        newState = produce(newState, cs => { cs.slowState.inventory.consonants--; });
        return produce(state, s => { s.coreState = newState; });
      }
    }

    case 'drawVowel': {
      let newState = drawOfState(cs, 'vowel');
      if (newState == cs)
        return state;
      else {
        newState = produce(newState, cs => { cs.slowState.inventory.vowels--; });
        return produce(state, s => { s.coreState = newState; });
      }
    }

    case 'setPanic':
      return produce(state, s => { s.coreState.panic = action.panic; });

    case 'errorRestoreMobiles': {
      const cacheUpdates: CacheUpdate[] = action.ids.flatMap(id => {
        const mobile = getMobileId(cs, id);
        if (mobile.loc.t != 'world')
          return [];
        const cu: CacheUpdate = mkChunkUpdate(
          mobile.loc.p_in_world_int,
          { t: 'restoreMobile', id: mobile.id }
        );
        return [cu];
      });

      return produce(state, s => {
        s.coreState._cacheUpdateQueue.push(...cacheUpdates);
        s.coreState.soundEffects.push({ t: 'beep' });
      });
    }

    case 'popCacheUpdateQueue': {
      if (DEBUG.cacheUpdate) {
        console.log(state.coreState._cacheUpdateQueue.slice(0, action.n));
      }
      return produce(state, s => {
        s.coreState._cacheUpdateQueue.splice(0, action.n);
      });
    }

    case 'addMob': {
      return withCoreState(state, addRandomMob);
    }

    case 'startDragResource': {
      return produce(state, s => {
        s.mouseState = {
          t: 'drag_resource',
          orig_p_in_canvas: action.wp.p_in_canvas,
          p_in_canvas: action.wp.p_in_canvas,
          res: action.res,
          res_ix: action.res_ix,
        };
      });
    }

    case 'landResults': {
      let cs = state.coreState;
      action.lrms.forEach(step => {
        cs = resolveLandResult(cs, step.lr, step.move);
      });
      return produce(state, s => { s.coreState = cs; });
    }
    case 'cancelModals': {
      return produce(state, s => { s.coreState.modals = {} });
    }
    case 'buttonBar': {
      return withCoreState(state, cs => handleButtonBarButton(cs, action.button));
    }
    case 'setAudioVolume': {
      return produce(state, s => {
        s.coreState.settings.audioVolume = action.volume;
        s.coreState.soundEffects.push({ t: 'setGain', gain: action.volume });
      });
    }
    case 'saveSettings': {
      // XXX side effect!
      localStorage[SETTINGS_LOCAL_STORAGE_KEY] = JSON.stringify(state.coreState.settings);
      return state;
    }
  }
}

export function resolveLowAction(state: SceneState, action: LowAction): SceneState {
  switch (action.t) {
    case 'returnToMenu': return { t: 'menu' }
    case 'gameLowAction':
      if (state.t == 'game') {
        return { t: 'game', gameState: resolveGameLowAction(state.gameState, action.action), revision: 0 };
      }
      else
        return state;
  }
}
