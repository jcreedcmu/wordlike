import { Intent } from './intent-types';

export const dynamiteIntent: Intent & { t: 'kill'; } = { t: 'kill', radius: 0 };
export const fillWaterIntent: Intent & { t: 'fillWater'; } = { t: 'fillWater' };
export const bombIntent: Intent & { t: 'bomb'; } = { t: 'bomb' };
export const copyIntent: Intent & { t: 'copy'; } = { t: 'copy' };
export const magnifyIntent: Intent & { t: 'magnify'; } = { t: 'magnify' };
