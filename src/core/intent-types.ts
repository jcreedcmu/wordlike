import { SelectionOperation } from './selection-operation';
import { MobileId } from './state-types';

export type KillIntent =
  | { t: 'kill', radius: number }
  | { t: 'bomb' }
  | { t: 'fillWater' }
  ;

export type Intent =
  | { t: 'dragMobile', id: MobileId }
  | { t: 'vacuous' }
  | { t: 'panWorld' }
  | { t: 'exchangeMobiles', id: MobileId }
  | { t: 'startSelection', opn: SelectionOperation }
  | { t: 'copy' }
  | { t: 'magnify' }
  | KillIntent
  ;
