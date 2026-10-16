// Every tunable number lives here. Nothing below is inlined elsewhere.
export const CONFIG = {
  design: {
    width: 720,
    height: 1280,
  },

  // Backing store = design size * min(devicePixelRatio, maxDpr). A 3x Android
  // renders 2.25x the pixels of a 2x cap for no visible gain.
  maxDpr: 2,

  loop: {
    fixedStepMs: 1000 / 60,
    // Clamp the per-frame delta so backgrounding the tab (or a long GC pause)
    // does not make the accumulator dump a burst of catch-up updates that
    // teleports items downward.
    maxDeltaMs: 100,
  },

  player: {
    // Aspect-matched to spriteCrop below (2000:1100) so the basket sprite
    // isn't stretched out of shape.
    width: 120,
    height: 66,
    // The basket's opening isn't at the top of its image frame — there's a
    // visible back rim above it and the front rim/woven wall below it. Both
    // measured by eye from Basket_Asset.png: offset is where the back rim
    // starts, height covers down to just short of the front rim.
    catchZoneOffset: 4,
    catchZoneHeight: 28,
    bottomMargin: 90,
    color: '#3D8BFD',
    // Placeholder-only — used if the basket sprite hasn't loaded yet.
    catchZoneColor: '#FFF3E0',
    cornerRadius: 12,
    // Source rectangle sampled from Basket_Asset.png (a 2000x2000 canvas):
    // crops out the large transparent margin above/below the basket shape so
    // none of the player's drawn footprint is empty space.
    spriteCrop: { x: 0, y: 530, width: 2000, height: 1100 },
    // Fraction of the remaining distance to the pointer closed per fixed
    // step. Safe as a flat constant (not scaled by dt) because FIXED_STEP
    // never varies, so this already produces identical feel at 60Hz and 120Hz.
    followLerp: 0.25,
  },

  background: {
    color: '#10394F',
  },

  items: {
    radius: 50,
    laneCount: 5,
    // Random X offset within a lane so the field doesn't look gridded.
    laneJitter: 40,
    // "good" isn't listed here — it's always the remainder after golden and
    // obstacle, since the debug panel only exposes those two as sliders.
    spawnWeights: {
      golden: 0.15,
      obstacle: 0.15,
    },
    colors: {
      good: '#3ECF6B',
      golden: '#FFC93D',
      obstacle: '#FF4D4D',
    },
  },

  // design px/sec, curved by score in difficulty.ts. These are the default
  // seed values for the live-tunable copy the debug panel edits; `max` isn't
  // exposed as a slider — it's a hard technical ceiling, not a feel knob.
  fallSpeed: {
    base: 450,
    perPoint: 6,
    max: 1000,
  },

  // ms between spawns, curved by score in difficulty.ts. Default seed values
  // for the live-tunable copy the debug panel edits.
  spawnInterval: {
    start: 800,
    perPoint: 5,
    min: 300,
  },

  spawner: {
    // Not a real movement speed — a fairness heuristic (design px/sec) used
    // to reject a candidate lane when the gap since the last spawn isn't
    // long enough for the player to plausibly cross to it.
    assumedPlayerCrossSpeed: 900,
  },

  // HUD progress tracker, in design px measured from the left edge of the
  // play area. Seeds for the live-tunable copy the debug panel edits. `width`
  // is the tracker's whole footprint (arrow + bar + labels — the bar and text
  // scale with it); `left` is the gap between the play-area edge and it.
  // Lanes only span the space to the right of left + width, so items never
  // spawn or fall behind the tracker.
  tracker: {
    width: 80,
    left: 4,
  },

  scoring: {
    // "good"/standard tier
    goodPoints: 2,
    // "golden"/rare tier
    goldenBonus: 5,
    // "obstacle"/trap tier scores 0 and costs a life — see engine.ts's
    // resolveCatch, not a config value since it's not a tunable number.

    // Reaching this score ends the run as a win, and it's the top of the HUD
    // progress bar (the bar fills proportionally, capped here).
    maxScore: 200,
    // Score thresholds labelled beside the HUD progress bar. The labels and
    // their positions are derived from this list, so editing it is enough
    // to keep the tracker in sync. Each must be <= maxScore.
    milestones: [50, 100, 200],
  },

  // Default seed value for the live-tunable copy the debug panel edits.
  // Lives are the only fail state — missing a good item or catching an
  // obstacle both cost one.
  game: {
    maxLives: 3,
  },
} as const;
