export type WinState =
  | 'won'
  | 'lost'
  | 'playing'
  | 'creative'
  ;

// If true, display back button in place of pause button
export function shouldDisplayBackButton(ws: WinState): boolean {
  return ws == 'lost' || ws == 'won' || ws == 'creative';
}

// If true, an invalid state initializes the panic bar
export function shouldStartPanicBar(ws: WinState): boolean {
  return ws == 'playing';
}
