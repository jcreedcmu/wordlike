import { largeSpriteLoc, largeSpriteRectOfPos, spriteLocOfTool, spriteRectOfPos } from "./sprite-sheet";
import { Rect } from "../util/types";
import { Tool, ResbarResource } from "../core/tool-types";
import { ButtonBarButton } from "../layout/button-bar";

export function rectOfTool(tool: Tool): Rect {
  return spriteRectOfPos(spriteLocOfTool(tool));
}

export function largeRectOf(tool: Tool | ResbarResource): Rect {
  return largeSpriteRectOfPos(largeSpriteLoc(tool));
}

export function largeRectOfButtonBarButton(b: ButtonBarButton): Rect {
  switch (b) {
    case 'bugReport': return largeSpriteRectOfPos({ y: 0, x: 11 });
    case 'settings': return largeSpriteRectOfPos({ y: 0, x: 12 });
  }
}
