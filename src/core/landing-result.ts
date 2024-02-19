import { DEBUG } from "../util/debug";
import { Point } from "../util/types";
import { getOverlay } from "./layer";
import { MobState, MobType, collidesWithMob } from "./mobs";
import { CoreState, MobileEntity, MoveMobile } from "./state";
import { CellContents, cellAtPointForMobiles, get_mobiles } from "./tile-helpers";
import { Resource } from "./tools";

// A thing that can be moved onto something else
export type MoveSource =
  | { t: 'tile', letter: string }
  | { t: 'resource', res: Resource }
  | { t: 'mob', mobType: MobType }
  ;

export type LandingMove = { src: MoveSource, p_in_world_int: Point };

// When A lands on B, this type says what happens. It tries *not* to
// produce information about identity of the A involved, but it may
// produce information about the identity of B.
//
// This is because the utility functions computing this type expect to
// receive inputs that describe a single A, which have potential
// interactions with many B's. That being said, we do expect only a
// single one out of those B's to be interacted with. When we have a
// situation in which there are in fact many A's, it should produce
// *multiple* LandingResults, once for each A. Therefore we let the caller
// deal with the iteration over the A's.

export type ProperLandingResult =
  | { t: 'place' } // the attempt to place A on B "succeeds" in the most trivial way
  /* other things that I expect to go here include: success which transforms the B somehow */
  | { t: 'fillWater' }
  | { t: 'replaceResource', res: Resource }
  ;

export type LandingResult =
  | ProperLandingResult
  | { t: 'collision' } // the attempt to place A on B "fails"
  ;

// this is some kind of algebraic operation on landing results.
// It *probably* should be associative, but I'm not 100% sure.
// I expect {t: 'place'} to be a unit for the operation.
// If anything, we think of lr1 as being "higher precedence".
// That is, it's more expected that a ∨ b = a than a ∨ b = b, all else
// being equal.
export function disjunction(lr1: LandingResult, lr2: LandingResult): LandingResult {
  switch (lr1.t) {
    case 'collision': // fallthrough intentional
    case 'fillWater': // fallthrough intentional
    case 'replaceResource': return lr1;
    case 'place': return lr2;
  }
}

export function disjuncts(...lrs: LandingResult[]): LandingResult {
  if (lrs.length == 0)
    return { t: 'place' };
  return lrs.reduce(disjunction);
}

export function landMobileOnCell(m: MoveSource, c: CellContents): LandingResult {
  switch (c.t) { // first branch on what exists on the target
    case 'mobile': {
      if (c.mobile.t == 'resource' && c.mobile.res == 'wood') {
        if (m.t == 'resource' && m.res == 'stone') {
          return { t: 'replaceResource', res: 'axe' };
        }
        if (m.t == 'resource' && m.res == 'axe') {
          return { t: 'replaceResource', res: 'planks' };
        }
      }
      return { t: 'collision' };
    }
    case 'bonus': {
      const bonus = c.bonus;
      switch (bonus.t) {
        case 'empty': return { t: 'place' };
        case 'tree': return { t: 'collision' };
        case 'bomb': return { t: 'collision' };
        case 'required': return (m.t == 'tile' && (m.letter == bonus.letter || DEBUG.allWords)) ? { t: 'place' } : { t: 'collision' };
        case 'consonant': return { t: 'collision' };
        case 'vowel': return { t: 'collision' };
        case 'copy': return { t: 'collision' };
        case 'word': return { t: 'collision' };
        case 'time': return { t: 'collision' };
        case 'dynamite': return { t: 'collision' };
        case 'water': return (m.t == 'resource' && m.res == 'planks') ? { t: 'fillWater' } : { t: 'collision' };
        case 'mountain': return { t: 'collision' };
        case 'magnifying-glass': return { t: 'collision' };
      }
    }
  }
}

export function landMoveOnMob(m: LandingMove, mob: MobState): LandingResult {
  // TODO(landing): Peek into m.mobile to see if it interacts more
  // interestingly with mob. This would require reorganizing mob state
  // to be keyed by-id.
  if (collidesWithMob(mob, m.p_in_world_int))
    return { t: 'collision' };
  return { t: 'place' };
}

export function landingMoveOfMoveMobile(m: MoveMobile): LandingMove {
  return {
    src: m.mobile, // NOTE: RenderableMobile is a sutbtype of MoveSource for now...
    p_in_world_int: m.p_in_world_int
  };
}

export function landMoveOnStateForMobiles(m: LandingMove, state: CoreState, mobiles: MobileEntity[]): LandingResult {
  // Can't move stuff to invisible place
  if (!getOverlay(state.seen_cells, m.p_in_world_int))
    return { t: 'collision' };

  return disjuncts(
    ...state.mobsState.mobs.map(mob => landMoveOnMob(m, mob)),
    landMobileOnCell(m.src, cellAtPointForMobiles(state, m.p_in_world_int, mobiles)),
  );
}

export function landMoveOnState(m: LandingMove, state: CoreState): LandingResult {
  return landMoveOnStateForMobiles(m, state, get_mobiles(state));
}
