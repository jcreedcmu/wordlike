export const SPRITE_PIXEL_WIDTH = 32;
export const LARGE_SPRITE_PIXEL_WIDTH = 128;

export const tools = [
  'pointer',
  'hand',
  'dynamite',
  'bomb',
  'vowel',
  'consonant',
  'copy',
  'time',
  'magnifying-glass',
] as const;

export type Tool = (typeof tools)[number];

export const resbarResources = [
  'wood',
  'stone',
] as const;

export type ResbarResource = (typeof resbarResources)[number];
export type WorldOnlyResource =
  | 'planks'
  | 'axe'
  | 'safe-storage'
  ;
export type Resource = ResbarResource | WorldOnlyResource;
