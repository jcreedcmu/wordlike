import { PreTileEntity, Tile, TileEntity, TileEntityOptionalId, TileOptionalId } from "./state";

// FIXME: global counter
let tileIdCounter = 1000;

export function ensureId(tile: TileEntityOptionalId): TileEntity {
  const id = tile.id ?? `tile${tileIdCounter++}`;
  return { t: 'tile', ...tile, id };
}

export function addId(tile: PreTileEntity, forceId?: string): TileEntity {
  const id = forceId ?? `tile${tileIdCounter++}`;
  return { t: 'tile', ...tile, id };
}

export function ensureTileId(tile: TileOptionalId): Tile {
  const id = tile.id ?? `tile${tileIdCounter++}`;
  return { ...tile, id };
}
