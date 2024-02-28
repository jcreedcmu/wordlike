import { CacheUpdate, RenderCache } from "../core/cache-types";
import { BIT_CONNECTED, BIT_SELECTED, BONUS_CHANNEL, Chunk, ChunkUpdate, METADATA_CHANNEL, MOBILE_CHANNEL_H, MOBILE_CHANNEL_L, WORLD_CHUNK_SIZE } from "../core/chunk";
import { Overlay, getOverlay } from "../core/layer";
import { byteOfLetter } from "../core/letters";
import { CoreState } from "../core/state";
import { MobileId, RenderableMobile } from "../core/state-types";
import { Point } from "../util/types";
import { unreachable } from "../util/util";
import { vm2, vmul, vsub } from "../util/vutil";
import { ensureChunk } from "./chunk-helpers";
import { spriteLocOfChunkValue, spriteLocOfRes } from "./sprite-sheet";

// === cell_data format ===
//
// .r: which bonus we should show here. [xxxx][yyyy] high 4 bits are x coord on the sprite sheet, low 4 bits are y.
// .g: some metadata.
//       bit 0: tile is selected
//       bit 1: tile is connected to origin
//       bit 2: cell is visible
// .ba: which mobile we should draw here.
//      0: no mobile at all, let bonus show through
//     ≠0: show mobile with id [bbbbbbbb][aaaaaaaa], b is high bits and a is low bits.

// === mobile_data format ===
//
// .r: mobile type
//    0: resource
//    1: tile
// if resource:
// .g: [xxxx][yyyy] coordinates on sprite sheet
// .b: durability remaining
//
// if tile:
// .g: letter index

// This packs a Point in 16x16 into a single byte
function byteOfSpriteLoc(p: Point): number {
  return (p.x << 4) + p.y;
}

function freshMobileFlags(oldFlags: number): number {
  return oldFlags & ~(BIT_CONNECTED | BIT_SELECTED); // leave visibility bit alone
}

function processChunkUpdate(cu: ChunkUpdate, oldVec: number[]): number[] {
  const rv = [...oldVec];
  switch (cu.t) {
    case 'bonus': {
      rv[BONUS_CHANNEL] = byteOfSpriteLoc(spriteLocOfChunkValue({ t: 'bonus', bonus: cu.bonus }));
      return rv;
    }
    case 'addMobile': {
      const id = cu.id;
      rv[MOBILE_CHANNEL_H] = id >> 8;
      rv[MOBILE_CHANNEL_L] = id & 255;
      rv[METADATA_CHANNEL] = freshMobileFlags(oldVec[METADATA_CHANNEL]);
      return rv;
    }
    case 'removeMobile': {
      rv[MOBILE_CHANNEL_H] = 0;
      rv[MOBILE_CHANNEL_L] = 0;
      return rv;
    }
    case 'setBit': {
      rv[METADATA_CHANNEL] |= 1 << cu.bit;
      return rv;
    }
    case 'clearBit': {
      rv[METADATA_CHANNEL] &= (~(1 << cu.bit));
      return rv;
    }
    case 'restoreMobile': {
      const id = cu.id;
      rv[MOBILE_CHANNEL_H] = id >> 8;
      rv[MOBILE_CHANNEL_L] = id & 255;
      return rv;
    }
  }
}

function updateMobileCache(imdat: ImageData, id: MobileId, mobile: RenderableMobile): void {
  const ix = 4 * id;
  switch (mobile.t) {
    // this is in mobile_data format
    case 'tile': {
      imdat.data[ix + 0] = 1;
      imdat.data[ix + 1] = byteOfLetter(mobile.letter);
    } break;
    case 'resource': {
      imdat.data[ix + 0] = 0;
      imdat.data[ix + 1] = byteOfSpriteLoc(spriteLocOfRes(mobile.res));
    } break;
    default: unreachable(mobile);
  }
}

function updateChunkCache(cache: Overlay<Chunk>, cs: CoreState, p_in_world: Point, cu: ChunkUpdate): void {
  const p_in_chunk = vm2(p_in_world, WORLD_CHUNK_SIZE, (x, wcs) => Math.floor(x / wcs));
  ensureChunk(cache, cs, p_in_chunk);
  const { x, y } = vsub(p_in_world, vmul(p_in_chunk, WORLD_CHUNK_SIZE));
  const chunk = getOverlay(cache, p_in_chunk)!;
  const ix = x + y * chunk.size.x;
  const newVec = processChunkUpdate(cu, [
    chunk.imdat.data[4 * ix + 0],
    chunk.imdat.data[4 * ix + 1],
    chunk.imdat.data[4 * ix + 2],
    chunk.imdat.data[4 * ix + 3]
  ]);
  chunk.imdat.data[4 * ix + 0] = newVec[0];
  chunk.imdat.data[4 * ix + 1] = newVec[1];
  chunk.imdat.data[4 * ix + 2] = newVec[2];
  chunk.imdat.data[4 * ix + 3] = newVec[3];
}

export function updateCache(cache: RenderCache, cs: CoreState, cu: CacheUpdate): void {
  switch (cu.t) {
    case 'chunkUpdate': updateChunkCache(cache.chunkCache, cs, cu.p_in_world_int, cu.chunkUpdate); break;
    case 'mobileUpdate': updateMobileCache(cache.mobileCache, cu.id, cu.mobile); break;
    default: unreachable(cu);
  }
}
