import { getAssets } from '../core/assets';
import { getBonusFromLayer } from '../core/bonus-helpers';
import { now_in_game } from '../core/clock';
import { LocatedWord, getGrid } from '../core/grid';
import { getOverlay } from '../core/layer';
import { AbstractLetter, stringOfLetter } from '../core/letters';
import { getScore } from '../core/scoring';
import { CoreState, GameState, TileEntity } from '../core/state';
import { lostState } from '../core/state-helpers';
import { get_main_tiles, isSelectedForDrag } from '../core/tile-helpers';
import { getCurrentResources, getCurrentTool, getCurrentTools, largeRectOf } from '../core/tools';
import { shouldDisplayBackButton } from '../core/winState';
import { DEBUG, doOnceEvery } from '../util/debug';
import { clearRect, drawImage, fillRect, fillRoundRect, fillText, lineTo, moveTo, pathRect, pathRectCircle, roundedPath, strokeRect } from '../util/dutil';
import { SE2, apply, compose, inverse, translate } from '../util/se2';
import { apply_to_rect } from '../util/se2-extra';
import { Point, Rect } from '../util/types';
import { allRectPts, boundRect, insetRect, invertRect, midpointOfRect, scaleRectToCenter, scaleRectToCenterPoint } from '../util/util';
import { vadd, vdiv, vequal, vm, vscale, vtrans } from '../util/vutil';
import { drawAnimation } from './drawAnimation';
import { drawBonus } from './drawBonus';
import { wordBubblePanicBounds, wordBubbleRect } from './drawPanicBar';
import { formatTime } from './formatTime';
import { CanvasInfo } from './use-canvas';
import { pan_canvas_from_world_of_state } from './view-helpers';
import { GLOBAL_BORDER, PANIC_THICK, canvas_bds_in_canvas, canvas_from_hand, canvas_from_resbar, canvas_from_toolbar, effective_resbar_bds_in_canvas, effective_toolbar_bds_in_canvas, hand_bds_in_canvas, inner_hand_bds_in_canvas, panic_bds_in_canvas, pause_button_bds_in_canvas, resbar_bds_in_canvas, score_bds_in_canvas, spacer1_bds_in_canvas, spacer2_bds_in_canvas, toolbar_bds_in_canvas, world_bds_in_canvas } from './widget-helpers';

const INTERFACE_RADIUS = 2 * GLOBAL_BORDER;
const PANIC_RADIUS = Math.min(INTERFACE_RADIUS, PANIC_THICK / 2);
export const FIXED_WORD_BUBBLE_SIZE = 100;

const interfaceCyanColor = 'rgb(0,255,255,0.5)';
const backgroundGray = '#595959';

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

function drawResbar(d: CanvasRenderingContext2D, state: CoreState) {
  const largeSprites = getAssets().largeSpritesBuf.c;
  d.imageSmoothingEnabled = true;

  const ress = getCurrentResources(state);
  ress.forEach((res, ix_in_resbar) => {
    const ICON_SCALE = 0.7;
    const S_in_canvas = resbar_bds_in_canvas.sz.x;
    const rect_in_canvas = apply_to_rect(
      canvas_from_resbar(),
      { p: { x: 0, y: S_in_canvas * ix_in_resbar }, sz: { x: S_in_canvas, y: S_in_canvas } },
    );
    const scaled_rect_in_canvas = scaleRectToCenter(rect_in_canvas, ICON_SCALE);
    drawImage(d, largeSprites, largeRectOf(res), scaled_rect_in_canvas);
    drawToolbarCount(d, rect_in_canvas, state.slowState.resource[res]);
  });

}

function drawToolbar(d: CanvasRenderingContext2D, state: CoreState) {
  const largeSprites = getAssets().largeSpritesBuf.c;
  d.imageSmoothingEnabled = true;

  const tools = getCurrentTools(state);
  const currentTool = getCurrentTool(state);
  const ICON_SCALE = 0.7;
  tools.forEach((tool, ix_in_toolbar) => {
    const S_in_canvas = toolbar_bds_in_canvas.sz.x;
    const rect_in_canvas = apply_to_rect(
      canvas_from_toolbar(),
      { p: { x: 0, y: S_in_canvas * ix_in_toolbar }, sz: { x: S_in_canvas, y: S_in_canvas } },
    );
    const scaled_rect_in_canvas = scaleRectToCenter(rect_in_canvas, ICON_SCALE);
    // indicate current tool
    if (tool == currentTool) {
      // This should probably be a roundrect also
      fillRect(d, insetRect(rect_in_canvas, 4), 'rgba(0, 128, 0, 0.5)');
    }

    drawImage(d, largeSprites, largeRectOf(tool), scaled_rect_in_canvas);

    if (tool == 'dynamite') {
      drawToolbarCount(d, rect_in_canvas, state.slowState.inventory.dynamites);
    }
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
    else if (tool == 'magnifying-glass') {
      drawToolbarCount(d, rect_in_canvas, state.slowState.inventory.glasses);
    }
  });
}

function drawUiFrame(d: CanvasRenderingContext2D, state: CoreState): void {
  const hasLost = lostState(state);

  const { p: tp, sz: ts } = effective_toolbar_bds_in_canvas(state);
  const { p: rp, sz: rs } = effective_resbar_bds_in_canvas(state);
  const tq = vadd(tp, ts);
  const rq = vadd(rp, rs);

  // This is the main fill for the outer interface
  d.beginPath();
  // One positive path for the outer canvas rectangle
  pathRect(d, invertRect(canvas_bds_in_canvas));

  const resbarPts: Point[] = rs.y > 0
    ? [
      // top right, just to top left of resbar
      { x: rp.x, y: rp.y + GLOBAL_BORDER },
      { x: rp.x, y: rq.y },
      { x: canvas_bds_in_canvas.p.x + canvas_bds_in_canvas.sz.x - GLOBAL_BORDER, y: rq.y }
    ]
    : [{ x: canvas_bds_in_canvas.p.x + canvas_bds_in_canvas.sz.x - GLOBAL_BORDER, y: tp.y + GLOBAL_BORDER }];

  // Subtract a rounded path
  roundedPath(d, [
    // top left, just to the bottom left of toolbar
    { x: tp.x + GLOBAL_BORDER, y: tq.y },
    { x: tq.x, y: tq.y },
    { x: tq.x, y: tp.y + GLOBAL_BORDER },
    ...resbarPts,
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

  ], INTERFACE_RADIUS);

  d.fillStyle = backgroundGray;
  d.fill();

  if (!hasLost) {
    // Subtract another path for the panic bar. I'm going to want to draw a slow-changing
    // gradient in html canvas over this gap, and let WebGL draw underneath it
    d.save();
    d.globalCompositeOperation = 'destination-out';
    fillRoundRect(d, panic_bds_in_canvas, PANIC_RADIUS, 'rgba(0,0,0,1)');
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

  fillRect(d, spacer1_bds_in_canvas, grad);
  fillRect(d, spacer2_bds_in_canvas, grad);

  // Draw gradient for panic bar
  if (!hasLost) {
    // XXX Probably should hoist this gradient construction up
    const grad = d.createLinearGradient(panic_bds_in_canvas.p.x, panic_bds_in_canvas.p.y,
      panic_bds_in_canvas.p.x, panic_bds_in_canvas.p.y + panic_bds_in_canvas.sz.y);
    grad.addColorStop(0, 'rgba(28, 29, 33, 0)');
    grad.addColorStop(0.75, 'rgba(28, 29, 33, 0.375)');
    grad.addColorStop(1, 'rgba(28, 29, 33, 0.7)');

    d.beginPath();
    roundedPath(d, allRectPts(panic_bds_in_canvas), PANIC_RADIUS);
    d.fillStyle = grad;
    d.fill();
  }

  // Draw toolbar
  drawToolbar(d, state);

  // Draw resbar
  drawResbar(d, state);
}

export function canvas_from_hand_tile(index: number): SE2 {
  return compose(canvas_from_hand(), translate({ x: index, y: 0 }));
}


function drawWordBonuses(ci: CanvasInfo, cs: CoreState) {
  const { d } = ci;

  cs.wordBonusState.active.forEach((wordBonus, i) => {
    const rect = wordBubbleRect(i);
    const bounds = wordBubblePanicBounds(i);
    fillRoundRect(d, rect, INTERFACE_RADIUS, backgroundGray);

    d.save();
    d.globalCompositeOperation = 'destination-out';
    d.beginPath();
    roundedPath(d, allRectPts(bounds), PANIC_RADIUS);
    d.fillStyle = 'rgba(0,0,0,1)';
    d.fill();
    d.restore();

    const grad = d.createLinearGradient(bounds.p.x, bounds.p.y,
      bounds.p.x, bounds.p.y + bounds.sz.y);
    grad.addColorStop(0, 'rgba(28, 29, 33, 0)');
    grad.addColorStop(0.75, 'rgba(28, 29, 33, 0.375)');
    grad.addColorStop(1, 'rgba(28, 29, 33, 0.7)');

    d.beginPath();
    roundedPath(d, allRectPts(bounds), PANIC_RADIUS);
    d.fillStyle = grad;
    d.fill();

    const font = ` bold 14px sans-serif`;
    d.textBaseline = 'middle';
    d.textAlign = 'left';
    (d as any).letterSpacing = '2px';
    fillText(d, wordBonus.word.toUpperCase(), vadd(rect.p, { y: rect.sz.y / 2, x: 10 }), 'white', font);
  });
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

  // this is sort of deprecated, but I'm leaving it here for now,
  // because it's useful for GL-cache debugging purposes
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
        drawBonus(d, bonus, pan_canvas_from_world, p, active);
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
    fillRoundRect(d, pause_button_bds_in_canvas, INTERFACE_RADIUS, 'rgba(255,255,255,0.2)');
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

  function drawOtherUi() {

    // draw exchange guide
    if (ms.t == 'exchange_tiles') {
      d.strokeStyle = interfaceCyanColor;
      d.lineWidth = 2;
      d.beginPath();
      moveTo(d, ms.orig_p_in_canvas);
      lineTo(d, ms.p_in_canvas);
      d.stroke();
    }

    // XXX draw clock --- disabled for now
    if (0) {
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
    drawOtherUi();

  // draw invalid words
  if (ms.t == 'up') {
    cs.slowState.invalidWords.forEach(lw => {
      drawInvalidWord(d, pan_canvas_from_world, lw);
    });
  }

  drawUiFrame(d, cs);

  drawPauseButton();

  if (!glEnabled) {
    drawWorld();
  }

  drawWordBonuses(ci, cs);

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

export function drawTileLetter(d: CanvasRenderingContext2D, letter: AbstractLetter, rect_in_canvas: Rect, color: string) {
  d.fillStyle = color;
  d.textBaseline = 'middle';
  d.textAlign = 'center';
  const fontSize = Math.round(0.6 * rect_in_canvas.sz.x);
  d.font = `bold ${fontSize}px sans-serif`;
  d.fillText(stringOfLetter(letter).toUpperCase(), rect_in_canvas.p.x + rect_in_canvas.sz.x / 2 + 0.5,
    rect_in_canvas.p.y + rect_in_canvas.sz.y / 2 + 1.5);
}
