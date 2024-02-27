import { HAND_TILE_LIMIT } from '../core/state-types';
import { mapval, pixelSnapRect } from "../util/util";
import { vdiag } from "../util/vutil";
import { DEFAULT_TILE_SCALE, HAND_VERT_PADDING, HAND_VERT_MARGIN, HAND_HORIZ_MARGIN, PANIC_THICK, SPACER_WIDTH, GLOBAL_BORDER, canvas_bds_in_canvas } from "./widget-constants";
import { centerX, fixedRect, layout, nameRect, packHoriz, packVert, padRect, stretchRectY } from "../layout/layout";

const pauseButton = packVert(
  nameRect('pause', fixedRect(vdiag(DEFAULT_TILE_SCALE + 2 * HAND_VERT_PADDING - HAND_VERT_MARGIN))),
  fixedRect({ x: 0, y: HAND_VERT_MARGIN })
);
const innerHand = nameRect('inner_hand',
  padRect(10,
    nameRect('hand_tiles', fixedRect({ x: HAND_TILE_LIMIT * DEFAULT_TILE_SCALE, y: DEFAULT_TILE_SCALE }))));
const scoreRect = nameRect('score', fixedRect({ x: 100, y: 0 }));
const widgetTree = packVert(
  stretchRectY(1),
  centerX(
    nameRect('hand',
      packHoriz(
        fixedRect({ y: 0, x: HAND_HORIZ_MARGIN }),
        packVert(
          fixedRect({ x: 0, y: HAND_VERT_MARGIN }),
          nameRect('panic', { t: 'rect', single: { base: { x: 0, y: PANIC_THICK }, stretch: { x: 1, y: 0 } } }),
          fixedRect({ x: 0, y: HAND_VERT_MARGIN }),
          packHoriz(
            pauseButton,
            fixedRect({ y: 0, x: HAND_HORIZ_MARGIN }),
            nameRect('spacer1', fixedRect({ y: 0, x: SPACER_WIDTH })),
            fixedRect({ y: 0, x: HAND_HORIZ_MARGIN / 2 }),
            innerHand,
            fixedRect({ y: 0, x: HAND_HORIZ_MARGIN / 2 }),
            nameRect('spacer2', fixedRect({ y: 0, x: SPACER_WIDTH })),
            fixedRect({ y: 0, x: HAND_HORIZ_MARGIN }),
            scoreRect
          )
        ),
        fixedRect({ y: 0, x: HAND_HORIZ_MARGIN })
      ))
  ),
  fixedRect({ x: 0, y: GLOBAL_BORDER / 2 })
);
export const rects = mapval(layout(canvas_bds_in_canvas, widgetTree), pixelSnapRect);

export const score_bds_in_canvas = rects['score'];
export const spacer1_bds_in_canvas = rects['spacer1'];
export const spacer2_bds_in_canvas = rects['spacer2'];
export const hand_bds_in_canvas = rects['hand'];
export const inner_hand_bds_in_canvas = rects['inner_hand'];
export const hand_tile_bds_in_canvas = rects['hand_tiles'];
export const panic_bds_in_canvas = rects['panic'];
