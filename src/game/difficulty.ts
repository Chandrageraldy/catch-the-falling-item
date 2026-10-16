import { CONFIG } from './config';

interface DifficultyTunables {
  fallSpeedBase: number;
  fallSpeedPerPoint: number;
  spawnIntervalStart: number;
  spawnIntervalPerPoint: number;
  spawnIntervalMin: number;
  goldenWeight: number;
  obstacleWeight: number;
  maxLives: number;
  trackerWidth: number;
  trackerLeft: number;
}

// The live-tunable copy of the difficulty knobs. config.ts holds the
// defaults; this is the mutable state the debug panel's sliders write to and
// the difficulty curves below read from — applied on the next tick, no
// engine restart required. `fallSpeed.max` is intentionally absent: it's a
// hard technical ceiling, not something the debug panel exposes.
export const tunables: DifficultyTunables = {
  fallSpeedBase: CONFIG.fallSpeed.base,
  fallSpeedPerPoint: CONFIG.fallSpeed.perPoint,
  spawnIntervalStart: CONFIG.spawnInterval.start,
  spawnIntervalPerPoint: CONFIG.spawnInterval.perPoint,
  spawnIntervalMin: CONFIG.spawnInterval.min,
  goldenWeight: CONFIG.items.spawnWeights.golden,
  obstacleWeight: CONFIG.items.spawnWeights.obstacle,
  maxLives: CONFIG.game.maxLives,
  trackerWidth: CONFIG.tracker.width,
  trackerLeft: CONFIG.tracker.left,
};

// The debug panel writes through setTunable so anything drawn by React from
// these values (the HUD's heart row and tracker) can re-render on a slider
// change — a plain assignment to `tunables` would be invisible to React.
// Fires per slider drag, never per frame.
const listeners = new Set<() => void>();

export function setTunable(key: keyof DifficultyTunables, value: number): void {
  tunables[key] = value;
  listeners.forEach((listener) => listener());
}

export function subscribeTunables(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Pure functions of score, no accumulated state — a value that ratcheted up
// on its own would drift and couldn't be reproduced when debugging a bad run.
// Weighted toward fall speed: raising spawn rate instead creates physically
// uncatchable pairs, which reads as unfair rather than hard.
export function fallSpeedForScore(score: number): number {
  return Math.min(tunables.fallSpeedBase + score * tunables.fallSpeedPerPoint, CONFIG.fallSpeed.max);
}

export function spawnIntervalForScore(score: number): number {
  return Math.max(tunables.spawnIntervalStart - score * tunables.spawnIntervalPerPoint, tunables.spawnIntervalMin);
}
