import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FRAMES, GRID_H, GRID_W, drawFrame, type FrameName } from "@/lib/sprite";
import {
  playBlip,
  playBonk,
  playClimbFail,
  playJokeJingle,
  playRimshot,
  playSit,
  playStep,
  playTrumpet,
} from "@/lib/audio";
import { tellJoke } from "@/lib/jokes.functions";
import { NameTag } from "./NameTag";
import { SpeechBubble } from "./SpeechBubble";
import { TrainingPanel } from "./TrainingPanel";

const SCALE = 6;
const SPRITE_W = GRID_W * SCALE;
const SPRITE_H = GRID_H * SCALE;
const WALK_SPEED = 55;
const RUN_SPEED = 190;
const GROUND_OFFSET = 96; // px above the bottom of the viewport

type Mode = "idle" | "walk" | "run" | "sit" | "climb" | "dazed" | "joke";

type Engine = {
  x: number;
  y: number; // height above ground
  dir: 1 | -1;
  mode: Mode;
  timer: number; // seconds left in current mode
  stepPhase: number;
  climbPhase: number;
  frame: FrameName;
};

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
    stepPhase: 0,
    climbPhase: 0,
    frame: "stand",
  });

  const [shaking, setShaking] = useState(false);
  const [dazed, setDazed] = useState(false);
  const [joke, setJoke] = useState<string | null>(null);
  const [jokeLoading, setJokeLoading] = useState(false);
  const [name, setName] = useState("Pixel");
  const [style, setStyle] = useState("");
  const recentJokes = useRef<string[]>([]);
  const askJoke = useServerFn(tellJoke);

  // ---- persistence -------------------------------------------------
  useEffect(() => {
    const n = localStorage.getItem("elephant.name");
    if (n) setName(n);
    const s = localStorage.getItem("elephant.jokeStyle");
    if (s) setStyle(s);
  }, []);

  const saveName = useCallback((next: string) => {
    const clean = next.trim().slice(0, 20) || "Pixel";
    setName(clean);
    localStorage.setItem("elephant.name", clean);
  }, []);

  const saveStyle = useCallback((next: string) => {
    setStyle(next);
    localStorage.setItem("elephant.jokeStyle", next);
  }, []);

  // ---- screen shake -------------------------------------------------
  const shake = useCallback((ms: number) => {
    setShaking(true);
    window.setTimeout(() => setShaking(false), ms);
  }, []);

  const setMode = useCallback((mode: Mode, timer: number) => {
    engine.current.mode = mode;
    engine.current.timer = timer;
    engine.current.climbPhase = 0;
  }, []);

  const doSit = useCallback(() => {
    setMode("sit", 3 + Math.random() * 3);
    playSit();
    shake(600);
  }, [setMode, shake]);

  // ---- jokes ---------------------------------------------------------
  const typeOut = useCallback((text: string) => {
    let i = 0;
    setJoke("");
    const id = window.setInterval(() => {
      i += 1;
      setJoke(text.slice(0, i));
      if (i % 2 === 0) playBlip(i);
      if (i >= text.length) {
        window.clearInterval(id);
        window.setTimeout(playRimshot, 350);
      }
    }, 38);
  }, []);

  const doJoke = useCallback(async () => {
    if (jokeLoading) return;
    setMode("idle", 1);
    setJokeLoading(true);
    setJoke("...");
    playJokeJingle();
    try {
      const res = await askJoke({
        data: { style, name, recent: recentJokes.current.slice(-6) },
      });
      recentJokes.current.push(res.joke);
      setMode("joke", Math.max(5, res.joke.length * 0.06 + 3));
      typeOut(res.joke);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMode("joke", 5);
      setJoke(
        msg.includes("RATE_LIMIT")
          ? "TOO MANY JOKES! LET MY TRUNK REST A SEC."
          : msg.includes("NO_CREDITS")
            ? "OUT OF AI CREDITS... ADD SOME AND I'LL BE HILARIOUS."
            : "MY JOKE BOOK FELL IN THE MUD. TRY AGAIN!",
      );
    } finally {
      setJokeLoading(false);
    }
  }, [askJoke, jokeLoading, name, setMode, style, typeOut]);

  // ---- click interaction ---------------------------------------------
  const onPoke = useCallback(() => {
    if (engine.current.mode === "dazed") return;
    const roll = Math.floor(Math.random() * 4);
    if (roll === 0) doSit();
    else if (roll === 1) {
      setMode("run", 2 + Math.random() * 2);
      playTrumpet();
    } else if (roll === 2) void doJoke();
    else {
      playTrumpet();
      setMode("idle", 1);
    }
  }, [doJoke, doSit, setMode]);

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

      e.timer -= dt;

      if (e.mode === "walk" || e.mode === "run") {
        const speed = e.mode === "run" ? RUN_SPEED : WALK_SPEED;
        e.x += e.dir * speed * dt;
        e.stepPhase += dt * (e.mode === "run" ? 9 : 4.5);
        if (Math.floor(e.stepPhase) % 2 === 0 && Math.floor(e.stepPhase) !== e.climbPhase) {
          e.climbPhase = Math.floor(e.stepPhase);
          if (e.mode === "walk") playStep();
        }
        e.frame = Math.floor(e.stepPhase) % 2 === 0 ? "walk" : "stand";

        if (e.x <= 0 || e.x >= maxX) {
          e.x = Math.max(0, Math.min(maxX, e.x));
          if (e.mode === "run") {
            playBonk();
            shake(400);
            setDazed(true);
            setMode("dazed", 3);
          } else {
            playClimbFail();
            setMode("climb", 1.4);
          }
        }
      } else if (e.mode === "climb") {
        const t = 1.4 - e.timer;
        // scrabble up for 0.7s, slide back down
        e.y = t < 0.7 ? (t / 0.7) * 110 : Math.max(0, (1 - (t - 0.7) / 0.7) * 110);
        e.frame = "climb";
        if (e.timer <= 0) {
          e.y = 0;
          e.dir = e.dir === 1 ? -1 : 1;
          setMode("walk", 2 + Math.random() * 3);
        }
      } else if (e.mode === "dazed") {
        e.frame = "dazed";
        if (e.timer <= 0) {
          setDazed(false);
          e.dir = e.dir === 1 ? -1 : 1;
          setMode("walk", 2 + Math.random() * 3);
        }
      } else if (e.mode === "sit") {
        e.frame = "sit";
        if (e.timer <= 0) setMode("walk", 2 + Math.random() * 3);
      } else if (e.mode === "joke") {
        e.frame = "sit";
        if (e.timer <= 0) {
          setJoke(null);
          setMode("walk", 2 + Math.random() * 3);
        }
      } else {
        e.frame = "stand";
        if (e.timer <= 0) {
          // random decision
          const roll = Math.random();
          if (roll < 0.18) doSit();
          else if (roll < 0.3) {
            e.dir = Math.random() < 0.5 ? 1 : -1;
            setMode("run", 1.5 + Math.random() * 2);
          } else {
            e.dir = Math.random() < 0.5 ? 1 : -1;
            setMode("walk", 2 + Math.random() * 4);
          }
        }
      }

      // idle decision while walking too
      if ((e.mode === "walk" || e.mode === "run") && e.timer <= 0) {
        setMode(Math.random() < 0.35 ? "idle" : "walk", 1 + Math.random() * 2);
        if (Math.random() < 0.25) doSit();
      }

      if (bodyRef.current) {
        bodyRef.current.style.transform = `translate3d(${e.x}px, ${-e.y}px, 0)`;
      }
      drawFrame(ctx, FRAMES[e.frame], SCALE, e.dir === -1);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [doSit, setMode, shake]);

  return (
    <div
      ref={worldRef}
      className={`relative min-h-screen w-full overflow-hidden bg-background ${
        shaking ? "animate-screen-shake" : ""
      }`}
    >
      {/* pastel horizon */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-secondary/60" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-primary/20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-2 bg-primary/20" />

      <header className="relative z-10 px-6 pt-8 text-center">
        <h1 className="font-pixel text-lg text-primary sm:text-2xl">Pixel Elephant Playpen</h1>
        <p className="mt-3 font-pixel text-[9px] leading-5 text-muted-foreground sm:text-[10px]">
          click {name} to poke · click the tag to rename
        </p>
      </header>

      <TrainingPanel style={style} onSave={saveStyle} onAskJoke={() => void doJoke()} />

      <div
        ref={bodyRef}
        className="absolute left-0 will-change-transform"
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

      {/* ground shadow line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-primary/30" />
    </div>
  );
}
