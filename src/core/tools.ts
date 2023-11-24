import { produce } from "../util/produce";
import { Rect } from "../util/types";
import { Intent } from './intent';
import { CoreState } from "./state";
import { drawOfState } from "./state-helpers";

export const TOOL_IMAGE_WIDTH = 32;

const tools = [
  'pointer',
  'hand',
  'dynamite',
  'bomb',
  'vowel',
  'consonant',
  'copy',
] as const;

export type Tool = (typeof tools)[number];

export function toolOfIndex(index: number): Tool | undefined {
  return tools[index];
}

export function indexOfTool(tool: Tool): number {
  return tools.findIndex(x => x == tool);
}

export function getCurrentTool(state: CoreState): Tool {
  if (state.winState == 'lost') {
    return 'hand';
  }
  return state.currentTool;
}

export const dynamiteIntent: Intent & { t: 'kill' } = { t: 'kill', radius: 0, cost: 1 };
export const BOMB_RADIUS = 2;
export const bombIntent: Intent & { t: 'bomb' } = { t: 'bomb' };
export const copyIntent: Intent & { t: 'copy' } = { t: 'copy' };

export function getCurrentTools(state: CoreState): Tool[] {
  if (state.winState == 'lost') {
    return [];
  }
  const tools: Tool[] = ['pointer', 'hand'];
  if (state.score >= dynamiteIntent.cost) {
    tools.push('dynamite');
  }
  if (state.inventory.bombs > 0) {
    tools.push('bomb');
  }
  if (state.inventory.vowels > 0) {
    tools.push('vowel');
  }
  if (state.inventory.consonants > 0) {
    tools.push('consonant');
  }
  if (state.inventory.copies > 0) {
    tools.push('copy');
  }
  return tools;
}

export function rectOfTool(tool: Tool): Rect {
  const S_in_image = TOOL_IMAGE_WIDTH;
  const ix_in_image = indexOfTool(tool);
  return { p: { x: 0, y: S_in_image * ix_in_image }, sz: { x: S_in_image, y: S_in_image } };
}

export function reduceToolSelect(state: CoreState, tool: Tool): CoreState {
  switch (tool) {
    case 'consonant': {
      const newState = drawOfState(state, 'consonant');
      if (newState == state) return state;
      return produce(newState, s => {
        s.inventory.consonants--;
      });
    }
    case 'vowel': {
      const newState = drawOfState(state, 'vowel');
      if (newState == state) return state;
      return produce(newState, s => {
        s.inventory.vowels--;
      });
    }
    default: return produce(state, s => { s.currentTool = tool; });
  }
}
