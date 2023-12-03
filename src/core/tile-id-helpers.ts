import { Tile, TileEntity, TileEntityOptionalId, TileOptionalId } from "./state";

// FIXME: global counter
let tileIdCounter = 1000;

export function ensureId(tile: TileEntityOptionalId): TileEntity {
  const id = tile.id ?? `tile${tileIdCounter++}`;
  return { ...tile, id };
}

export function ensureTileId(tile: TileOptionalId): Tile {
  const id = tile.id ?? `tile${tileIdCounter++}`;
  return { ...tile, id };
}
