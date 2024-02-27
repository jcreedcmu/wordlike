import { largeSpriteLoc, largeSpriteRectOfPos, spriteLocOfTool, spriteRectOfPos } from "./sprite-sheet";
import { Rect } from "../util/types";
import { Tool, ResbarResource } from "../core/tool-types";

export function rectOfTool(tool: Tool): Rect {
  return spriteRectOfPos(spriteLocOfTool(tool));
}

export function largeRectOf(tool: Tool | ResbarResource): Rect {
  return largeSpriteRectOfPos(largeSpriteLoc(tool));
}
