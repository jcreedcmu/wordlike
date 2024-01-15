// This is a stub ImageData wrapper class so that I can unit-test
// image data operations in nodejs, despite it ordinarily being
// implemented only in the browser.

// I could probable improve this by exporting a class that has the
// same interface, but this is good enough for now. I just need to
// import this ImageData as the constructor. In the browser, it'll
// call the real thing.

class _ImageData {
  data: Uint8Array;
  constructor(x: number, y: number) {
    this.data = new Uint8Array(4 * x * y);
  }
}

export const ImageData = (typeof window != 'undefined') ? (window as any).ImageData : _ImageData;
