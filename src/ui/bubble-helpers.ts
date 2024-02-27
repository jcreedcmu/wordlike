import { apply, SE2 } from '../util/se2';
import { vadd } from '../util/vutil';
import { Point } from '../util/types';

export const BUBBLE_FONT_SIZE = 12;

export function drawBubble(
  d: CanvasRenderingContext2D,
  text: string,
  textCenter: Point,
  coneApex: Point,
  progress: number | undefined = undefined
): void {
  if (progress !== undefined && progress > 1)
    return;
  const lines = text.split('\n');
  if (progress !== undefined) {
    lines.push('');
  }
  d.font = `${BUBBLE_FONT_SIZE}px sans-serif`;
  const maxWidth = Math.max(...lines.map(line => d.measureText(line).width));
  drawBubbleAux(d, lines, textCenter, coneApex, maxWidth, progress);
}

export function drawBubbleAux(
  d: CanvasRenderingContext2D,
  lines: string[],
  textCenter: Point,
  coneApex: Point,
  maxWidth: number,
  _progress: number | undefined = undefined
): void {
  d.font = `${BUBBLE_FONT_SIZE}px sans-serif`;
  const MARGIN = 8;
  const RADIUS = 5;

  function bubble(color: string, thick: number): void {
    d.fillStyle = color;
    d.strokeStyle = color;
    d.lineWidth = thick;
    d.beginPath();

    d.roundRect(textCenter.x - maxWidth / 2 - MARGIN, textCenter.y - BUBBLE_FONT_SIZE / 2 - MARGIN,
      maxWidth + MARGIN * 2, BUBBLE_FONT_SIZE * lines.length + MARGIN * 2, RADIUS);

    const OFFSET = textCenter.y < coneApex.y ? 10 : -10;
    d.moveTo(textCenter.x - OFFSET, textCenter.y);
    d.lineTo(textCenter.x + OFFSET, textCenter.y);
    d.lineTo(coneApex.x, coneApex.y);
    d.lineTo(textCenter.x - OFFSET, textCenter.y);

    d.fill();
    if (thick != 0)
      d.stroke();
  }
  bubble('black', 2);
  bubble('white', 0);

  d.fillStyle = 'black';
  d.textAlign = 'center';
  d.textBaseline = 'middle';

  for (let i = 0; i < lines.length; i++) {
    d.fillText(lines[i], textCenter.x, textCenter.y + i * BUBBLE_FONT_SIZE);
  }
}

export function textCenterOfBubble(canvas_from_world: SE2, p_in_world_int: Point): Point {
  return vadd({ x: -24, y: -24 }, apply(canvas_from_world, vadd(p_in_world_int, { x: 0.4, y: 0 })));
}

export function apexOfBubble(canvas_from_world: SE2, p_in_world_int: Point): Point {
  return apply(canvas_from_world, vadd(p_in_world_int, { x: 0.4, y: 0.4 }));
}
