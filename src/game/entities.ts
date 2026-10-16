import type { AssetKey } from './assets';
import { CONFIG } from './config';
import type { ItemKind } from './types';

export class Player {
  x: number;
  y: number;
  width = CONFIG.player.width;
  height = CONFIG.player.height;

  constructor() {
    this.x = CONFIG.design.width / 2 - this.width / 2;
    this.y = CONFIG.design.height - CONFIG.player.bottomMargin - this.height;
  }
}

export class FallingItem {
  readonly kind: ItemKind;
  readonly lane: number;
  readonly radius = CONFIG.items.radius;
  // design px/sec, fixed at spawn time so an item's fall doesn't change
  // speed mid-flight as later spawns get harder.
  readonly speed: number;
  // Which specific sprite this item rolled within its category — the engine
  // never looks at this, only the renderer does.
  readonly sprite: AssetKey;
  x: number;
  y: number;

  constructor(kind: ItemKind, lane: number, x: number, speed: number, sprite: AssetKey) {
    this.kind = kind;
    this.lane = lane;
    this.x = x;
    this.y = -this.radius;
    this.speed = speed;
    this.sprite = sprite;
  }
}
