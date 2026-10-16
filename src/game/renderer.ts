import { getImage } from './assets';
import { CONFIG } from './config';
import type { GameSnapshot } from './types';

// Also read independently by GameCanvas.tsx to gate mounting the React
// DebugPanel — duplicated rather than shared, since it's a one-line check.
const DEBUG_ENABLED = new URLSearchParams(window.location.search).get('debug') === '1';

// No game logic here — only drawing, driven entirely by the snapshot.
export function render(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
  const { width, height } = CONFIG.design;

  // Solid fallback first (in case the very first idle frame renders before
  // preloadAssets() resolves), then the real background stretched to cover
  // the full design area exactly, drawn before everything else.
  ctx.fillStyle = CONFIG.background.color;
  ctx.fillRect(0, 0, width, height);
  const background = getImage('Background');
  if (background) {
    ctx.drawImage(background, 0, 0, width, height);
  }

  drawItems(ctx, snapshot);
  drawPlayer(ctx, snapshot);

  // TEMP: revisit after step 1 verification — kept per explicit request.
  // Reads the sim clock directly: a broken accumulator shows up as a visibly
  // wrong number rather than something that merely "looks off". This clock
  // also backs GameOverResult.duration.
  if (DEBUG_ENABLED) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`sim: ${snapshot.elapsedSeconds.toFixed(2)}s`, 24, 48);
  }
}

function drawItems(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
  for (const item of snapshot.items) {
    // items.radius (config.ts) is the hitbox tuning value — the sprite is
    // drawn to match it, not the other way around, so swapping art in never
    // silently changes collision. Falls back to a placeholder circle if the
    // sprite somehow isn't loaded (shouldn't happen: the start screen is
    // gated on every registered sprite finishing decode).
    const sprite = getImage(item.sprite);
    if (sprite) {
      const size = item.radius * 2;
      ctx.drawImage(sprite, item.x - item.radius, item.y - item.radius, size, size);
      continue;
    }

    ctx.fillStyle = CONFIG.items.colors[item.kind];
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
  const { player } = snapshot;
  const { catchZoneOffset, catchZoneHeight, color, catchZoneColor, cornerRadius, spriteCrop } = CONFIG.player;

  const sprite = getImage('Basket');
  if (sprite) {
    // Crops out the sprite's large transparent margin (see spriteCrop's
    // comment in config.ts) so the drawn footprint matches the basket shape,
    // not its source canvas.
    ctx.drawImage(
      sprite,
      spriteCrop.x,
      spriteCrop.y,
      spriteCrop.width,
      spriteCrop.height,
      player.x,
      player.y,
      player.width,
      player.height,
    );
  } else {
    // Placeholder while the sprite hasn't loaded (shouldn't happen — the
    // start screen is gated on every registered sprite finishing decode).
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(player.x, player.y, player.width, player.height, cornerRadius);
    ctx.fill();

    ctx.fillStyle = catchZoneColor;
    ctx.beginPath();
    ctx.roundRect(player.x, player.y + catchZoneOffset, player.width, catchZoneHeight, cornerRadius);
    ctx.fill();
  }

  // Debug-only: the catch zone has no visual marker on the real sprite (the
  // basket's own art shows the opening), so outline the actual hitbox to
  // make it possible to line up "looks caught" with "is caught" by eye.
  if (DEBUG_ENABLED) {
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y + catchZoneOffset, player.width, catchZoneHeight);
  }
}
