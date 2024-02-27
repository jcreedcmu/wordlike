export const resbarResources = [
  'wood',
  'stone',
] as const;

export type ResbarResource = (typeof resbarResources)[number];
export type WorldOnlyResource = 'planks' |
  'axe';
export type Resource = ResbarResource | WorldOnlyResource;
