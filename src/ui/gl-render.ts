import { Dispatch } from "../core/action";
import { Animation } from "../core/animations";
import { getAssets } from "../core/assets";
import { ActiveChunkInfo, Chunk, WORLD_CHUNK_SIZE, activeChunks, ensureChunk, getChunk, updateChunkCache } from "../core/chunk";
import { getWordBonusFraction, now_in_game } from "../core/clock";
import { mkOverlay } from "../core/layer";
import { eff_mob_in_world } from "../core/mobs";
import { CacheUpdate, CoreState, GameState, MobsState } from "../core/state";
import { pointFall } from "../core/state-helpers";
import { getTileId, get_hand_tiles, isSelectedForDrag } from "../core/tile-helpers";
import { BOMB_RADIUS, getCurrentTool } from "../core/tools";
import { DEBUG, doOnce, doOnceEvery, logger } from "../util/debug";
import { RgbColor, RgbaColor, imageDataOfBuffer } from "../util/dutil";
import { bufferSetFloats } from "../util/gl-util";
import { SE2, apply, compose, inverse, mkSE2, scale, translate } from "../util/se2";
import { apply_to_rect, asMatrix } from "../util/se2-extra";
import { Point, Rect } from "../util/types";
import { rectPts } from "../util/util";
import { vadd, vdiag, vequal, vmul, vsub } from "../util/vutil";
import { drawGlAnimation } from "./drawGlAnimation";
import { renderPanicBar, wordBubblePanicRect } from "./drawPanicBar";
import { CANVAS_TEXTURE_UNIT, FONT_TEXTURE_UNIT, GlEnv, PREPASS_TEXTURE_UNIT, SPRITE_TEXTURE_UNIT, drawOneSprite, drawOneTile, mkBonusDrawer, mkCanvasDrawer, mkDebugQuadDrawer, mkPrepassHelper, mkRectDrawer, mkSpriteDrawer, mkTileDrawer, mkWorldDrawer } from "./gl-common";
import { gl_from_canvas } from "./gl-helpers";
import { FIXED_WORD_BUBBLE_SIZE, canvas_from_hand_tile } from "./render";
import { spriteLocOfMob } from "./sprite-sheet";
import { resizeView } from "./ui-helpers";
import { CanvasGlInfo } from "./use-canvas";
import { BUBBLE_FONT_SIZE, canvas_from_drag_tile, cell_in_canvas, drawBubbleAux, pan_canvas_from_world_of_state } from "./view-helpers";
import { canvas_bds_in_canvas, getWidgetPoint, hand_bds_in_canvas, panic_bds_in_canvas } from "./widget-helpers";

const shadowColorRgba: RgbaColor = [128, 128, 100, Math.floor(0.4 * 255)];

// This is for an offscreen texture into which I render one pixel per
// world *cell*, containing information about bonuses and tile
// occupancy at that cell. I think 256 is probably big enough to
// cover, because maybe at max zoom-out a cell could be like 8 pixels,
// and 8 * 512 = 2048 should be as big as any reasonable screen.
//
// (A 4k monitor has twice as many pixels, but in that case I think
// max-zoom-out should have a cell be 16 double-resolution pixels...
// having >100 × 100 cells per screen is already probably plenty)
const PREPASS_SIZE: Point = { x: 256, y: 256 };

export const prepass_from_gl: SE2 = {
  scale: { x: PREPASS_SIZE.x / 2, y: PREPASS_SIZE.y / 2 },
  translate: { x: PREPASS_SIZE.x / 2, y: PREPASS_SIZE.y / 2 },
};

export const gl_from_prepass: SE2 = inverse(prepass_from_gl);

function drawCanvas(env: GlEnv): void {
  const { gl, canvasDrawer: { prog, position } } = env;
  gl.useProgram(prog);

  const u_texture = gl.getUniformLocation(prog, 'u_texture')!;
  gl.uniform1i(u_texture, CANVAS_TEXTURE_UNIT);
  const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
  gl.uniform2f(u_canvasSize, devicePixelRatio * canvas_bds_in_canvas.sz.x, devicePixelRatio * canvas_bds_in_canvas.sz.y);

  const u_texture_from_canvas = gl.getUniformLocation(prog, 'u_texture_from_canvas');
  const texture_from_canvas = inverse(
    mkSE2(
      { x: devicePixelRatio * canvas_bds_in_canvas.sz.x, y: -devicePixelRatio * canvas_bds_in_canvas.sz.y },
      { x: 0, y: devicePixelRatio * canvas_bds_in_canvas.sz.y }
    ));
  gl.uniformMatrix3fv(u_texture_from_canvas, false, asMatrix(texture_from_canvas));

  const [p1, p2] = rectPts(apply_to_rect(gl_from_canvas, canvas_bds_in_canvas));
  bufferSetFloats(gl, position, [
    p1.x, p2.y,
    p2.x, p2.y,
    p1.x, p1.y,
    p2.x, p1.y,
  ]);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function glFillRecta(env: GlEnv, rect_in_canvas: Rect, color: RgbaColor): void {
  const { gl } = env;
  gl.useProgram(env.rectDrawer.prog);
  const rect_in_gl = apply_to_rect(gl_from_canvas, rect_in_canvas);
  const [p1, p2] = rectPts(rect_in_gl);
  bufferSetFloats(gl, env.rectDrawer.position, [
    p1.x, p2.y,
    p2.x, p2.y,
    p1.x, p1.y,
    p2.x, p1.y,
  ]);
  gl.uniform4fv(env.rectDrawer.colorUniformLocation, [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255]);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function glFillRect(env: GlEnv, rect_in_canvas: Rect, color: RgbColor): void {
  glFillRecta(env, rect_in_canvas, [...color, 255]);
}

function renderPrepass(env: GlEnv, state: CoreState, canvas_from_world: SE2): ActiveChunkInfo {
  const { gl } = env;


  // clear offscreen texture
  gl.clearColor(0.03, 0.03, 0.05, 0.05); // predivided by DEBUG_COLOR_SCALE
  gl.clear(gl.COLOR_BUFFER_BIT);

  // XXX I think I want to have activeChunks return just a bit
  // larger of a region than it currently is.
  //
  // My reasoning is this. Every fragment in the canvas is something
  // I need to render. I can map this fragment point to a world
  // point p. To render point p, I need to sample the bonus-cell
  // value at p + (±0.5, ±0.5). To do that I need to know about the
  // bonus data at ⌊p + (±0.5, ±0.5)⌋.
  const aci = activeChunks(canvas_from_world);
  gl.activeTexture(gl.TEXTURE0 + PREPASS_TEXTURE_UNIT);

  aci.ps_in_chunk.forEach(p => {
    const chunk = getChunk(env._cachedTileChunkMap, p);
    if (chunk == undefined) {
      logger('missedChunkRendering', `missing data for debug2 chunk`);
      return;
    }
    const offset = vmul(WORLD_CHUNK_SIZE, vsub(p, aci.min_p_in_chunk));
    gl.texSubImage2D(gl.TEXTURE_2D, 0, offset.x, offset.y, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, chunk.imdat);
  });

  return aci;
}


function drawWorld(env: GlEnv, state: GameState, canvas_from_world: SE2, aci: ActiveChunkInfo): void {
  const { gl } = env;
  const { prog, position } = env.worldDrawer;
  gl.useProgram(prog);

  const canvas_rect_in_gl = apply_to_rect(gl_from_canvas, canvas_bds_in_canvas);
  // XXX PERF this rect should never change, so we don't need to set it every time
  const [p1, p2] = rectPts(canvas_rect_in_gl);
  bufferSetFloats(gl, position, [
    p1.x, p2.y,
    p2.x, p2.y,
    p1.x, p1.y,
    p2.x, p1.y,
  ]);

  const u_spriteTexture = gl.getUniformLocation(prog, 'u_spriteTexture');
  gl.uniform1i(u_spriteTexture, SPRITE_TEXTURE_UNIT);
  const u_fontTexture = gl.getUniformLocation(prog, 'u_fontTexture');
  gl.uniform1i(u_fontTexture, FONT_TEXTURE_UNIT);
  const u_chunkDataTexture = gl.getUniformLocation(prog, 'u_prepassTexture');
  gl.uniform1i(u_chunkDataTexture, PREPASS_TEXTURE_UNIT);
  const u_canvasSize = gl.getUniformLocation(prog, 'u_canvasSize');
  gl.uniform2f(u_canvasSize, devicePixelRatio * canvas_bds_in_canvas.sz.x, devicePixelRatio * canvas_bds_in_canvas.sz.y);
  const u_min_p_in_chunk = gl.getUniformLocation(prog, 'u_min_p_in_chunk');
  gl.uniform2f(u_min_p_in_chunk, aci.min_p_in_chunk.x, aci.min_p_in_chunk.y);

  const u_world_from_canvas = gl.getUniformLocation(prog, "u_world_from_canvas");
  gl.uniformMatrix3fv(u_world_from_canvas, false, asMatrix(inverse(compose(scale(vdiag(devicePixelRatio)), canvas_from_world))));

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}


function drawAnimations(env: GlEnv, canvas_from_world: SE2, animations: Animation[], time_ms: number) {
  animations.forEach(anim => {
    drawGlAnimation(env, canvas_from_world, anim, time_ms);
  });
}

function drawMobs(env: GlEnv, canvas_from_world: SE2, mobsState: MobsState): void {
  mobsState.mobs.forEach(mob => {
    switch (mob.t) {
      case 'snail':
        drawOneSprite(env, spriteLocOfMob(mob), compose(canvas_from_world, translate(eff_mob_in_world(mob))));
        break;
    }
  });
}

const shouldDebug = { v: false };
let oldState: GameState | null = null;
export function renderGlPane(ci: CanvasGlInfo, env: GlEnv, state: GameState): void {
  // process cache update queue
  state.coreState._cacheUpdateQueue.forEach(cu => {
    updateChunkCache(env._cachedTileChunkMap, state.coreState, cu.p_in_world_int, cu.chunkUpdate);
  });
  // ensure chunk cache is full enough
  let cache = env._cachedTileChunkMap;
  const aci = activeChunks(pan_canvas_from_world_of_state(state));
  for (const p_in_chunk of aci.ps_in_chunk) {
    ensureChunk(cache, state.coreState, p_in_chunk);
  }

  env._cachedTileChunkMap = cache;

  const { d: gl } = ci;

  const actuallyRender = () => {
    const cs = state.coreState;
    const ms = state.mouseState;

    // render the prepass
    const canvas_from_world = pan_canvas_from_world_of_state(state);
    const aci = renderPrepass(env, cs, canvas_from_world);

    // clear canvas & initialize blending
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // draw world
    drawWorld(env, state, canvas_from_world, aci);

    // draw bomb shadow
    const currentTool = getCurrentTool(cs);
    if (currentTool == 'bomb' && getWidgetPoint(cs, ms.p_in_canvas).t == 'world') {
      const radius = BOMB_RADIUS;
      for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
          glFillRecta(env, cell_in_canvas(vadd({ x, y }, pointFall(cs, ms.p_in_canvas)), canvas_from_world), shadowColorRgba);
        }
      }
    }

    // draw mobs
    drawMobs(env, canvas_from_world, cs.mobsState);

    // draw animations
    drawAnimations(env, canvas_from_world, cs.animations, now_in_game(cs.game_from_clock));

    // draw panic bar
    if (!state.coreState.slowState.paused) {
      if (state.coreState.slowState.winState.t != 'lost' && state.coreState.panic) {
        const rr = renderPanicBar(state.coreState.panic, state.coreState.game_from_clock);
        glFillRect(env, panic_bds_in_canvas, [0, 0, 0]);
        glFillRect(env, rr.rect, rr.color);
      }
      else {
        glFillRect(env, panic_bds_in_canvas, [128, 128, 128]);
      }
    }

    // draw miscellaneous html-canvas-rendered ui
    drawCanvas(env);

    if (!state.coreState.slowState.paused) {
      // draw word bubble progress bars
      for (const wordBonus of cs.wordBonusState.active) {
        if (cs.wordBonusState.shown !== undefined && vequal(cs.wordBonusState.shown, wordBonus.p_in_world_int)) {
          const text_in_canvas = vadd({ x: -24, y: -24 }, apply(canvas_from_world, vadd(wordBonus.p_in_world_int, { x: 0.4, y: 0 })));
          const rr = wordBubblePanicRect(text_in_canvas, BUBBLE_FONT_SIZE, 2, FIXED_WORD_BUBBLE_SIZE, getWordBonusFraction(wordBonus, cs.game_from_clock));
          glFillRect(env, rr.rect, rr.color);
        }

      }

      // draw hand tiles
      get_hand_tiles(cs).forEach(tile => {
        if (isSelectedForDrag(state, tile))
          return;
        drawOneTile(env, tile.letter, canvas_from_hand_tile(tile.loc.index));
      });

      // Here's where we draw dragged tiles in general
      // draw dragged tiles from selection
      if (ms.t == 'drag_tile') {

        const tile0 = getTileId(cs, ms.id);

        if (cs.selected) {
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

              const canvas_from_other_tile = compose(canvas_from_drag_tile(cs, ms), drag_tile_from_other_tile);
              drawOneTile(env, tile.letter, canvas_from_other_tile);
            }
          });
        }
        else {
          const tile = getTileId(cs, ms.id);
          drawOneTile(env, tile.letter, canvas_from_drag_tile(cs, ms));
        }
      }
    }

    //// show the prepass for debugging reasons
    // debugPrepass(env, state.coreState);
  };

  if (DEBUG.glProfiling) {
    const ext = gl.getExtension('EXT_disjoint_timer_query');
    if (ext == null) {
      doOnce('glDebugExtensionError', () => console.log(`Couldn't get EXT_disjoint_timer_query`));
      actuallyRender();
    }
    else {
      let alreadyRendered = false;
      doOnceEvery('glTiming', 20, () => {
        alreadyRendered = true;
        const query = gl.createQuery()!;
        const NUM_TRIALS = 10;
        gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
        for (let i = 0; i < NUM_TRIALS; i++) {
          actuallyRender();
        }
        gl.endQuery(ext.TIME_ELAPSED_EXT);

        setTimeout(() => {
          const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
          if (available) {
            console.log('opengl frame elapsed ms', gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6 / NUM_TRIALS);
          }
          else {
            console.log('not available');
          }
        }, 1000);
      });
      if (!alreadyRendered)
        actuallyRender();
    }
  }
  else {
    actuallyRender();
  }
}

export function glInitialize(ci: CanvasGlInfo, dispatch: Dispatch): GlEnv {
  dispatch({ t: 'resize', vd: resizeView(ci.c) });
  const { d: gl } = ci;

  // Sprite texture
  const spriteTexture = gl.createTexture();
  if (spriteTexture == null) {
    throw new Error(`couldn't create sprite texture`);
  }
  gl.activeTexture(gl.TEXTURE0 + SPRITE_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, spriteTexture);

  const spriteImdat = imageDataOfBuffer(getAssets().spriteSheetBuf);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spriteImdat);

  // Font texture
  const fontTexture = gl.createTexture();
  if (fontTexture == null) {
    throw new Error(`couldn't create font texture`);
  }
  gl.activeTexture(gl.TEXTURE0 + FONT_TEXTURE_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, fontTexture);

  const fontImdat = imageDataOfBuffer(getAssets().fontSheetBuf);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fontImdat);

  gl.viewport(0, 0, devicePixelRatio * canvas_bds_in_canvas.sz.x, devicePixelRatio * canvas_bds_in_canvas.sz.y);

  return {
    gl,
    tileDrawer: mkTileDrawer(gl),
    spriteDrawer: mkSpriteDrawer(gl),
    worldDrawer: mkWorldDrawer(gl),
    rectDrawer: mkRectDrawer(gl),
    debugQuadDrawer: mkDebugQuadDrawer(gl),
    canvasDrawer: mkCanvasDrawer(gl),
    prepassHelper: mkPrepassHelper(gl, PREPASS_SIZE),
    bonusDrawer: mkBonusDrawer(gl),
    _cachedTileChunkMap: mkOverlay<Chunk>(),
  };
}
