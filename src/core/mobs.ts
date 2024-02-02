import { Point } from "../util/types";

export type Orientation = 'N' | 'W' | 'E' | 'S';

export type MobType =
  | 'snail';

export type MobState = {
  t: MobType,
  p_in_world: Point,
  orientation: Orientation,
}
