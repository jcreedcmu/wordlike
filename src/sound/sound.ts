const RATE = 44100;

export class Sound {
  readonly audio_context: AudioContext;
  gainNode: GainNode;
  dest: AudioNode;

  setGain(gain: number) {
    this.gainNode.gain.value = gain;
  }

  constructor() {
    const d = new AudioContext();
    this.audio_context = d;
    const gainNode = d.createGain();
    gainNode.gain.value = 1;
    gainNode.connect(d.destination);
    this.gainNode = gainNode;
    this.dest = gainNode;
  }

  make_sound<T>(len_sec: number, initial_state: T, sample: (state: T, ix: number, buf: Float32Array) => number): void {
    const d = this.audio_context;
    const len = len_sec * RATE;
    const buf = d.createBuffer(1 /* chan */, len, RATE);
    const dat = buf.getChannelData(0);
    for (let t = 0; t < len; t++) {
      dat[t] = sample(initial_state, t, dat);
    }
    const src = d.createBufferSource();
    src.buffer = buf;
    src.connect(this.dest);
    src.start();
  }

  beep() {
    const len_sec = 0.03;
    const freq = 880;
    const amp = 0.05;
    this.make_sound(len_sec, { phase: 0 }, state => {
      state.phase += 2 * Math.PI * freq / RATE;
      return amp * Math.sin(state.phase);
    });
  }

  click() {
    const len_sec = 0.06;
    const amp = 0.05;
    this.make_sound(len_sec, { phase: 0 }, (_state, ix, buf) => {
      function tap(dx: number, fac: number) {
        if (ix < dx) return 0;
        return fac * buf[ix - dx];
      }
      if (ix < 500)
        return amp * Math.random();
      else {
        let a = 0;
        a += tap(473, 0.2);
        a += tap(10, 0.2);
        a += tap(23, 0.2);
        return a;
      }
    });
  }

  success_jingle() {
    const len_sec = 0.3;
    const base_freq = 440;
    const amp = 0.05;
    this.make_sound(len_sec, { phase: 0 }, (state, ix) => {

      const freq = base_freq * [1, 4 / 3, 3 / 2, 2][Math.floor(ix / RATE / len_sec * 4)];
      state.phase += 2 * Math.PI * freq / RATE;
      return amp * Math.sin(state.phase);
    });
  }
}

export const soundService = new Sound();
