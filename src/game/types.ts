import type { AssetKey } from './assets';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameOver';

// The engine only ever reasons about which of these three categories an item
// belongs to (spawn weight, scoring, catch/miss effect). Which specific
// sprite an item got within its category is separate — see ItemSnapshot.sprite.
export type ItemKind = 'good' | 'golden' | 'obstacle';

export interface PlayerSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ItemSnapshot {
  x: number;
  y: number;
  radius: number;
  kind: ItemKind;
  sprite: AssetKey;
}

// Read-only view of engine state, handed to the renderer each frame. The
// renderer must never mutate this or reach back into the engine.
export interface GameSnapshot {
  status: GameStatus;
  player: PlayerSnapshot;
  items: ItemSnapshot[];
  score: number;
  missed: number;
  lives: number;
  // Elapsed playtime in seconds, driven by the fixed-timestep accumulator
  // rather than wall-clock time. Doubles as GameOverResult.duration.
  elapsedSeconds: number;
}

// Misses are still tracked internally (GameSnapshot.missed, GameOverResult.misses)
// but are no longer shown live — not part of what the HUD displays during play.
export interface HudState {
  score: number;
  lives: number;
}

// Why the run ended. Lives are the only fail state, so a loss is whichever of
// the two life-costing events took the last one; 'max_score' is the win.
export type EndReason = 'missed_item' | 'caught_obstacle' | 'max_score';

export interface GameOverResult {
  score: number;
  misses: number;
  duration: number;
  itemsCaught: number;
  endReason: EndReason;
}
