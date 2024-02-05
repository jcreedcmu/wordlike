import { Point, Rect } from "../util/types";

export type LayoutRect = {
  stretch?: Point,
  shrink?: Point,
  base?: Point,
};

export type LayoutTree = LayoutTreeInt<unknown>;

export function packHoriz(...trees: LayoutTree[]): LayoutTree {
  return { t: 'horiz', kids: trees };
}

export function packVert(...trees: LayoutTree[]): LayoutTree {
  return { t: 'vert', kids: trees };
}

export function stretchRectX(stretch: number): LayoutTree {
  return { t: 'rect', single: { stretch: { x: stretch, y: 0 } } };
}

export function stretchRectY(stretch: number): LayoutTree {
  return { t: 'rect', single: { stretch: { y: stretch, x: 0 } } };
}

export function fixedRect(base: Point): LayoutTree {
  return { t: 'rect', single: { base } };
}

export function nameRect(name: string, tree: LayoutTree): LayoutTree {
  return { t: 'name', kid: tree, name };
}

export function padVert(pad: number, tree: LayoutTree): LayoutTree {
  return packVert(fixedRect({ x: 0, y: pad }), tree, fixedRect({ x: 0, y: pad }));
}

export function padHoriz(pad: number, tree: LayoutTree): LayoutTree {
  return packHoriz(fixedRect({ x: pad, y: 0 }), tree, fixedRect({ x: pad, y: 0 }));
}

export function padRect(pad: number, tree: LayoutTree): LayoutTree {
  return padVert(pad, padHoriz(pad, tree));
}

type LayoutTreeInt<A> =
  | { t: 'horiz', kids: LayoutTreeWith<A>[] }
  | { t: 'vert', kids: LayoutTreeWith<A>[] }
  | { t: 'rect', single: LayoutRect }
  | { t: 'name', kid: LayoutTreeWith<A>, name: string }
  ;

type LayoutTreeWith<A> = A & LayoutTreeInt<A>;


export type Layout = Record<string, Rect>;

export type Sizes = {
  base: Point,
  stretch: Point,
  shrink: Point,
}

export type ResultRect = {
  rect: Rect,
}

function sum(xs: number[]): number {
  return xs.length == 0 ? 0 : xs.reduce((a, b) => a + b);
}

function max(xs: number[]): number {
  return xs.length == 0 ? 0 : xs.reduce((a, b) => Math.max(a, b));
}

function aggregate(ps: Point[], xf: (x: number[]) => number, yf: (x: number[]) => number): Point {
  return { x: xf(ps.map(p => p.x)), y: yf(ps.map(p => p.y)) };
}

function layoutFirst(tree: LayoutTreeWith<unknown>): LayoutTreeWith<Sizes> {
  switch (tree.t) {
    case 'horiz': {
      const kids = tree.kids.map(layoutFirst);
      return {
        t: 'horiz',
        base: aggregate(kids.map(x => x.base), sum, max),
        shrink: aggregate(kids.map(x => x.shrink), sum, max),
        stretch: aggregate(kids.map(x => x.stretch), sum, max),
        kids: kids,
      };
    }
    case 'vert': {
      const kids = tree.kids.map(layoutFirst);
      return {
        t: 'vert',
        base: aggregate(kids.map(x => x.base), max, sum),
        shrink: aggregate(kids.map(x => x.shrink), max, sum),
        stretch: aggregate(kids.map(x => x.stretch), max, sum),
        kids: kids,
      };
    }
    case 'rect': {
      return {
        t: 'rect',
        single: tree.single,
        base: tree.single.base ?? { x: 0, y: 0 },
        shrink: tree.single.shrink ?? { x: 0, y: 0 },
        stretch: tree.single.stretch ?? { x: 0, y: 0 },
      };
    }
    case 'name': {
      const kid = layoutFirst(tree.kid);
      return {
        t: 'name',
        name: tree.name,
        kid: kid,
        base: kid.base,
        shrink: kid.shrink,
        stretch: kid.stretch,
      };
    }
  }
}

function layoutStack(
  container: Rect,
  tree: Sizes & { kids: LayoutTreeWith<Sizes>[] },
  dir: 'horiz' | 'vert'
): LayoutTreeWith<ResultRect> {
  function maybeSwap(p: Point): Point {
    return dir == 'horiz' ? p : { y: p.x, x: p.y };
  }
  const xx: 'x' | 'y' = dir == 'horiz' ? 'x' : 'y';
  const yy: 'x' | 'y' = dir == 'horiz' ? 'y' : 'x';
  const gap = container.sz[xx] - tree.base[xx];
  const mode: 'stretch' | 'shrink' = gap > 0 ? 'stretch' : 'shrink';
  const resultSize = tree.kids.map(k => k.base[xx] + (tree[mode][xx] == 0 ? 0 : ((k[mode][xx] / tree[mode][xx]) * gap)));
  const kids: LayoutTreeWith<ResultRect>[] = [];
  let x = container.p[xx];
  for (let i = 0; i < tree.kids.length; i++) {
    const rs = resultSize[i];
    kids.push(layoutSecond({
      p: maybeSwap({ x: x, y: container.p[yy] }),
      sz: maybeSwap({ x: rs, y: container.sz[yy] })
    }, tree.kids[i]));
    x += rs;
  }
  return {
    t: 'horiz',
    kids,
    rect: container
  };
}

function layoutSecond(container: Rect, tree: LayoutTreeWith<Sizes>): LayoutTreeWith<ResultRect> {
  switch (tree.t) {
    case 'horiz': return layoutStack(container, tree, 'horiz');
    case 'vert': return layoutStack(container, tree, 'vert');
    case 'rect': {
      return {
        t: 'rect',
        single: tree.single,
        rect: { p: container.p, sz: tree.single.base ?? { x: 0, y: 0 } },
      };
    }
    case 'name': {
      const kid = layoutSecond(container, tree.kid);
      return {
        t: 'name',
        name: tree.name,
        kid: kid,
        rect: kid.rect,
      };
    }
  }
}

function layoutThird(tree: LayoutTreeWith<ResultRect>): Record<string, Rect> {
  const rv: Record<string, Rect> = {};
  function xverse(tree: LayoutTreeWith<ResultRect>) {
    switch (tree.t) {
      case 'horiz': tree.kids.forEach(xverse); return;
      case 'vert': tree.kids.forEach(xverse); return;
      case 'rect': return;
      case 'name': rv[tree.name] = tree.rect; xverse(tree.kid); return;
    }
  }
  xverse(tree);
  return rv;
}

export function layout(container: Rect, tree: LayoutTreeInt<unknown>): Record<string, Rect> {
  const tree1 = layoutFirst(tree);
  const tree2 = layoutSecond(container, tree1);
  return layoutThird(tree2);
}
