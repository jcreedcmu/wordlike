import { spriteLocOfTool, spriteRectOfPos } from "../ui/sprite-sheet";
import { produce } from "../util/produce";
import { Rect } from "../util/types";
import { GameLowAction } from "./action";
import { Intent } from './intent';
import { getScore } from "./scoring";
import { CoreState } from "./state";
import { drawOfState, freshPanic } from "./state-helpers";

// XXX rename this, this is really sprite size
export const TOOL_IMAGE_WIDTH = 32;

const tools = [
  'pointer',
  'hand',
  'dynamite',
  'bomb',
  'vowel',
  'consonant',
  'copy',
  'time',
] as const;

export type Tool = (typeof tools)[number];

export function toolOfIndex(index: number): Tool | undefined {
  return tools[index];
}

export function indexOfTool(tool: Tool): number {
  return tools.findIndex(x => x == tool);
}

export function getCurrentTool(state: CoreState): Tool {
  if (state.winState.t == 'lost') {
    return 'hand';
  }
  return state.currentTool;
}

export const dynamiteIntent: Intent & { t: 'kill' } = { t: 'kill', radius: 0, cost: 1 };
export const BOMB_RADIUS = 2;
export const bombIntent: Intent & { t: 'bomb' } = { t: 'bomb' };
export const copyIntent: Intent & { t: 'copy' } = { t: 'copy' };

export function getCurrentTools(state: CoreState): Tool[] {
  if (state.winState.t == 'lost') {
    return [];
  }
  const tools: Tool[] = ['pointer', 'hand'];
  if (getScore(state) >= dynamiteIntent.cost) {
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
  if (state.inventory.times > 0) {
    tools.push('time');
  }
  return tools;
}

export function rectOfTool(tool: Tool): Rect {
  return spriteRectOfPos(spriteLocOfTool(tool));
}

export function reduceToolSelect(state: CoreState, tool: Tool): GameLowAction {
  switch (tool) {
    case 'consonant': return { t: 'drawConsonant' };

    case 'vowel': return { t: 'drawVowel' };
    case 'time': {
      if (!state.panic)
        return { t: 'none' };
      const panic = freshPanic(state);
      return {
        t: 'multiple', actions: [
          { t: 'setPanic', panic },
          { t: 'decrement', which: 'times' },
        ]
      };
    }
    default: return { t: 'setTool', tool };
  }
}

export function toolPrecondition(state: CoreState, tool: Tool): boolean {
  switch (tool) {
    case 'bomb': return state.inventory.bombs >= 1;
    case 'pointer': return true;
    case 'hand': return true;
    case 'dynamite': return getScore(state) >= 1;
    case 'vowel': return state.inventory.vowels >= 1;
    case 'consonant': return state.inventory.consonants >= 1;
    case 'copy': return state.inventory.copies >= 1;
    case 'time': return state.inventory.times >= 1;
  }
}
