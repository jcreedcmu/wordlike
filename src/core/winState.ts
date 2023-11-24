export const WIN_SCORE = 1000;

export type WinState =
  | { t: 'won' }
  | { t: 'lost' }
  | { t: 'playing' }
  | { t: 'creative' }
  ;

// If true, display back button in place of pause button
export function shouldDisplayBackButton(ws: WinState): boolean {
  return ws.t == 'lost' || ws.t == 'won' || ws.t == 'creative';
}

// If true, an invalid state initializes the panic bar
export function shouldStartPanicBar(ws: WinState): boolean {
  return ws.t == 'playing';
}

// If true, it make sense to win from this state
export function canWinFromState(ws: WinState): boolean {
  return ws.t == 'playing';
}
