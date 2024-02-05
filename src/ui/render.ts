import { getAssets } from '../core/assets';
import { getBonusFromLayer } from '../core/bonus-helpers';
import { getWordBonusFraction, now_in_game } from '../core/clock';
import { LocatedWord, getGrid } from '../core/grid';
import { getOverlay } from '../core/layer';
import { getScore } from '../core/scoring';
import { CoreState, GameState, TileEntity } from '../core/state';
import { lostState, pointFall, proposedHandDragOverLimit, tileFall } from '../core/state-helpers';
import { getTileId, get_hand_tiles, get_main_tiles, isSelectedForDrag } from '../core/tile-helpers';
import { BOMB_RADIUS, getCurrentTool, getCurrentTools, largeRectOfTool, rectOfTool } from '../core/tools';
import { shouldDisplayBackButton } from '../core/winState';
import { DEBUG, doOnceEvery } from '../util/debug';
import { clearRect, drawImage, fillRect, fillRectRgb, fillText, lineTo, moveTo, pathRect, pathRectCircle, roundedPath, strokeRect } from '../util/dutil';
import { SE2, apply, compose, inverse, translate } from '../util/se2';
import { apply_to_rect } from '../util/se2-extra';
import { Point, Rect } from '../util/types';
import { allRectPts, boundRect, insetRect, invertRect, midpointOfRect, rectPts, scaleRectToCenter, scaleRectToCenterPoint } from '../util/util';
import { vadd, vdiv, vequal, vm, vscale, vsub, vtrans } from '../util/vutil';
import { drawAnimation } from './drawAnimation';
import { drawBonus } from './drawBonus';
import { renderPanicBar } from './drawPanicBar';
import { CanvasInfo } from './use-canvas';
import { canvas_from_drag_tile, cell_in_canvas, drawBubble, pan_canvas_from_world_of_state } from './view-helpers';
import { canvas_bds_in_canvas, canvas_from_hand, canvas_from_toolbar, effective_toolbar_bds_in_canvas, getWidgetPoint, hand_bds_in_canvas, inner_hand_bds_in_canvas, panic_bds_in_canvas, pause_button_bds_in_canvas, score_bds_in_canvas, shuffle_button_bds_in_canvas, toolbar_bds_in_canvas, world_bds_in_canvas } from './widget-helpers';

export const GLOBAL_BORDER = 5;
const interfaceCyanColor = 'rgb(0,255,255,0.5)';
const shadowColor = 'rgb(128,128,100,0.4)';
const backgroundGray = '#595959';
const backgroundRed = '#ffaaaa';

export type RenderableRect = { rect: Rect, color: [number, number, number] };


const DRAW_TILE_SHADOWS = false;

export function paintWithScale(ci: CanvasInfo, state: GameState, glEnabled: boolean) {
  const { d } = ci;
  const actuallyRender = () => {
    d.save();
    d.scale(devicePixelRatio, devicePixelRatio);
    rawPaint(ci, state, glEnabled);
    d.restore();
  };
  if (DEBUG.canvasProfiling) {
    const before = Date.now();
    const NUM_TRIALS = 5;
    for (let i = 0; i < NUM_TRIALS; i++) {
      actuallyRender();
    }
    const duration = Date.now() - before;
    doOnceEvery('canvasTiming', 20, () => {
      console.log('canvas frame elapsed ms', duration / NUM_TRIALS);
    });
  }
  else {
    actuallyRender();
  }
}

export function drawPausedScreen(ci: CanvasInfo) {
  const { d } = ci;

  fillRect(d, canvas_bds_in_canvas, 'white');

  d.textAlign = 'center';
  d.textBaseline = 'middle';
  fillText(d, 'paused', midpointOfRect(canvas_bds_in_canvas), 'black', '48px sans-serif');
}

function drawToolbarCount(d: CanvasRenderingContext2D, rect: Rect, count: number): void {
  d.textAlign = 'center';
  d.textBaseline = 'middle';
  const newRect: Rect = scaleRectToCenter({ p: vadd(rect.p, vdiv(rect.sz, 2)), sz: vdiv(rect.sz, 2) }, 0.8);
  d.fillStyle = backgroundGray;
  d.strokeStyle = 'black';
  d.lineWidth = 2;
  pathRectCircle(d, newRect);
  d.fill();
  const countTxt = `${count}`;
  const fontSize = countTxt.length > 1 ? 12 : 16;
  fillText(d, countTxt, vadd(midpointOfRect(newRect), { x: 0, y: 1 }), 'white', `bold ${fontSize}px sans-serif`);
}

function drawToolbar(d: CanvasRenderingContext2D, state: CoreState): void {
  const hasLost = lostState(state);

  const { p: tp, sz: ts } = effective_toolbar_bds_in_canvas(state);
  const tq = vadd(tp, ts);
  const RAD = 2 * GLOBAL_BORDER;

  // This is the main fill for the outer interface
  d.beginPath();
  // One positive path for the outer canvas rectangle
  pathRect(d, invertRect(canvas_bds_in_canvas));

  // Subtract a rounded path
  roundedPath(d, [
    // top left, just to the bottom left of toolbar
    { x: tp.x + GLOBAL_BORDER, y: tq.y },
    { x: tq.x, y: tq.y },
    { x: tq.x, y: tp.y + GLOBAL_BORDER },
    // top right
    { x: canvas_bds_in_canvas.p.x + canvas_bds_in_canvas.sz.x - GLOBAL_BORDER, y: tp.y + GLOBAL_BORDER },
    // bottom right
    { x: canvas_bds_in_canvas.p.x + canvas_bds_in_canvas.sz.x - GLOBAL_BORDER, y: canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y - GLOBAL_BORDER },
    // bottom right of rack etc.
    { x: hand_bds_in_canvas.p.x + hand_bds_in_canvas.sz.x, y: canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y - GLOBAL_BORDER },
    { x: hand_bds_in_canvas.p.x + hand_bds_in_canvas.sz.x, y: hand_bds_in_canvas.p.y },
    { x: hand_bds_in_canvas.p.x, y: hand_bds_in_canvas.p.y },
    // bottom left of rack etc.
    { x: hand_bds_in_canvas.p.x, y: canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y - GLOBAL_BORDER },

    // bottom left
    { x: canvas_bds_in_canvas.p.x + GLOBAL_BORDER, y: canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y - GLOBAL_BORDER },

  ], RAD);

  d.fillStyle = backgroundGray;
  d.fill();

  if (!hasLost) {
    // Subtract another path for the panic bar. I'm going to want to draw a slow-changing
    // gradient in html canvas over this gap, and let WebGL draw underneath it
    d.save();
    d.globalCompositeOperation = 'destination-out';
    fillRect(d, panic_bds_in_canvas, 'rgba(0,0,0,1)');
    d.restore();
  }

  // Draw "inner hand"
  d.beginPath();
  pathRect(d, inner_hand_bds_in_canvas);
  // XXX Probably should hoist this gradient construction up
  const grad = d.createLinearGradient(inner_hand_bds_in_canvas.p.x, inner_hand_bds_in_canvas.p.y,
    inner_hand_bds_in_canvas.p.x, inner_hand_bds_in_canvas.p.y + inner_hand_bds_in_canvas.sz.y);
  grad.addColorStop(0, 'rgba(28, 29, 33, 0.42)');
  grad.addColorStop(0.25, 'rgba(28, 29, 33, 0.28)');
  grad.addColorStop(1, 'rgba(28, 29, 33, 0)');
  d.fillStyle = grad;
  d.fill();

  // Draw gradient for panic bar
  if (!hasLost) {
    // XXX Probably should hoist this gradient construction up
    const grad = d.createLinearGradient(panic_bds_in_canvas.p.x, panic_bds_in_canvas.p.y,
      panic_bds_in_canvas.p.x, panic_bds_in_canvas.p.y + panic_bds_in_canvas.sz.y);
    grad.addColorStop(0, 'rgba(28, 29, 33, 0)');
    grad.addColorStop(0.75, 'rgba(28, 29, 33, 0.375)');
    grad.addColorStop(1, 'rgba(28, 29, 33, 0.7)');

    fillRect(d, panic_bds_in_canvas, grad);
  }

  const toolbar = getAssets().toolbarBuf.c;
  d.imageSmoothingEnabled = true;

  const tools = getCurrentTools(state);
  const currentTool = getCurrentTool(state);
  const TOOL_SCALE = 0.7;
  tools.forEach((tool, ix_in_toolbar) => {
    const S_in_canvas = toolbar_bds_in_canvas.sz.x;
    const rect_in_canvas = apply_to_rect(
      canvas_from_toolbar(),
      { p: { x: 0, y: S_in_canvas * ix_in_toolbar }, sz: { x: S_in_canvas, y: S_in_canvas } },
    );
    const scaled_rect_in_canvas = scaleRectToCenter(rect_in_canvas, TOOL_SCALE);
    // indicate current tool
    if (tool == currentTool) {
      // This should probably be a roundrect also
      fillRect(d, insetRect(rect_in_canvas, 4), 'rgba(0, 128, 0, 0.5)');
    }

    drawImage(d, toolbar, largeRectOfTool(tool), scaled_rect_in_canvas);

    if (tool == 'bomb') {
      drawToolbarCount(d, rect_in_canvas, state.slowState.inventory.bombs);
    }
    else if (tool == 'vowel') {
      drawToolbarCount(d, rect_in_canvas, state.slowState.inventory.vowels);
    }
    else if (tool == 'consonant') {
      drawToolbarCount(d, rect_in_canvas, state.slowState.inventory.consonants);
    }
    else if (tool == 'copy') {
      drawToolbarCount(d, rect_in_canvas, state.slowState.inventory.copies);
    }
    else if (tool == 'time') {
      drawToolbarCount(d, rect_in_canvas, state.slowState.inventory.times);
    }
  });
}

function formatTime(x: number) {
  var date = new Date(0);
  date.setMilliseconds(x);
  let rv = date.toISOString().substr(11, 8);
  rv = rv.replace(/^0/, '');
  rv = rv.replace(/^0:/, '');
  rv = rv.replace(/^0/, '');
  return rv;
}

export function canvas_from_hand_tile(index: number): SE2 {
  return compose(canvas_from_hand(), translate({ x: index, y: 0 }));
}

function drawWordBubble(ci: CanvasInfo, cs: CoreState, pan_canvas_from_world: SE2) {
  for (const wordBonus of cs.wordBonusState.active) {
    if (cs.wordBonusState.shown !== undefined && vequal(cs.wordBonusState.shown, wordBonus.p_in_world_int)) {
      const apex_in_canvas = apply(pan_canvas_from_world, vadd(wordBonus.p_in_world_int, { x: 0.4, y: 0.4 }));
      const text_in_canvas = vadd({ x: -24, y: -24 }, apply(pan_canvas_from_world, vadd(wordBonus.p_in_world_int, { x: 0.4, y: 0 })));
      drawBubble(ci.d, wordBonus.word.toUpperCase(), text_in_canvas, apex_in_canvas, getWordBonusFraction(wordBonus, cs.game_from_clock));
    }
  }
}

export function rawPaint(ci: CanvasInfo, state: GameState, glEnabled: boolean) {
  if (DEBUG.rawPaint) {
    console.log('rawPaint');
  }
  const cs = state.coreState;

  if (cs.slowState.paused) {
    drawPausedScreen(ci);
    return;
  }

  const worldClip = new Path2D();
  worldClip.rect(world_bds_in_canvas.p.x, world_bds_in_canvas.p.y,
    world_bds_in_canvas.sz.x, world_bds_in_canvas.sz.y);

  const { d } = ci;
  const ms = state.mouseState;
  const pan_canvas_from_world = pan_canvas_from_world_of_state(state);

  function canvas_from_tile(tile: TileEntity): SE2 {
    switch (tile.loc.t) {
      case 'hand':
        return canvas_from_hand_tile(tile.loc.index);
      case 'world':
        return compose(pan_canvas_from_world, translate(tile.loc.p_in_world_int));
      case 'nowhere':
        throw new Error(`Tried to render tile that exists nowhere`);
    }
  }

  function drawWorld() {
    fillRect(d, world_bds_in_canvas, 'white');

    d.save();
    d.clip(worldClip);

    const top_left_in_canvas = world_bds_in_canvas.p;
    const bot_right_in_canvas = vadd(world_bds_in_canvas.p, world_bds_in_canvas.sz);
    const top_left_in_world = vm(apply(inverse(pan_canvas_from_world), top_left_in_canvas), Math.floor);
    const bot_right_in_world = vm(apply(inverse(pan_canvas_from_world), bot_right_in_canvas), Math.ceil);

    for (let i = top_left_in_world.x; i <= bot_right_in_world.x; i++) {
      for (let j = top_left_in_world.y; j <= bot_right_in_world.y; j++) {

        const pt_in_canvas = apply(pan_canvas_from_world, { x: i, y: j });

        d.strokeStyle = '#0f73a2';
        d.lineWidth = 1;

        const CROSS_SIZE = 2;
        d.beginPath();
        d.moveTo(pt_in_canvas.x + 0.5, pt_in_canvas.y + 0.5 - CROSS_SIZE);
        d.lineTo(pt_in_canvas.x + 0.5, pt_in_canvas.y + 0.5 + CROSS_SIZE);

        d.moveTo(pt_in_canvas.x + 0.5 - CROSS_SIZE, pt_in_canvas.y + 0.5);
        d.lineTo(pt_in_canvas.x + 0.5 + CROSS_SIZE, pt_in_canvas.y + 0.5);
        d.stroke();
      }
    }

    // draw world tiles

    get_main_tiles(cs).forEach(tile => {
      if (isSelectedForDrag(state, tile))
        return;
      let opts = undefined;

      opts = {
        connected: getGrid(cs.connectedSet, tile.loc.p_in_world_int) ?? false,
        selected: cs.selected ? getOverlay(cs.selected.overlay, tile.loc.p_in_world_int) : undefined
      };
      drawTile(d, canvas_from_tile(tile), tile, opts);
    });

    // draw bonuses
    for (let i = top_left_in_world.x; i <= bot_right_in_world.x; i++) {
      for (let j = top_left_in_world.y; j <= bot_right_in_world.y; j++) {
        const p: Point = { x: i, y: j };
        const bonus = getBonusFromLayer(cs, p);
        const active = bonus.t == 'word' && cs.wordBonusState.active.findIndex(x => vequal(p, x.p_in_world_int)) != -1;
        drawBonus(d, bonus, pan_canvas_from_world, p, undefined, active);
      }
    }

    // draw origin
    const origin_rect_in_canvas = apply_to_rect(pan_canvas_from_world, { p: { x: 0, y: 0 }, sz: { x: 1, y: 1 } });
    d.strokeStyle = 'rgba(0,0,0,0.5)';
    d.lineWidth = 2;
    d.beginPath();
    d.arc(origin_rect_in_canvas.p.x + origin_rect_in_canvas.sz.x / 2,
      origin_rect_in_canvas.p.y + origin_rect_in_canvas.sz.y / 2,
      origin_rect_in_canvas.sz.y * 0.3,
      0, 360,
    );
    d.stroke();
    d.restore();
  }

  function drawPauseButton() {
    fillRect(d, pause_button_bds_in_canvas, 'rgba(255,255,255,0.2)');
    if (shouldDisplayBackButton(cs.slowState.winState)) {
      d.textAlign = 'center';
      d.textBaseline = 'middle';
      fillText(d, '⟳', midpointOfRect(pause_button_bds_in_canvas), 'white', '32px sans-serif');
    }
    else {
      d.textAlign = 'center';
      d.textBaseline = 'middle';
      fillText(d, '⏸', vadd({ x: 0, y: 2 }, midpointOfRect(pause_button_bds_in_canvas)), 'white', '32px sans-serif');
    }
  }

  function drawShuffleButton() {
    d.textAlign = 'center';
    d.textBaseline = 'middle';
    if (cs.slowState.winState.t != 'lost') {
      fillText(d, '🔀', midpointOfRect(shuffle_button_bds_in_canvas), 'white', '36px sans-serif');
    }
  }

  function drawHand(illegalDrag: boolean) {
    // const handBackgroundColor = illegalDrag ? backgroundRed : backgroundGray;
    // fillRect(d, hand_bds_in_canvas, handBackgroundColor);

    // draw hand tiles
    get_hand_tiles(cs).forEach(tile => {
      if (isSelectedForDrag(state, tile))
        return;
      drawTile(d, canvas_from_tile(tile), tile);
    });
  }

  function drawShadows() {

    d.save();
    d.clip(worldClip);

    if (DRAW_TILE_SHADOWS) {
      if (ms.t == 'drag_tile') {
        if (cs.selected) {
          const tile0 = getTileId(cs, ms.id);

          const fall = tileFall(cs, ms);
          const tiles = cs.selected.selectedIds.map(id => getTileId(cs, id));

          // draw shadows
          tiles.forEach(tile => {
            if (tile.loc.t == 'world' && tile0.loc.t == 'world') {
              const thisFall = apply(
                translate(vsub(tile.loc.p_in_world_int, tile0.loc.p_in_world_int)),
                fall
              );
              fillRect(d, cell_in_canvas(thisFall, pan_canvas_from_world), shadowColor);
            }
          });
        }
        else {
          // draw shadow
          fillRect(d, cell_in_canvas(tileFall(cs, ms), pan_canvas_from_world), shadowColor);
        }
      }
    }

    const currentTool = getCurrentTool(cs);
    if (currentTool == 'bomb' && getWidgetPoint(cs, ms.p_in_canvas).t == 'world') {

      const radius = BOMB_RADIUS;
      for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
          fillRect(d, cell_in_canvas(vadd({ x, y }, pointFall(cs, ms.p_in_canvas)), pan_canvas_from_world), shadowColor);
        }
      }
    }

    d.restore();
  }

  function drawOtherUi(glEnabled: boolean) {

    // draw exchange guide
    if (ms.t == 'exchange_tiles') {
      d.strokeStyle = interfaceCyanColor;
      d.lineWidth = 2;
      d.beginPath();
      moveTo(d, ms.orig_p_in_canvas);
      lineTo(d, ms.p_in_canvas);
      d.stroke();
    }

    // draw dragged tile
    if (!glEnabled) {
      if (ms.t == 'drag_tile') {
        if (cs.selected) {
          const tile0 = getTileId(cs, ms.id);
          const tiles = cs.selected.selectedIds.map(id => getTileId(cs, id));

          // draw dragged tiles
          tiles.forEach(tile => {
            if (tile.loc.t == 'world' && tile0.loc.t == 'world') {
              let drag_tile_from_other_tile = translate(vsub(tile.loc.p_in_world_int, tile0.loc.p_in_world_int));
              if (ms.flipped) {
                drag_tile_from_other_tile = {
                  scale: drag_tile_from_other_tile.scale, translate: {
                    x: drag_tile_from_other_tile.translate.y,
                    y: drag_tile_from_other_tile.translate.x,
                  }
                };
              }
              drawTile(d,
                compose(canvas_from_drag_tile(cs, ms), drag_tile_from_other_tile),
                tile);
            }
          });
        }
        else {
          // draw single tile
          const tile = getTileId(cs, ms.id);
          drawTile(d,
            canvas_from_drag_tile(cs, state.mouseState),
            tile);
        }
      }
    }

    // draw clock
    if (!glEnabled) {
      const clockLoc: Point = {
        x: canvas_bds_in_canvas.p.x + canvas_bds_in_canvas.sz.x - 10,
        y: canvas_bds_in_canvas.p.y + canvas_bds_in_canvas.sz.y - 24
      };
      d.fillStyle = '#333';
      d.textBaseline = 'middle';
      d.textAlign = 'right';
      const clockFontSize = 20;
      d.font = `bold ${clockFontSize}px sans-serif`;
      d.fillText(`${formatTime(now_in_game(cs.game_from_clock))}`, clockLoc.x, clockLoc.y);
    }

    // draw panic bar
    if (!glEnabled) {
      if (cs.panic) {
        const rr = renderPanicBar(cs.panic, cs.game_from_clock);
        fillRectRgb(d, rr.rect, rr.color)
      }
    }

    // draw selection
    if (ms.t == 'drag_selection') {
      const sel_rect_in_canvas: Rect = boundRect([ms.orig_p, ms.p_in_canvas]);
      d.strokeStyle = interfaceCyanColor;
      d.lineWidth = 2;
      d.strokeRect(
        sel_rect_in_canvas.p.x, sel_rect_in_canvas.p.y,
        sel_rect_in_canvas.sz.x, sel_rect_in_canvas.sz.y
      );

    }
  }

  function drawAnimations(time_ms: number, glEnabled: boolean) {
    if (cs.animations.length > 0) {
      d.save();
      d.clip(worldClip);
      cs.animations.forEach(anim => {
        drawAnimation(d, pan_canvas_from_world, time_ms, anim, glEnabled);
      });
      d.restore();
    }
  }


  clearRect(d, world_bds_in_canvas);

  const hasLost = lostState(cs);

  if (!hasLost)
    drawOtherUi(glEnabled);

  drawToolbar(d, cs);

  drawPauseButton();

  if (!glEnabled) {
    drawWorld();
  }

  drawWordBubble(ci, cs, pan_canvas_from_world);

  if (!glEnabled)
    drawShadows();

  // draw invalid words
  if (ms.t == 'up') {
    cs.slowState.invalidWords.forEach(lw => {
      drawInvalidWord(d, pan_canvas_from_world, lw);
    });
  }

  if (!glEnabled) {
    const illegalDrag = ms.t == 'drag_tile' && getWidgetPoint(cs, ms.p_in_canvas).t == 'hand' && proposedHandDragOverLimit(cs, ms);
    drawHand(illegalDrag);
  }
  const mp = midpointOfRect(canvas_bds_in_canvas);


  // draw score
  const scoreLoc: Point = midpointOfRect(score_bds_in_canvas);
  d.fillStyle = '#fff';
  d.textBaseline = 'middle';
  d.textAlign = 'center';
  const fontSize = 40;
  d.font = `bold ${fontSize}px sans-serif`;
  d.fillText(`${getScore(cs)}`, scoreLoc.x, scoreLoc.y);

  if (hasLost) {
    d.textAlign = 'center';
    d.textBaseline = 'middle';
    fillRect(d, scaleRectToCenterPoint(canvas_bds_in_canvas, { x: 1, y: 0.3 }), 'rgba(0,0,0,0.5)');
    fillText(d, 'YOU LOST', mp, 'rgba(128,0,0,1)', '96px serif');
  }
  else {
    drawShuffleButton();
    drawAnimations(now_in_game(cs.game_from_clock), glEnabled);
  }
  if (cs.slowState.winState.t == 'won') {
    d.textAlign = 'center';
    d.textBaseline = 'middle';
    fillText(d, `Time: ${formatTime(cs.slowState.winState.winTime_in_game)}`, { x: mp.x, y: canvas_bds_in_canvas.sz.y - 12 }, 'black', 'bold 24px sans-serif');
  }
}

function colorsOfTile(opts?: { connected?: boolean, selected?: boolean }): { fg: string, bg: string } {
  if (opts?.selected === true)
    return { fg: '#1f5198', bg: '#809fca' };
  if (opts?.connected === false)
    return { fg: '#5a220e', bg: '#f97451' };
  return { fg: '#3a320e', bg: '#c9b451' };
}

function drawInvalidWord(d: CanvasRenderingContext2D, canvas_from_world: SE2, word: LocatedWord) {
  const thickness = 0.1;
  const along = word.orientation; // vector pointing along the length of the word
  const perp = vtrans(along); // vector pointing perpendicular to it
  const rect_in_world: Rect = {
    p: word.p,
    sz: vadd(perp, vscale(along, word.word.length)),
  };
  const rect_in_canvas = apply_to_rect(canvas_from_world, rect_in_world);
  d.strokeStyle = '#7f0000';
  d.lineWidth = 3;
  const OFF = 3;
  d.strokeRect(rect_in_canvas.p.x + 0.5 + OFF, rect_in_canvas.p.y + 0.5 + OFF,
    rect_in_canvas.sz.x - 2 * OFF, rect_in_canvas.sz.y - 2 * OFF);
}

function halfOff(r: Rect): Rect {
  return { p: { x: r.p.x + 0.5, y: r.p.y + 0.5 }, sz: r.sz };
}

function drawTile(d: CanvasRenderingContext2D, canvas_from_tile: SE2, tile: TileEntity, opts?: { connected?: boolean, selected?: boolean }) {
  const rect_in_tile: Rect = { p: { x: 0, y: 0 }, sz: { x: 1, y: 1 } };
  const rect_in_canvas = apply_to_rect(canvas_from_tile, rect_in_tile);

  const { fg, bg } = colorsOfTile(opts);
  fillRect(d, halfOff(rect_in_canvas), bg);
  strokeRect(d, halfOff(rect_in_canvas), fg);
  drawTileLetter(d, tile.letter, rect_in_canvas, fg);
}

export function drawTileLetter(d: CanvasRenderingContext2D, letter: string, rect_in_canvas: Rect, color: string) {
  d.fillStyle = color;
  d.textBaseline = 'middle';
  d.textAlign = 'center';
  const fontSize = Math.round(0.6 * rect_in_canvas.sz.x);
  d.font = `bold ${fontSize}px sans-serif`;
  d.fillText(letter.toUpperCase(), rect_in_canvas.p.x + rect_in_canvas.sz.x / 2 + 0.5,
    rect_in_canvas.p.y + rect_in_canvas.sz.y / 2 + 1.5);
}
