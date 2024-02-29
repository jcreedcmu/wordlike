
export type SoundEffect =
  | { t: 'click' }
  | { t: 'beep' }
  | { t: 'setGain', gain: number }
  ;

export type Effect =
  | { t: 'none' }
  | { t: 'soundEffect', sound: SoundEffect };
