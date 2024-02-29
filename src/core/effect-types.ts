
export type SoundEffect =
  | { t: 'click' }
  | { t: 'beep' }
  ;

export type Effect =
  | { t: 'none' }
  | { t: 'soundEffect', sound: SoundEffect };
