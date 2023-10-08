import { useEffect, useRef } from 'react';
import { Point } from '../util/types';

export type CanvasInfo = {
  c: HTMLCanvasElement,
  d: CanvasRenderingContext2D,
  size: Point,
};

export function useCanvas<S>(
  state: S,
  render: (ci: CanvasInfo, state: S) => void,
  deps: any[],
  onLoad: (ci: CanvasInfo) => void,
): [
    React.RefCallback<HTMLCanvasElement>,
    React.MutableRefObject<CanvasInfo | undefined>,
  ] {
  const infoRef = useRef<CanvasInfo | undefined>(undefined);
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
        infoRef.current = { c: canvas, d: canvas.getContext('2d')!, size: { x: width, y: height } };
        onLoad(infoRef.current);
      }
    }
  };
  return [ref, infoRef];
}
