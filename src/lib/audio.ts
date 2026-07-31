// WebAudio sound engine: chiptune blips plus a real recorded elephant trumpet.
import trumpetUrl from "@/assets/elephant-trumpet.mp3";

let ctx: AudioContext | null = null;
let trumpetBuffer: AudioBuffer | null = null;
let trumpetLoad: Promise<AudioBuffer | null> | null = null;

/** Fetch + decode the elephant sample once, cached for later plays. */
function loadTrumpet(): Promise<AudioBuffer | null> {
  if (trumpetBuffer) return Promise.resolve(trumpetBuffer);
  if (!trumpetLoad) {
    trumpetLoad = fetch(trumpetUrl)
      .then((res) => res.arrayBuffer())
      .then((buf) => ac().decodeAudioData(buf))
      .then((decoded) => {
        trumpetBuffer = decoded;
        return decoded;
      })
      .catch(() => null);
  }
  return trumpetLoad;
}


function ac(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = "square",
  gain = 0.12,
) {
  const a = ac();
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime + start);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  osc.connect(g).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + dur + 0.02);
}

/** Real recorded elephant trumpet (CC0), with slight random pitch variation. */
export function playTrumpet() {
  const a = ac();
  void loadTrumpet().then((buffer) => {
    if (!buffer) return synthTrumpet();
    const src = a.createBufferSource();
    const g = a.createGain();
    src.buffer = buffer;
    src.playbackRate.value = 0.9 + Math.random() * 0.3;
    g.gain.value = 0.85;
    src.connect(g).connect(a.destination);
    src.start();
  });
}

/** Fallback chiptune trumpet if the sample can't load. */
function synthTrumpet() {
  const a = ac();
  const osc = a.createOscillator();
  const g = a.createGain();
  const t = a.currentTime;
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(620, t + 0.16);
  osc.frequency.exponentialRampToValueAtTime(480, t + 0.42);
  osc.frequency.exponentialRampToValueAtTime(240, t + 0.7);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);

  const lfo = a.createOscillator();
  const lfoGain = a.createGain();
  lfo.frequency.value = 14;
  lfoGain.gain.value = 25;
  lfo.connect(lfoGain).connect(osc.frequency);

  osc.connect(g).connect(a.destination);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + 0.8);
  lfo.stop(t + 0.8);
}


/** Heavy thud + shake cue when it sits. */
export function playSit() {
  const a = ac();
  const osc = a.createOscillator();
  const g = a.createGain();
  const t = a.currentTime;
  osc.type = "triangle";
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.35);
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + 0.5);
}

/** Bonk when it runs into a wall. */
export function playBonk() {
  tone(110, 0, 0.12, "square", 0.25);
  tone(70, 0.06, 0.2, "square", 0.2);
  [0, 1, 2, 3].forEach((i) => tone(300 - i * 40, 0.24 + i * 0.11, 0.09, "triangle", 0.08));
}

/** Failed climb: rising scrabble then a slide down. */
export function playClimbFail() {
  [0, 1, 2, 3, 4].forEach((i) => tone(320 + i * 70, i * 0.07, 0.06, "square", 0.07));
  const a = ac();
  const osc = a.createOscillator();
  const g = a.createGain();
  const t = a.currentTime + 0.4;
  osc.type = "square";
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.35);
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + 0.4);
}

/** Occasional heavy footstep thump while walking/running. */
export function playThump() {
  const a = ac();
  const osc = a.createOscillator();
  const g = a.createGain();
  const t = a.currentTime;
  osc.type = "sine";
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + 0.25);
}

/** Chiptune fanfare before a joke. */
export function playJokeJingle() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.1, "square", 0.09));
}

/** Rimshot after the punchline. */
export function playRimshot() {
  tone(400, 0, 0.07, "square", 0.12);
  tone(300, 0.12, 0.07, "square", 0.12);
  tone(180, 0.26, 0.3, "triangle", 0.16);
}

/** Animal-crossing style blips while the joke text types out. */
export function playBlip(seed: number) {
  tone(420 + (seed % 5) * 60, 0, 0.045, "square", 0.045);
}

/** Cute little chirp for a wink. */
export function playWink() {
  tone(700, 0, 0.05, "square", 0.08);
  tone(950, 0.05, 0.06, "square", 0.08);
}
