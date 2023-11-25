import { grab } from '../util/util';

export class Pane {

}

export async function make_pane(c: HTMLCanvasElement): Promise<Pane> {
  const vert = await grab('./assets/vertex.vert');
  const frag = await grab('./assets/frag.frag');
  const pane = new Pane();
  return pane;
}
