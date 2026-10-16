import { CONFIG } from './config';
import { tunables } from './difficulty';
import { FallingItem, Player } from './entities';
import { render } from './renderer';
import { Spawner } from './spawner';
import type { EndReason, GameOverResult, GameSnapshot, GameStatus, HudState, ItemKind } from './types';

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private status: GameStatus = 'idle';

  private rafId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;

  // Left-edge X the player lerps toward each fixed step. Starts equal to the
  // player's spawn position so it stays put until the first pointer event.
  private targetX: number;
  private isDragging = false;

  private spawner = new Spawner();
  private items: FallingItem[] = [];

  private score = 0;
  // Still tracked as a stat for the game-over payload/analytics, but no
  // longer a fail condition on its own — missing a good item now costs a
  // life directly (see handleMiss).
  private missed = 0;
  // Counted up rather than down from a starting pool, so a debug-panel
  // change to maxLives is reflected immediately (compared live against the
  // tunable) instead of only affecting the next run.
  private livesLost = 0;
  private itemsCaught = 0;
  // Which of the two ways to lose a life happened most recently. Lives are
  // now the only fail state, so whatever set this last is what ended the run.
  private lastLifeLossReason: EndReason | null = null;

  // Exponential moving average, sampled once per rendered frame regardless
  // of game status. Pulled by the debug panel at its own cadence — never
  // pushed into React state from here.
  private fps = 0;

  // Elapsed playtime in seconds, driven by the fixed-timestep accumulator
  // (not wall-clock) so it can't drift from simulation state. Also the debug
  // overlay's readout in renderer.ts: a broken accumulator shows up as a
  // wrong number instead of a wall-clock one.
  private elapsedSeconds = 0;

  // React wires these in step 6. Called only when a displayed value actually
  // changes — the loop must never drive React state directly.
  onStateChange?: (state: HudState) => void;
  onGameOver?: (result: GameOverResult) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.player = new Player();
    this.targetX = this.player.x;

    this.resize();
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerUp);

    // Draw the idle scene once so the start screen has a live backdrop
    // instead of a blank canvas — the loop itself only runs once start() is
    // called by the "Start" button. Safe to assume every sprite is already
    // loaded here: GameCanvas (and so this Engine) is never constructed
    // until App.tsx's preloader has fully resolved.
    render(this.ctx, this.getSnapshot());
  }

  // Backing store is design resolution scaled by a capped device pixel
  // ratio; the context is then scaled so all drawing stays in design pixels.
  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr);
    this.canvas.width = CONFIG.design.width * dpr;
    this.canvas.height = CONFIG.design.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(): void {
    if (this.status === 'playing') return;
    this.status = 'playing';
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  pause(): void {
    if (this.status !== 'playing') return;
    this.status = 'paused';
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.status = 'playing';
    // Discard time spent paused so the loop does not fast-forward through it.
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.pause();
    }
  };

  private handlePointerDown = (event: PointerEvent): void => {
    this.isDragging = true;
    this.canvas.setPointerCapture(event.pointerId);
    this.updateTargetFromClientX(event.clientX);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDragging) return;
    this.updateTargetFromClientX(event.clientX);
  };

  private handlePointerUp = (): void => {
    this.isDragging = false;
  };

  private updateTargetFromClientX(clientX: number): void {
    // getBoundingClientRect(), never a hardcoded ratio: the canvas is
    // letterboxed and its CSS size changes with viewport/orientation.
    const rect = this.canvas.getBoundingClientRect();
    const scale = CONFIG.design.width / rect.width;
    const designX = (clientX - rect.left) * scale;

    const halfWidth = this.player.width / 2;
    this.targetX = clamp(designX - halfWidth, 0, CONFIG.design.width - this.player.width);
  }

  private loop = (time: number): void => {
    const rawDelta = time - this.lastTime;
    this.lastTime = time;
    this.updateFps(rawDelta);
    this.accumulator += Math.min(rawDelta, CONFIG.loop.maxDeltaMs);

    while (this.status === 'playing' && this.accumulator >= CONFIG.loop.fixedStepMs) {
      this.update(CONFIG.loop.fixedStepMs);
      this.accumulator -= CONFIG.loop.fixedStepMs;
    }

    render(this.ctx, this.getSnapshot());
    // A game-over transition inside update() flips status away from
    // 'playing' — stop rescheduling instead of looping forever post-game.
    this.rafId = this.status === 'playing' ? requestAnimationFrame(this.loop) : null;
  };

  private updateFps(rawDeltaMs: number): void {
    if (rawDeltaMs <= 0) return;
    const instantFps = 1000 / rawDeltaMs;
    this.fps = this.fps === 0 ? instantFps : this.fps * 0.9 + instantFps * 0.1;
  }

  private update(stepMs: number): void {
    this.player.x = lerp(this.player.x, this.targetX, CONFIG.player.followLerp);

    const spawned = this.spawner.update(stepMs, this.score);
    if (spawned) this.items.push(spawned);

    const stepSeconds = stepMs / 1000;
    for (const item of this.items) {
      item.y += item.speed * stepSeconds;
    }

    const remaining: FallingItem[] = [];
    for (const item of this.items) {
      if (this.tryCatch(item)) continue;
      if (item.y - item.radius > CONFIG.design.height) {
        this.handleMiss(item);
        continue;
      }
      remaining.push(item);
    }
    this.items = remaining;

    this.elapsedSeconds += stepSeconds;

    // Win is checked first, so a step that both hits the target and drains
    // the last life counts as the win.
    if (this.score >= CONFIG.scoring.maxScore) {
      this.endGame('max_score');
    } else if (this.livesLost >= tunables.maxLives) {
      this.endGame(this.lastLifeLossReason!);
    }
  }

  // Catching only counts against the catch zone — positioned at the
  // basket's actual opening (config.ts's catchZoneOffset), not the top of
  // the sprite frame — not the full body rect.
  private tryCatch(item: FallingItem): boolean {
    const zoneX = this.player.x;
    const zoneY = this.player.y + CONFIG.player.catchZoneOffset;
    const zoneWidth = this.player.width;
    const zoneHeight = CONFIG.player.catchZoneHeight;

    const closestX = clamp(item.x, zoneX, zoneX + zoneWidth);
    const closestY = clamp(item.y, zoneY, zoneY + zoneHeight);
    const dx = item.x - closestX;
    const dy = item.y - closestY;
    if (dx * dx + dy * dy > item.radius * item.radius) return false;

    this.resolveCatch(item.kind);
    return true;
  }

  private resolveCatch(kind: ItemKind): void {
    switch (kind) {
      case 'good':
        this.score += CONFIG.scoring.goodPoints;
        this.itemsCaught += 1;
        break;
      case 'golden':
        this.score += CONFIG.scoring.goldenBonus;
        this.itemsCaught += 1;
        break;
      case 'obstacle':
        this.livesLost += 1;
        this.lastLifeLossReason = 'caught_obstacle';
        break;
    }
    this.emitStateChange();
  }

  private handleMiss(item: FallingItem): void {
    // Golden and obstacle items reaching the floor are a no-op by design.
    if (item.kind !== 'good') return;
    this.missed += 1;
    this.livesLost += 1;
    this.lastLifeLossReason = 'missed_item';
    this.emitStateChange();
  }

  private remainingLives(): number {
    return Math.max(tunables.maxLives - this.livesLost, 0);
  }

  private emitStateChange(): void {
    // `missed` isn't part of HudState — it's still tracked (this.missed) and
    // reported in the game-over payload for analytics, just not shown live.
    this.onStateChange?.({ score: this.score, lives: this.remainingLives() });
  }

  private endGame(endReason: EndReason): void {
    this.status = 'gameOver';

    // Logged so difficulty tuning is driven by data instead of opinion
    // (what is actually ending runs: missed items, obstacles, or wins?).
    console.log(`[game] run ended — reason: ${endReason}`, {
      score: this.score,
      missed: this.missed,
      livesLost: this.livesLost,
    });

    this.onGameOver?.({
      score: Math.min(this.score, CONFIG.scoring.maxScore),
      misses: this.missed,
      duration: Math.round(this.elapsedSeconds * 1000),
      itemsCaught: this.itemsCaught,
      endReason,
    });
  }

  // Pull-based, sampled by the debug panel at its own cadence — not pushed
  // per frame, so it stays outside the "loop never touches React state" rule.
  getDebugSnapshot(): { fps: number; activeItemCount: number } {
    return { fps: this.fps, activeItemCount: this.items.length };
  }

  private getSnapshot(): GameSnapshot {
    return {
      status: this.status,
      player: {
        x: this.player.x,
        y: this.player.y,
        width: this.player.width,
        height: this.player.height,
      },
      items: this.items.map((item) => ({
        x: item.x,
        y: item.y,
        radius: item.radius,
        kind: item.kind,
        sprite: item.sprite,
      })),
      score: this.score,
      missed: this.missed,
      lives: this.remainingLives(),
      elapsedSeconds: this.elapsedSeconds,
    };
  }
}
