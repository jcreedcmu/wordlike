import { Tool, tools, ResbarResource, resbarResources } from "./tool-types";
import { GameLowAction } from "./action";
import { CoreState } from "./state";
import { freshPanic } from "./state-helpers";

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

export const BOMB_RADIUS = 2;

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
  if (state.slowState.inventory.glasses > 0) {
    tools.push('magnifying-glass');
  }
  return tools;
}

export function getCurrentResources(state: CoreState): ResbarResource[] {
  if (state.slowState.winState.t == 'lost') {
    return [];
  }
  return resbarResources.filter(res => state.slowState.resource[res] > 0);
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
    case 'magnifying-glass': return state.slowState.inventory.glasses >= 1;
  }
}
