import { Point } from '../util/types';
import { MobileId } from './basic-types';
import { AbstractLetter } from './letters';
import { MobState } from './mobs';
import { SelectionOperation } from './selection-operation';
import { ResbarResource, Resource } from "./tool-types";

export type MoveMobile = { mobile: RenderableMobile, id: MobileId, p_in_world_int: Point };
export type MoveMobileNoId = { mobile: RenderableMobile, p_in_world_int: Point };
export type GenMoveTile = { id: MobileId, loc: Location };

export type MouseState =
  | { t: 'up', p_in_canvas: Point }
  | { t: 'down', p_in_canvas: Point }
  // drag_world means we're panning
  | { t: 'drag_world', orig_p: Point, p_in_canvas: Point }
  // drag_selection means we're actually dragging out the selection rectangle
  | { t: 'drag_selection', orig_p: Point, p_in_canvas: Point, opn: SelectionOperation }
  | { t: 'exchange_tiles', orig_loc: Location, orig_p_in_canvas: Point, p_in_canvas: Point, id: MobileId }
  // drag_mobile means we're dragging one or more mobiles starting from a position in-world, or in-hand
  | {
    t: 'drag_mobile',
    orig_loc: Location,
    orig_p_in_canvas: Point,
    p_in_canvas: Point,
    id: MobileId,
    flipped: boolean,
  }
  // drag_resource means we're dragging a resource starting from a position in the resbar.
  // XXX: consider how this could perhaps be merged with drag_mobile
  | {
    t: 'drag_resource',
    p_in_canvas: Point,
    orig_p_in_canvas: Point,
    res: ResbarResource,
    res_ix: number,
  }
  ;

export type Tile = {
  id: MobileId,
  p_in_world_int: Point,
  letter: AbstractLetter,
};

export type TileOptionalId = {
  id?: MobileId,
  p_in_world_int: Point,
  letter: AbstractLetter,
};

export type TileNoId = {
  p_in_world_int: Point,
  letter: AbstractLetter,
};

export const HAND_TILE_LIMIT = 10;

export type HandLoc = { t: 'hand', index: number };
export type MainLoc = { t: 'world', p_in_world_int: Point };
export type NowhereLoc = { t: 'nowhere' };
export type Location = HandLoc | MainLoc | NowhereLoc;

export type TileEntity = {
  t: 'tile',
  id: MobileId,
  loc: Location,
  letter: AbstractLetter,
};

export type ResourceEntity = {
  t: 'resource',
  id: MobileId,
  loc: Location,
  res: Resource,
  durability: number, // XXX: should this be more tied to the particular resource?
};

export type MobileEntity = TileEntity | ResourceEntity;
// This should contain enough information to render a mobile assuming we
// already know its location.

// XXX: unused?
export type RenderableMobile =
  | { t: 'tile', letter: AbstractLetter }
  | { t: 'resource', res: Resource, durability: number };

export type PreTileEntity = {
  loc: Location,
  letter: AbstractLetter,
};

export type MainTile = TileEntity & { loc: MainLoc; };
export type HandTile = TileEntity & { loc: HandLoc; };

export type TileEntityOptionalId = {
  id: MobileId | undefined;
  loc: Location;
  letter: AbstractLetter;
};

export type ScoreState = {
  score: number,
  highWaterMark: number,
};

export type ActiveWordBonus = {
  word: string,
  activation_time_in_game: number,
  p_in_world_int: Point,
};

export type WordBonusState = {
  numAllocated: number,
  active: ActiveWordBonus[],
};

export type InventoryItems = {
  dynamites: number,
  bombs: number,
  vowels: number,
  consonants: number,
  copies: number,
  times: number,
  glasses: number,
};

export type ResourceItems = Record<ResbarResource, number>;

export type MobsState = {
  mobs: Record<string, MobState>
};
