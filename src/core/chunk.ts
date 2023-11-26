import { Bonus } from "./bonus";
import { Overlay } from "./layer";
import { TileId } from "./tile-helpers";

export const CHUNK_SIZE = 16;

export type Chunk = {
  data: Overlay<Bonus | TileId>[];
}
