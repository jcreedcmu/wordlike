import { Point } from "../util/types";

type Firework = {
  start_in_anim: number;
  duration_ms: number;
  radius: number;
  color: string;
  center_in_canvas: Point;
};

export type Animation = { t: 'explosion'; start_in_game: number; duration_ms: number; center_in_world: Point; radius: number; } |
{ t: 'point-decay'; start_in_game: number; duration_ms: number; p_in_world_int: Point; } |
{ t: 'fireworks'; start_in_game: number; duration_ms: number; fireworks: Firework[]; message: string; };
