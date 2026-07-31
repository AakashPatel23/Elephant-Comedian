import { useCallback, useEffect, useRef, useState } from "react";
import {
  drawElephant,
  FRAME_SIZE,
  POSE_CLIMB_A,
  POSE_CLIMB_B,
  POSE_SIT,
  TRUMPET_FRAMES,
  WALK_FRAMES,
  type EyeState,
} from "@/lib/sprite";
import {
  playBlip,
  playBonk,
  playClimbFail,
  playJokeJingle,
  playRimshot,
  playSit,
  playStep,
  playTrumpet,
  playWink,
} from "@/lib/audio";
import { NameTag } from "./NameTag";
import { Scenery } from "./Scenery";
import { SpeechBubble } from "./SpeechBubble";

const SCALE = 6;
const SPRITE_W = FRAME_SIZE * SCALE;
const SPRITE_H = FRAME_SIZE * SCALE;
const WALK_SPEED = 55;
const RUN_SPEED = 190;
const GROUND_OFFSET = 96; // px above the bottom of the viewport

const WALK_FRAME_DURATION = 0.16;
const RUN_FRAME_DURATION = 0.09;
const CLIMB_FRAME_DURATION = 0.12;
const CLIMB_DURATION = 1.4;
const CLIMB_HEIGHT = 90;
const TRUMPET_FRAME_DURATION = 0.06;
const TRUMPET_DURATION = TRUMPET_FRAMES.length * TRUMPET_FRAME_DURATION + 0.7;
const DAZED_DURATION = 2.4;
const WINK_HOLD = 0.7;
const BLINK_HOLD = 0.14;

type Mode = "walk" | "run" | "sit" | "climb" | "dazed" | "trumpet" | "joke";

type Engine = {
  x: number;
  y: number; // height above ground, used by the climb bump
  dir: 1 | -1;
  mode: Mode;
  timer: number; // seconds left in current mode
  walkStep: number; // fractional index into WALK_FRAMES
  lastStepFrame: number;
  climbToggle: boolean;
  climbFrameTimer: number;
  trumpetElapsed: number;
  blinkCooldown: number; // seconds until next blink
  blinkHold: number; // seconds left with eyes shut
  winkSide: "left" | "right";
  winkHold: number; // seconds left winking
};

const PLACEHOLDER_JOKES = [
  { setup: "WHY DON'T ELEPHANTS USE COMPUTERS?", punchline: "THEY'RE AFRAID OF THE MOUSE!" },
  { setup: "WHAT DO YOU CALL AN ELEPHANT THAT DOESN'T MATTER?", punchline: "AN IRRELEPHANT." },
  {
    setup: "WHY DID THE ELEPHANT PAINT ITS TOENAILS RED?",
    punchline: "SO IT COULD HIDE IN A CHERRY TREE.",
  },
  {
    setup: "WHAT TIME IS IT WHEN AN ELEPHANT SITS ON YOUR FENCE?",
    punchline: "TIME TO GET A NEW FENCE.",
  },
  {
    setup: "HOW DO YOU KNOW IF THERE'S AN ELEPHANT IN YOUR FRIDGE?",
    punchline: "THE DOOR WON'T CLOSE.",
  },
  { setup: "WHY DID THE ELEPHANT CROSS THE ROAD?", punchline: "THE CHICKEN NEEDED THE DAY OFF." },
];

export function ElephantWorld() {
  const worldRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine>({
    x: 120,
    y: 0,
    dir: 1,
    mode: "walk",
    timer: 2,
    walkStep: 0,
    lastStepFrame: -1,
    climbToggle: false,
    climbFrameTimer: 0,
    trumpetElapsed: 0,
    blinkCooldown: 2 + Math.random() * 3,
    blinkHold: 0,
    winkSide: "left",
    winkHold: 0,
  });

  const [shakeMode, setShakeMode] = useState<"none" | "normal" | "violent">("none");
  const [dazed, setDazed] = useState(false);
  const [joke, setJoke] = useState<string | null>(null);
  const [jokeLoading, setJokeLoading] = useState(false);
  const [name, setName] = useState("Pixel");
  const recentJokes = useRef<(typeof PLACEHOLDER_JOKES)[number][]>([]);

  // ---- persistence -------------------------------------------------
  useEffect(() => {
    const n = localStorage.getItem("elephant.name");
    if (n) setName(n);
  }, []);

  const saveName = useCallback((next: string) => {
    const clean = next.trim().slice(0, 20) || "Pixel";
    setName(clean);
    localStorage.setItem("elephant.name", clean);
  }, []);

  // ---- screen shake -------------------------------------------------
  const shake = useCallback((ms: number, violent = false) => {
    setShakeMode(violent ? "violent" : "normal");
    window.setTimeout(() => setShakeMode("none"), ms);
  }, []);

  const setMode = useCallback((mode: Mode, timer: number) => {
    const e = engine.current;
    e.mode = mode;
    e.timer = timer;
    if (mode === "climb") {
      e.climbToggle = false;
      e.climbFrameTimer = 0;
      e.y = 0;
    }
    if (mode === "trumpet") e.trumpetElapsed = 0;
    setDazed(mode === "dazed");
  }, []);

  const doSit = useCallback(() => {
    setMode("sit", 3 + Math.random() * 2.5);
    playSit();
    shake(700, true);
  }, [setMode, shake]);

  // ---- jokes ---------------------------------------------------------
  const typeOut = useCallback((prefix: string, text: string, onDone?: () => void) => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setJoke(prefix + text.slice(0, i));
      if (i % 2 === 0) playBlip(i);
      if (i >= text.length) {
        window.clearInterval(id);
        onDone?.();
      }
    }, 38);
  }, []);

  const doJoke = useCallback(() => {
    if (jokeLoading) return;
    setJokeLoading(true);
    engine.current.mode = "joke";
    engine.current.timer = 0;
    setJoke("");
    playJokeJingle();

    const last = recentJokes.current[recentJokes.current.length - 1];
    const options = PLACEHOLDER_JOKES.filter((j) => j !== last);
    const pick = options[Math.floor(Math.random() * options.length)];
    recentJokes.current.push(pick);

    // wait a beat before the setup appears, then a longer beat before the punchline lands
    window.setTimeout(() => {
      typeOut("", pick.setup, () => {
        window.setTimeout(() => {
          typeOut(`${pick.setup} `, pick.punchline, () => {
            window.setTimeout(playRimshot, 150);
            window.setTimeout(() => {
              setJoke(null);
              setJokeLoading(false);
              setMode("walk", 2 + Math.random() * 3);
            }, 2400);
          });
        }, 1700);
      });
    }, 400);
  }, [jokeLoading, setMode, typeOut]);

  // ---- click interaction ---------------------------------------------
  const onPoke = useCallback(() => {
    const e = engine.current;
    if (e.mode === "dazed" || e.mode === "climb" || e.mode === "joke" || jokeLoading) return;

    const roll = Math.floor(Math.random() * 5);
    if (roll === 0) {
      doSit();
    } else if (roll === 1) {
      setMode("run", 1.5 + Math.random() * 2);
    } else if (roll === 2) {
      setMode("trumpet", TRUMPET_DURATION);
      playTrumpet();
    } else if (roll === 3) {
      e.winkSide = Math.random() < 0.5 ? "left" : "right";
      e.winkHold = WINK_HOLD;
      playWink();
    } else {
      doJoke();
    }
  }, [doJoke, doSit, jokeLoading, setMode]);

  // ---- main loop -------------------------------------------------------
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const e = engine.current;
      const maxX = Math.max(60, window.innerWidth - SPRITE_W);

      // ---- blink / wink timers (run in every mode) ----
      if (e.winkHold > 0) {
        e.winkHold = Math.max(0, e.winkHold - dt);
      } else if (e.blinkHold > 0) {
        e.blinkHold -= dt;
        if (e.blinkHold <= 0) e.blinkCooldown = 2 + Math.random() * 3;
      } else {
        e.blinkCooldown -= dt;
        if (e.blinkCooldown <= 0) e.blinkHold = BLINK_HOLD;
      }

      if (e.mode === "walk" || e.mode === "run") {
        const speed = e.mode === "run" ? RUN_SPEED : WALK_SPEED;
        const frameDuration = e.mode === "run" ? RUN_FRAME_DURATION : WALK_FRAME_DURATION;
        e.x += e.dir * speed * dt;
        e.walkStep += dt / frameDuration;
        const frameIdx = Math.floor(e.walkStep) % WALK_FRAMES.length;
        if (frameIdx !== e.lastStepFrame) {
          e.lastStepFrame = frameIdx;
          playStep();
        }

        if (e.x <= 0 || e.x >= maxX) {
          e.x = Math.max(0, Math.min(maxX, e.x));
          if (e.mode === "run") {
            playBonk();
            shake(400);
            setMode("dazed", DAZED_DURATION);
          } else {
            playClimbFail();
            setMode("climb", CLIMB_DURATION);
          }
        } else {
          e.timer -= dt;
          if (e.mode === "run" && e.timer <= 0) {
            setMode("walk", 2 + Math.random() * 3);
          } else if (e.mode === "walk" && e.timer <= 0) {
            if (Math.random() < 0.7) e.dir = e.dir === 1 ? -1 : 1;
            e.timer = 2 + Math.random() * 3;
          }
        }
      } else if (e.mode === "climb") {
        const t = CLIMB_DURATION - e.timer;
        e.y =
          t < 0.7 ? (t / 0.7) * CLIMB_HEIGHT : Math.max(0, (1 - (t - 0.7) / 0.7) * CLIMB_HEIGHT);
        e.climbFrameTimer += dt;
        if (e.climbFrameTimer >= CLIMB_FRAME_DURATION) {
          e.climbFrameTimer = 0;
          e.climbToggle = !e.climbToggle;
        }
        e.timer -= dt;
        if (e.timer <= 0) {
          e.y = 0;
          e.dir = e.dir === 1 ? -1 : 1;
          setMode("walk", 2 + Math.random() * 3);
        }
      } else if (e.mode === "dazed") {
        e.timer -= dt;
        if (e.timer <= 0) {
          e.dir = e.dir === 1 ? -1 : 1;
          setMode("walk", 2 + Math.random() * 3);
        }
      } else if (e.mode === "sit") {
        e.timer -= dt;
        if (e.timer <= 0) setMode("walk", 2 + Math.random() * 3);
      } else if (e.mode === "trumpet") {
        e.trumpetElapsed += dt;
        e.timer -= dt;
        if (e.timer <= 0) setMode("walk", 2 + Math.random() * 3);
      }
      // "joke" mode: held in place, transitions are driven by the typeOut callback chain

      if (bodyRef.current) {
        bodyRef.current.style.transform = `translate3d(${e.x}px, ${-e.y}px, 0)`;
      }

      const eyeState: EyeState =
        e.mode === "dazed"
          ? "blink"
          : e.winkHold > 0
            ? e.winkSide === "left"
              ? "wink-left"
              : "wink-right"
            : e.blinkHold > 0
              ? "blink"
              : "open";

      const flip = e.dir === -1;
      if (e.mode === "climb") {
        drawElephant(
          ctx,
          "poses",
          e.climbToggle ? POSE_CLIMB_A : POSE_CLIMB_B,
          SCALE,
          flip,
          "open",
        );
      } else if (e.mode === "sit" || e.mode === "joke") {
        drawElephant(ctx, "poses", POSE_SIT, SCALE, flip, eyeState);
      } else if (e.mode === "trumpet") {
        const idx = Math.min(
          TRUMPET_FRAMES.length - 1,
          Math.floor(e.trumpetElapsed / TRUMPET_FRAME_DURATION),
        );
        drawElephant(ctx, "walk", TRUMPET_FRAMES[idx], SCALE, flip, eyeState);
      } else {
        drawElephant(
          ctx,
          "walk",
          WALK_FRAMES[Math.floor(e.walkStep) % WALK_FRAMES.length],
          SCALE,
          flip,
          eyeState,
        );
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setMode, shake]);

  return (
    <div
      ref={worldRef}
      className={`relative min-h-screen w-full overflow-hidden bg-background ${
        shakeMode === "violent"
          ? "animate-screen-shake-violent"
          : shakeMode === "normal"
            ? "animate-screen-shake"
            : ""
      }`}
    >
      <Scenery />

      <header className="relative z-10 px-6 pt-8 text-center">
        <h1 className="font-pixel text-lg text-primary sm:text-2xl">Pixel Elephant Playpen</h1>
        <p className="mt-3 font-pixel text-[9px] leading-5 text-muted-foreground sm:text-[10px]">
          click {name} to poke · click the tag to rename
        </p>
      </header>

      <div
        ref={bodyRef}
        className="absolute left-0 z-10 will-change-transform"
        style={{ bottom: GROUND_OFFSET }}
      >
        <div className="relative flex flex-col items-center" style={{ width: SPRITE_W }}>
          {joke !== null && <SpeechBubble text={joke} />}
          <NameTag name={name} onRename={saveName} />
          {dazed && (
            <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 font-pixel text-xs text-primary animate-spin-slow">
              ✦ ✦ ✦
            </div>
          )}
          <button
            type="button"
            onClick={onPoke}
            aria-label={`Poke ${name}`}
            className="cursor-pointer bg-transparent p-0"
          >
            <canvas
              ref={canvasRef}
              width={SPRITE_W}
              height={SPRITE_H}
              className="[image-rendering:pixelated]"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
