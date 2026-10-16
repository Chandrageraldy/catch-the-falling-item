import type { AssetKey } from './assets';
import { CONFIG } from './config';
import { fallSpeedForScore, spawnIntervalForScore, tunables } from './difficulty';
import { FallingItem } from './entities';
import type { ItemKind } from './types';

// Sprite pool per category. Even distribution within a category is what
// gives each individual sprite its share of the category's overall roll
// weight — no separate per-sprite weighting needed.
const SPRITES_BY_KIND: Record<ItemKind, AssetKey[]> = {
  good: ['Common_Stew', 'Common_Yakult', 'Common_Kimchi', 'Common_Ramyeon', 'Common_Tteokbokki'],
  golden: ['Rare_Bingsu', 'Rare_Corndog', 'Rare_FriedChick'],
  obstacle: ['Trap_Bone', 'Trap_StinkySock', 'Trap_Tin', 'Trap_FishBone'],
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Lanes span only the play area to the right of the HUD tracker's footprint,
// so nothing spawns or falls behind it. Read live: the tracker's size is
// debug-panel tunable.
function playfield(): { left: number; laneWidth: number } {
  const left = tunables.trackerLeft + tunables.trackerWidth;
  return { left, laneWidth: (CONFIG.design.width - left) / CONFIG.items.laneCount };
}

function laneCenterX(lane: number): number {
  const { left, laneWidth } = playfield();
  return left + laneWidth * (lane + 0.5);
}

function rollItemKind(): ItemKind {
  const roll = Math.random();
  const golden = clamp(tunables.goldenWeight, 0, 1);
  const obstacle = clamp(tunables.obstacleWeight, 0, 1);
  // "good" is always the remainder — there's no direct slider for it.
  const good = Math.max(0, 1 - golden - obstacle);
  if (roll < good) return 'good';
  if (roll < good + golden) return 'golden';
  return 'obstacle';
}

function rollSprite(kind: ItemKind): AssetKey {
  const pool = SPRITES_BY_KIND[kind];
  return pool[Math.floor(Math.random() * pool.length)];
}

function rollLaneX(lane: number): number {
  const { left, laneWidth } = playfield();
  const maxJitter = Math.max(0, Math.min(CONFIG.items.laneJitter, laneWidth / 2 - CONFIG.items.radius));
  const jitter = (Math.random() * 2 - 1) * maxJitter;
  return clamp(laneCenterX(lane) + jitter, left + CONFIG.items.radius, CONFIG.design.width - CONFIG.items.radius);
}

export class Spawner {
  private msUntilNextSpawn = spawnIntervalForScore(0);
  private lastLane: number | null = null;
  private msSinceLastSpawn = 0;

  // Advances the spawn clock by one fixed step and returns a new item when
  // one is due, or null otherwise. Score drives both the reset interval and
  // the new item's fall speed, recomputed fresh each time rather than
  // carried forward, so a debug-panel change takes effect on the very next
  // spawn with no restart.
  update(stepMs: number, score: number): FallingItem | null {
    this.msSinceLastSpawn += stepMs;
    this.msUntilNextSpawn -= stepMs;
    if (this.msUntilNextSpawn > 0) return null;

    this.msUntilNextSpawn += spawnIntervalForScore(score);
    return this.spawn(score);
  }

  private spawn(score: number): FallingItem {
    const lane = this.pickLane();
    this.lastLane = lane;
    this.msSinceLastSpawn = 0;

    const kind = rollItemKind();
    return new FallingItem(kind, lane, rollLaneX(lane), fallSpeedForScore(score), rollSprite(kind));
  }

  // Rejects lanes the player couldn't plausibly reach in the time since the
  // last spawn, so two items in distant lanes never land uncatchably close
  // together. Falls back to repeating the last lane rather than picking a
  // lane that fails the fairness check.
  private pickLane(): number {
    const laneCount = CONFIG.items.laneCount;
    const allLanes = Array.from({ length: laneCount }, (_, lane) => lane);

    if (this.lastLane === null) {
      return allLanes[Math.floor(Math.random() * allLanes.length)];
    }

    const { laneWidth } = playfield();
    const reachable = allLanes.filter((lane) => {
      const distancePx = Math.abs(lane - this.lastLane!) * laneWidth;
      const crossingTimeMs = (distancePx / CONFIG.spawner.assumedPlayerCrossSpeed) * 1000;
      return this.msSinceLastSpawn >= crossingTimeMs;
    });

    const pool = reachable.length > 0 ? reachable : [this.lastLane];
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
