import { Point } from '../util/types';
import { Chunk, ChunkUpdate } from './chunk';
import { Overlay } from './layer';
import { RenderableMobile } from './state-types';
import { MobileId } from './basic-types';

export type RenderCache = {
  chunkCache: Overlay<Chunk>;
  mobileCache: ImageData;
};

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
