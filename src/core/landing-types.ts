import { Point } from "../util/types";
import { AbstractLetter } from "./letters";
import { MobType } from "./mobs";
import { MobileId } from './basic-types';
import { ResbarResource, Resource } from "./tool-types";

// A thing that can be moved onto something else
export type MoveSource =
  | { t: 'tile', letter: AbstractLetter }
  | { t: 'resource', res: Resource }
  | { t: 'mob', mobType: MobType }
  ;

export type LandingMove = { src: MoveSource, p_in_world_int: Point };

// A thing that can be moved onto something else (with identity)

export type MoveSourceId = { t: 'mobile'; id: MobileId; } |
{ t: 'freshResource'; res: ResbarResource; };

export type LandingMoveId = { src: MoveSourceId; p_in_world_int: Point; };
