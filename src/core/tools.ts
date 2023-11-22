import { produce } from "../util/produce";
import { Rect } from "../util/types";
import { Intent } from "./reduce";
import { GameState, State } from "./state";
import { drawOfState } from "./state-helpers";

export const TOOL_IMAGE_WIDTH = 32;

const tools = [
  'pointer',
  'hand',
  'dynamite',
  'bomb',
  'vowel',
  'consonant',
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
export const BOMB_RADIUS = 2;
export const bombIntent: Intent & { t: 'bomb' } = { t: 'bomb' };

export function getCurrentTools(state: GameState): Tool[] {
  if (state.coreState.lost) {
    return [];
  }
  const tools: Tool[] = ['pointer', 'hand'];
  if (state.coreState.score >= dynamiteIntent.cost) {
    tools.push('dynamite');
  }
  if (state.coreState.inventory.bombs > 0) {
    tools.push('bomb');
  }
  if (state.coreState.inventory.vowels > 0) {
    tools.push('vowel');
  }
  if (state.coreState.inventory.consonants > 0) {
    tools.push('consonant');
  }
  return tools;
}

export function rectOfTool(tool: Tool): Rect {
  const S_in_image = TOOL_IMAGE_WIDTH;
  const ix_in_image = indexOfTool(tool);
  return { p: { x: 0, y: S_in_image * ix_in_image }, sz: { x: S_in_image, y: S_in_image } };
}

export function reduceToolSelect(state: GameState, tool: Tool): GameState {
  switch (tool) {
    case 'consonant': {
      const newState = drawOfState(state, 'consonant');
      if (newState == state) return newState;
      return produce(newState, s => {
        s.coreState.inventory.consonants--;
      });
    }
    case 'vowel': {
      const newState = drawOfState(state, 'vowel');
      if (newState == state) return newState;
      return produce(newState, s => {
        s.coreState.inventory.vowels--;
      });
    }
    default: return produce(state, s => { s.coreState.currentTool = tool; });
  }
}
