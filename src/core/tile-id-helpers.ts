import { PreTileEntity, Tile, TileEntity, TileEntityOptionalId, TileOptionalId } from "./state";

// FIXME: global counter
let idCounter = 1000;

export function freshId(): string {
  return `id${idCounter++}`;
}

export function ensureId(tile: TileEntityOptionalId): TileEntity {
  const id = tile.id ?? freshId();
  return { t: 'tile', ...tile, id };
}

export function addId(tile: PreTileEntity, forceId?: string): TileEntity {
  const id = forceId ?? freshId();
  return { t: 'tile', ...tile, id };
}

export function ensureTileId(tile: TileOptionalId): Tile {
  const id = tile.id ?? freshId();
  return { ...tile, id };
}
