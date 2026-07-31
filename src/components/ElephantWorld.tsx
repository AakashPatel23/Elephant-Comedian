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
  playImagenius,
  playJokeJingle,
  playRimshot,
  playSit,
  playThump,
  playTrumpet,
  startRumble,
  stopRumble,
} from "@/lib/audio";
import { NameTag } from "./NameTag";
import { Scenery } from "./Scenery";
import { SecretButton } from "./SecretButton";
import { SpeechBubble } from "./SpeechBubble";

const SCALE = 6;
const SPRITE_W = FRAME_SIZE * SCALE;
const SPRITE_H = FRAME_SIZE * SCALE;
const WALK_SPEED = 35;
const RUN_SPEED = 130;
// The sprite frames have ~6px of transparent padding below the feet (at SCALE 6 that's
// 36px), so the ground offset is shifted down from the grass line by that much to keep
// the feet visually planted instead of floating above the grass.
const GROUND_OFFSET = 60; // px above the bottom of the viewport

// Walk-cycle progress is paced by distance traveled (px per animation frame) rather
// than elapsed time, so the legs always advance in lockstep with how far the body has
// actually moved instead of drifting out of sync with it.
const WALK_STRIDE_PX = 5;
const RUN_STRIDE_PX = 10;
const CLIMB_FRAME_DURATION = 0.12;
const CLIMB_DURATION = 1.4;
const CLIMB_HEIGHT = 90;
const TRUMPET_FRAME_DURATION = 0.06;
const TRUMPET_DURATION = TRUMPET_FRAMES.length * TRUMPET_FRAME_DURATION + 0.7;
const DAZED_DURATION = 2.4;
const BLINK_HOLD = 0.14;
const THUMP_MIN_GAP = 7;
const THUMP_MAX_GAP = 16;
// Easter-egg sequence: trunk up, a long suspenseful blink, the secret clip, then a
// celebratory run.
const SPECIAL_BLINK_HOLD = 1.8;
const SPECIAL_RUN_DURATION = 4.5;

type Mode = "walk" | "run" | "sit" | "climb" | "dazed" | "trumpet" | "joke";

type Engine = {
  x: number;
  y: number; // height above ground, used by the climb bump
  dir: 1 | -1;
  mode: Mode;
  timer: number; // seconds left in current mode
  walkStep: number; // fractional index into WALK_FRAMES
  climbToggle: boolean;
  climbFrameTimer: number;
  trumpetElapsed: number;
  blinkCooldown: number; // seconds until next blink
  blinkHold: number; // seconds left with eyes shut
  thumpCooldown: number; // seconds until next ambient footstep thump
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
    climbToggle: false,
    climbFrameTimer: 0,
    trumpetElapsed: 0,
    blinkCooldown: 2 + Math.random() * 3,
    blinkHold: 0,
    thumpCooldown: THUMP_MIN_GAP + Math.random() * (THUMP_MAX_GAP - THUMP_MIN_GAP),
  });

  const [shakeMode, setShakeMode] = useState<"none" | "normal" | "violent">("none");
  const [dazed, setDazed] = useState(false);
  const [joke, setJoke] = useState<string | null>(null);
  const [jokeLoading, setJokeLoading] = useState(false);
  const [name, setName] = useState("Peanut");
  const recentJokes = useRef<(typeof PLACEHOLDER_JOKES)[number][]>([]);
  // Set once the setup has finished typing; a poke while this is set reveals the
  // punchline instead of rolling a new random reaction.
  const pendingPunchline = useRef<(typeof PLACEHOLDER_JOKES)[number] | null>(null);

  // ---- persistence -------------------------------------------------
  useEffect(() => {
    const n = localStorage.getItem("elephant.name");
    if (n) setName(n);
  }, []);

  const saveName = useCallback((next: string) => {
    const clean = next.trim().slice(0, 20) || "Peanut";
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
    if (mode === "run" && e.mode !== "run") startRumble();
    if (mode !== "run" && e.mode === "run") stopRumble();
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

    // wait a beat before the setup appears, then wait for a poke to reveal the punchline
    window.setTimeout(() => {
      typeOut("", pick.setup, () => {
        pendingPunchline.current = pick;
        setJoke((prev) => `${prev ?? ""} ▸`);
      });
    }, 400);
  }, [jokeLoading, typeOut]);

  const revealPunchline = useCallback(
    (pick: (typeof PLACEHOLDER_JOKES)[number]) => {
      typeOut(`${pick.setup} `, pick.punchline, () => {
        window.setTimeout(playRimshot, 150);
        window.setTimeout(() => {
          setJoke(null);
          setJokeLoading(false);
          setMode("walk", 2 + Math.random() * 3);
        }, 2400);
      });
    },
    [setMode, typeOut],
  );

  // ---- click interaction ---------------------------------------------
  // Poking the elephant no longer starts a joke (that's the "Joke me!" button's job) -
  // it only reveals a pending punchline, or otherwise triggers sit/run/trumpet.
  const onPoke = useCallback(() => {
    const e = engine.current;

    if (pendingPunchline.current) {
      const pick = pendingPunchline.current;
      pendingPunchline.current = null;
      revealPunchline(pick);
      return;
    }

    if (e.mode === "dazed" || e.mode === "climb" || e.mode === "joke" || jokeLoading) return;

    const roll = Math.floor(Math.random() * 3);
    if (roll === 0) {
      doSit();
    } else if (roll === 1) {
      setMode("run", 1.5 + Math.random() * 2);
    } else {
      setMode("trumpet", TRUMPET_DURATION);
      playTrumpet();
    }
  }, [doSit, jokeLoading, revealPunchline, setMode]);

  const onJokeButtonClick = useCallback(() => {
    const e = engine.current;
    if (e.mode === "dazed" || e.mode === "climb" || jokeLoading) return;
    doJoke();
  }, [doJoke, jokeLoading]);

  // ---- secret easter egg -----------------------------------------------
  const triggerSpecial = useCallback(() => {
    const e = engine.current;
    // interrupt any joke in progress so the sequence doesn't collide with it
    pendingPunchline.current = null;
    setJoke(null);
    setJokeLoading(false);

    setMode("trumpet", TRUMPET_DURATION);
    window.setTimeout(() => {
      e.blinkHold = SPECIAL_BLINK_HOLD;
      window.setTimeout(() => {
        void playImagenius().then(() => {
          setMode("run", SPECIAL_RUN_DURATION);
        });
      }, SPECIAL_BLINK_HOLD * 1000);
    }, TRUMPET_DURATION * 1000);
  }, [setMode]);

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

      // ---- blink timer (runs in every mode) ----
      if (e.blinkHold > 0) {
        e.blinkHold -= dt;
        if (e.blinkHold <= 0) e.blinkCooldown = 2 + Math.random() * 3;
      } else {
        e.blinkCooldown -= dt;
        if (e.blinkCooldown <= 0) e.blinkHold = BLINK_HOLD;
      }

      if (e.mode === "walk" || e.mode === "run") {
        const speed = e.mode === "run" ? RUN_SPEED : WALK_SPEED;
        const stridePx = e.mode === "run" ? RUN_STRIDE_PX : WALK_STRIDE_PX;
        e.x += e.dir * speed * dt;
        e.walkStep += (speed * dt) / stridePx;

        e.thumpCooldown -= dt;
        if (e.thumpCooldown <= 0) {
          playThump();
          e.thumpCooldown = THUMP_MIN_GAP + Math.random() * (THUMP_MAX_GAP - THUMP_MIN_GAP);
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

      const eyeState: EyeState = e.mode === "dazed" || e.blinkHold > 0 ? "blink" : "open";

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
    return () => {
      cancelAnimationFrame(raf);
      stopRumble();
    };
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

      <SecretButton onUnlock={triggerSpecial} />

      <header className="relative z-10 px-6 pt-8 text-center">
        <h1 className="font-pixel text-lg text-foreground sm:text-2xl">
          Elephant Comedian Playpen
        </h1>
        <p className="mt-3 font-pixel text-[9px] leading-5 text-foreground/70 sm:text-[10px]">
          click {name} to poke · Joke me! for a joke, then click {name} for the punchline · click
          the tag to rename
        </p>
      </header>

      <div className="relative z-10 mt-6 flex justify-center">
        <button
          type="button"
          onClick={onJokeButtonClick}
          disabled={jokeLoading}
          className="rounded-md border-2 border-foreground bg-card px-4 py-2 font-pixel text-[10px] text-card-foreground shadow-[3px_3px_0_0_var(--color-foreground)] transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
        >
          Joke me!
        </button>
      </div>

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
