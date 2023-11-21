import { Rect } from "../util/types";
import { Intent } from "./reduce";
import { GameState, State } from "./state";

export const TOOL_IMAGE_WIDTH = 32;

const tools = [
  'pointer',
  'hand',
  'dynamite',
  'bomb',
] as const;

export type Tool = (typeof tools)[number];

export function toolOfIndex(index: number): Tool | undefined {
  return tools[index];
}

export function indexOfTool(tool: Tool): number {
  return tools.findIndex(x => x == tool);
}

export function getCurrentTool(state: GameState): Tool {
  if (state.coreState.lost) {
    return 'hand';
  }
  return state.coreState.currentTool;
}

export const dynamiteIntent: Intent & { t: 'kill' } = { t: 'kill', radius: 0, cost: 1 };
export const bombIntent: Intent & { t: 'kill' } = { t: 'kill', radius: 1, cost: 3 };

export function getCurrentTools(state: GameState): Tool[] {
  if (state.coreState.lost) {
    return [];
  }
  const tools: Tool[] = ['pointer', 'hand'];
  if (state.coreState.score >= dynamiteIntent.cost) {
    tools.push('dynamite');
  }
  if (state.coreState.score >= bombIntent.cost) {
    tools.push('bomb');
  }
  return tools;
}

export function rectOfTool(tool: Tool): Rect {
  const S_in_image = TOOL_IMAGE_WIDTH;
  const ix_in_image = indexOfTool(tool);
  return { p: { x: 0, y: S_in_image * ix_in_image }, sz: { x: S_in_image, y: S_in_image } };
}
