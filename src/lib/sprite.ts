// 8-bit elephant sprite. Each frame is authored as a left half (12 columns)
// and mirrored to produce a symmetric 24-wide grid.

export const PALETTE: Record<string, string> = {
  K: "#161a3d", // outline navy
  B: "#7ec0f0", // body blue
  L: "#bcdcf8", // light blue highlight
  E: "#b0648a", // ear mauve
  D: "#c98aa8", // light mauve (foot pads)
  W: "#f6f2e8", // eye white
  X: "#161a3d", // pupil
  P: "#f2a0bd", // blush
};

const mirror = (half: string[]): string[] =>
  half.map((row) => row + row.split("").reverse().join(""));

// rows 0-11: head + ears (12 columns, left half)
const HEAD: string[] = [
  ".....KKKKKKK",
  "...KLEEKLLLL",
  "..KLEEEKLLLL",
  ".KLEEEEKLLLL",
  ".KLEEEEKLLLL",
  "KLEEEEEKLLLL",
  "KLEEEEEKLWXB",
  "KLEEEEEKLWXB",
  ".KLEEEEKLLLB",
  ".KLEEEEKPPBL",
  "..KLEEEKLLBL",
  "...KLEEKLLBL",
];

const HEAD_DAZED: string[] = HEAD.map((row, i) =>
  i === 6 ? "KLEEEEEKLXWB" : i === 7 ? "KLEEEEEKLWXB" : row,
);

// rows 12-21: torso, trunk and legs
const bodyStand: string[] = [
  "....KKKKBBKL",
  "......KBBBKL",
  "......KBBBKL",
  ".....KBBBBKL",
  "....KBBBBBKL",
  "....KBBBBBKK",
  "...KBBBBBBBB",
  "...KBBKKBBBB",
  "...KBBK.KBBK",
  "...KKKK.KKKK",
];

const bodyWalk: string[] = [
  ...bodyStand.slice(0, 7),
  "...KBBBBBBBB",
  "..KBBKKBBBBB",
  "..KBBK..KBBK",
  "..KKKK..KKKK",
];

const bodySit: string[] = [
  "....KKKKBBKL",
  "......KBBBKL",
  "......KBBBKL",
  "....KBBBBBKL",
  "...KBBBBBBKL",
  "..KBBBBBBBKK",
  ".KDDBBBBBBBB",
  ".KDDDBBBBBBB",
  ".KDDDKBBBBBB",
  ".KKKKKKKKKKK",
];

const bodyClimb: string[] = [
  ...bodyStand.slice(0, 6),
  "....KBBBBBKK",
  "...KBBBBBBBB",
  "....KBBBBBBB",
  "....KBBKKBBB",
  "....KKKK.KKK",
];

export type FrameName = "stand" | "walk" | "sit" | "climb" | "dazed";

export const FRAMES: Record<FrameName, string[]> = {
  stand: mirror([...HEAD, ...bodyStand]),
  walk: mirror([...HEAD, ...bodyWalk]),
  sit: mirror([...HEAD, ...bodySit]),
  climb: mirror([...HEAD, ...bodyClimb]),
  dazed: mirror([...HEAD_DAZED, ...bodyStand]),
};

export const GRID_W = 24;
export const GRID_H = 22;

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: string[],
  scale: number,
  flip: boolean,
) {
  ctx.clearRect(0, 0, GRID_W * scale, GRID_H * scale);
  for (let y = 0; y < frame.length; y++) {
    const row = frame[y];
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x]];
      if (!color) continue;
      const px = flip ? GRID_W - 1 - x : x;
      ctx.fillStyle = color;
      ctx.fillRect(px * scale, y * scale, scale, scale);
    }
  }
}
