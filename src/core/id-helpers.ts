import { PreTileEntity, Tile, TileEntity, TileEntityOptionalId, TileOptionalId } from './state-types';

// FIXME: global counter
let idCounter = 1;

export type MobileId = number;

export function freshId(): number {
  return idCounter++;
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
