import { useEffect, useRef } from 'react';
import { Point } from '../util/types';

export type RawCanvasInfo = {
  c: HTMLCanvasElement,
  size: Point,
};

export type CanvasInfo = {
  c: HTMLCanvasElement,
  d: CanvasRenderingContext2D,
  size: Point,
};

export function useRawCanvas<S, CI>(
  state: S,
  render: (ci: CI, state: S) => void,
  deps: any[],
  onLoad: (ci: RawCanvasInfo) => CI,
): [
    React.RefCallback<HTMLCanvasElement>,
    React.MutableRefObject<CI | undefined>,
  ] {
  const infoRef = useRef<CI | undefined>(undefined);
  useEffect(() => {
    const ci = infoRef.current;
    if (ci != null) {
      render(ci, state);
    }
  }, deps ?? [state]);

  const ref: React.RefCallback<HTMLCanvasElement> = canvas => {
    if (infoRef.current === undefined) {
      if (canvas !== null) {
        const width = Math.floor(canvas.getBoundingClientRect().width);
        const height = Math.floor(canvas.getBoundingClientRect().height);
        canvas.width = width;
        canvas.height = height;
        const rawInfo = { c: canvas, size: { x: width, y: height } };
        infoRef.current = onLoad(rawInfo);
      }
    }
  };
  return [ref, infoRef];
}

export function useCanvas<S>(
  state: S,
  render: (ci: CanvasInfo, state: S) => void,
  deps: any[],
  onLoad: (ci: CanvasInfo) => void,
): [
    React.RefCallback<HTMLCanvasElement>,
    React.MutableRefObject<CanvasInfo | undefined>,
  ] {
  return useRawCanvas<S, CanvasInfo>(state, render, deps, rci => {
    const ci = { ...rci, d: rci.c.getContext('2d')! };
    onLoad(ci);
    return ci;
  });
}
