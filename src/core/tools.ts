import { GameState, State } from "./state";

const tools = [
  'pointer',
  'hand',
  'dynamite',
] as const;

export type Tool = (typeof tools)[number];

export function toolOfIndex(index: number): Tool | undefined {
  return tools[index];
}

export function indexOfTool(tool: Tool): number {
  return tools.findIndex(x => x == tool);
}

export function currentTool(state: GameState): Tool {
  if (state.lost) {
    return 'hand';
  }
  // state should be responsible for maintaining the invariant that
  // tool index is always valid. Maybe instead I should store Tool in
  // state, not toolIndex, idk.
  return toolOfIndex(state.coreState.toolIndex)!;
}
