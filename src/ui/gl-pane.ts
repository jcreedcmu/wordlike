export class Pane {

}

export async function make_pane(c: HTMLCanvasElement): Promise<Pane> {
  const pane = new Pane();
  return pane;
}
