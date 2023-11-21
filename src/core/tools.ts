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

export function getCurrentTools(state: GameState): Tool[] {
  if (state.coreState.lost) {
    return [];
  }
  return ['pointer', 'hand', 'dynamite', 'bomb'];
}
