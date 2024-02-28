import { Point } from '../util/types';
import { ChunkUpdate } from './chunk';
import { MobileId, RenderableMobile } from './state-types';

export type CacheUpdate =
  | { t: 'chunkUpdate'; p_in_world_int: Point; chunkUpdate: ChunkUpdate; }
  | { t: 'mobileUpdate', id: MobileId, mobile: RenderableMobile }
  ;

export function mkChunkUpdate(p_in_world_int: Point, cu: ChunkUpdate): CacheUpdate {
  return { t: 'chunkUpdate', chunkUpdate: cu, p_in_world_int };
}

export function mkMobileUpdate(id: MobileId, mobile: RenderableMobile): CacheUpdate {
  return { t: 'mobileUpdate', id, mobile };
}
