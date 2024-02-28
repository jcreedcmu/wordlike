import { MobileId, PreTileEntity, Tile, TileEntity, TileEntityOptionalId, TileOptionalId } from './state-types';

// FIXME: global counter
let idCounter = 1;

export function freshId(): number {
  const id = idCounter++;
  if (id >= 32768)
    throw new Error("Too many ids! WebGL backend expects them to fit in 16 bits");
  return id;
}

export function ensureId(tile: TileEntityOptionalId): TileEntity {
  const id = tile.id ?? freshId();
  return { t: 'tile', ...tile, id };
}

export function addId(tile: PreTileEntity, forceId?: MobileId): TileEntity {
  const id = forceId ?? freshId();
  return { t: 'tile', ...tile, id };
}

export function ensureTileId(tile: TileOptionalId): Tile {
  const id = tile.id ?? freshId();
  return { ...tile, id };
}
