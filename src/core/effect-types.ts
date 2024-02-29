
export type SoundEffect =
  | { t: 'click' }
  ;

export type Effect =
  | { t: 'none' }
  | { t: 'soundEffect', sound: SoundEffect };
