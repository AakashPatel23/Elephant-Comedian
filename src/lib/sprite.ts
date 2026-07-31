// Raster sprite rendering. Two sheets, both 40x40px frames laid out in a single row:
//  - elephant-walk.png: 23 hand-drawn frames (walk cycle, a built-in blink at frame 6,
//    and a trunk-raise/trumpet curl from frame 12 through 22).
//  - elephant-poses.png: 3 frames authored to match (sit, and a 2-frame climb scrabble)
//    since the walk sheet didn't cover those.
// The head never moves across any frame in either sheet, so eyes can be closed for a
// blink/wink/dazed look by painting two small rects over the eye pixels at a fixed
// spot, regardless of which frame is currently showing.
import walkSheetUrl from "@/assets/elephant-walk.png";
import posesSheetUrl from "@/assets/elephant-poses.png";

export const FRAME_SIZE = 40;

// `Image` doesn't exist during SSR, so these are created lazily on first
// browser-side use instead of at module load time.
let walkImg: HTMLImageElement | undefined;
let posesImg: HTMLImageElement | undefined;

function getSheetImage(sheet: Sheet): HTMLImageElement {
  if (sheet === "walk") {
    if (!walkImg) {
      walkImg = new Image();
      walkImg.src = walkSheetUrl;
    }
    return walkImg;
  }
  if (!posesImg) {
    posesImg = new Image();
    posesImg.src = posesSheetUrl;
  }
  return posesImg;
}

export type Sheet = "walk" | "poses";

export const WALK_FRAMES = [0, 1, 2, 3, 4, 5];
export const TRUMPET_FRAMES = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

export const POSE_SIT = 0;
export const POSE_CLIMB_A = 1;
export const POSE_CLIMB_B = 2;

export type EyeState = "open" | "blink" | "wink-left" | "wink-right";

const EYE_LEFT_X = 20;
const EYE_RIGHT_X = 26;
const EYE_TOP_Y = 13;
const EYE_BOTTOM_Y = 14;
const EYE_W = 3;
const BODY_COLOR = "#bfd7eb";

function closeEye(ctx: CanvasRenderingContext2D, eyeX: number) {
  ctx.fillStyle = BODY_COLOR;
  ctx.fillRect(eyeX, EYE_TOP_Y, EYE_W, 1);
  ctx.fillStyle = "#000000";
  ctx.fillRect(eyeX, EYE_BOTTOM_Y, EYE_W, 1);
}

export function drawElephant(
  ctx: CanvasRenderingContext2D,
  sheet: Sheet,
  frameIndex: number,
  scale: number,
  flip: boolean,
  eyeState: EyeState = "open",
) {
  const img = getSheetImage(sheet);
  const size = FRAME_SIZE * scale;
  ctx.clearRect(0, 0, size, size);
  if (!img.complete || img.naturalWidth === 0) return;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.scale(scale, scale);
  if (flip) {
    ctx.translate(FRAME_SIZE, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(
    img,
    frameIndex * FRAME_SIZE,
    0,
    FRAME_SIZE,
    FRAME_SIZE,
    0,
    0,
    FRAME_SIZE,
    FRAME_SIZE,
  );
  if (eyeState === "blink") {
    closeEye(ctx, EYE_LEFT_X);
    closeEye(ctx, EYE_RIGHT_X);
  } else if (eyeState === "wink-left") {
    closeEye(ctx, EYE_LEFT_X);
  } else if (eyeState === "wink-right") {
    closeEye(ctx, EYE_RIGHT_X);
  }
  ctx.restore();
}
