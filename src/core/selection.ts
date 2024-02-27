import { Overlay } from "./layer";
import { MobileId } from './state-types';
import { SelectionOperation } from "./selection-operation";

export type SelectionState = {
  overlay: Overlay<boolean>,
  selectedIds: MobileId[],
};

export function evalSelectionOperation<T>(opn: SelectionOperation, a: T[], b: T[]): T[] {
  switch (opn) {
    case 'set': return b;
    case 'union': return [...new Set([...a, ...b])];
    case 'intersection': return a.filter(x => b.includes(x));
    case 'subtract': return a.filter(x => !b.includes(x));
  }
}

export function selectionOperationOfMods(mods: Set<string>): SelectionOperation {
  if (mods.has('shift') && mods.has('ctrl')) {
    return 'intersection';
  }
  if (mods.has('shift')) {
    return 'union';
  }
  if (mods.has('ctrl')) {
    return 'subtract';
  }
  return 'set';
}
