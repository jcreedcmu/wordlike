import { largeSpriteLoc, largeSpriteRectOfPos, spriteLocOfTool, spriteRectOfPos } from "../ui/sprite-sheet";
import { produce } from "../util/produce";
import { Rect } from "../util/types";
import { GameLowAction } from "./action";
import { Intent } from './intent';
import { getScore } from "./scoring";
import { CoreState } from "./state";
import { drawOfState, freshPanic } from "./state-helpers";

export const SPRITE_PIXEL_WIDTH = 32;
export const LARGE_SPRITE_PIXEL_WIDTH = 128;

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

const resources = [
  'wood'
] as const;

export type Resource = (typeof resources)[number];

export function toolOfIndex(index: number): Tool | undefined {
  return tools[index];
}

export function indexOfTool(tool: Tool): number {
  return tools.findIndex(x => x == tool);
}

export function getCurrentTool(state: CoreState): Tool {
  if (state.slowState.winState.t == 'lost') {
    return 'hand';
  }
  return state.slowState.currentTool;
}

export const dynamiteIntent: Intent & { t: 'kill' } = { t: 'kill', radius: 0 };
export const fillWaterIntent: Intent & { t: 'fillWater' } = { t: 'fillWater' };
export const BOMB_RADIUS = 2;
export const bombIntent: Intent & { t: 'bomb' } = { t: 'bomb' };
export const copyIntent: Intent & { t: 'copy' } = { t: 'copy' };

export function getCurrentTools(state: CoreState): Tool[] {
  if (state.slowState.winState.t == 'lost') {
    return [];
  }
  const tools: Tool[] = ['pointer', 'hand'];
  if (state.slowState.inventory.dynamites > 0) {
    tools.push('dynamite');
  }
  if (state.slowState.inventory.bombs > 0) {
    tools.push('bomb');
  }
  if (state.slowState.inventory.vowels > 0) {
    tools.push('vowel');
  }
  if (state.slowState.inventory.consonants > 0) {
    tools.push('consonant');
  }
  if (state.slowState.inventory.copies > 0) {
    tools.push('copy');
  }
  if (state.slowState.inventory.times > 0) {
    tools.push('time');
  }
  return tools;
}

export function getCurrentResources(state: CoreState): Resource[] {
  if (state.slowState.winState.t == 'lost') {
    return [];
  }
  const resources: Resource[] = [];
  if (state.slowState.resource.wood > 0) {
    resources.push('wood');
  }
  return resources;
}

export function rectOfTool(tool: Tool): Rect {
  return spriteRectOfPos(spriteLocOfTool(tool));
}

export function largeRectOf(tool: Tool | Resource): Rect {
  return largeSpriteRectOfPos(largeSpriteLoc(tool));
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
    case 'bomb': return state.slowState.inventory.bombs >= 1;
    case 'pointer': return true;
    case 'hand': return true;
    case 'dynamite': return state.slowState.inventory.dynamites >= 1;
    case 'vowel': return state.slowState.inventory.vowels >= 1;
    case 'consonant': return state.slowState.inventory.consonants >= 1;
    case 'copy': return state.slowState.inventory.copies >= 1;
    case 'time': return state.slowState.inventory.times >= 1;
  }
}
