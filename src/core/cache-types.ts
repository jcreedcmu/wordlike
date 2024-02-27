import { Point } from '../util/types';
import { ChunkUpdate } from './chunk';


export type CacheUpdate = { t: 'chunkUpdate'; p_in_world_int: Point; chunkUpdate: ChunkUpdate; };
