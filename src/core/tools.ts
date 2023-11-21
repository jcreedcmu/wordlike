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
  const tools: Tool[] = ['pointer', 'hand'];
  if (state.coreState.score >= 1) {
    tools.push('dynamite');
  }
  if (state.coreState.score >= 3) {
    tools.push('bomb');
  }
  return tools;
}
