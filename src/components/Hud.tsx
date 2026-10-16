import { useEffect, useReducer } from 'react';
import type { CSSProperties } from 'react';
import { getAssetUrl } from '../game/assets';
import { CONFIG } from '../game/config';
import { subscribeTunables, tunables } from '../game/difficulty';

interface HudProps {
  score: number;
  lives: number;
}

// Top to bottom, so red sits at the bottom of the bar and green at the top.
// Equal-height visual bands; the milestone labels are what carry the numbers.
const BAND_COLORS = ['#3DBE5A', '#F5C518', '#EF7226', '#E03A3E'];
const PIXEL_NAVY = '#0C2C3A';

// The canvas is letterboxed to the design aspect ratio (index.css), so the
// tracker is sized and placed in design px scaled to the canvas's actual
// on-screen width — which keeps it in step with the lanes the spawner lays
// out in design space.
const PLAY_WIDTH = `min(100vw, ${(100 * CONFIG.design.width) / CONFIG.design.height}dvh)`;
const PLAY_LEFT = `((100vw - ${PLAY_WIDTH}) / 2)`;

function designPx(px: number): string {
  return `calc(${PLAY_WIDTH} * ${px / CONFIG.design.width})`;
}

// 0..1 position along the bar, capped so score past maxScore pins the marker
// at the top instead of running off it.
function fractionOf(score: number): number {
  return Math.min(Math.max(score / CONFIG.scoring.maxScore, 0), 1);
}

function percentOf(score: number): string {
  return `${fractionOf(score) * 100}%`;
}

export default function Hud({ score, lives }: HudProps) {
  // Re-render when the debug panel moves a slider (tracker size, max lives).
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeTunables(refresh), []);

  // Proportions of the tracker's total width: arrow | gap | bar | gap | labels.
  const width = tunables.trackerWidth;
  const arrowWidth = width * 0.2;
  const barLeft = width * 0.26;
  const barWidth = width * 0.2;
  // Slot count tracks the live-tunable value (not a hardcoded 3) so the
  // heart row stays correct while maxLives is still being tuned.
  const slots = Array.from({ length: tunables.maxLives }, (_, i) => i < lives);

  return (
    <div style={styles.container}>
      <div style={styles.top}>
        <img src={getAssetUrl('Header')} alt="Catch the falling items!" style={styles.header} />
        <div style={styles.hearts}>
          {slots.map((full, i) => (
            <img
              key={i}
              src={getAssetUrl(full ? 'LifeFull' : 'LifeLost')}
              alt={full ? 'Life' : 'Life lost'}
              style={styles.heart}
            />
          ))}
        </div>
      </div>
      <div style={styles.tracker}>
        <div style={{ ...styles.track, left: `calc(${PLAY_LEFT} + ${designPx(tunables.trackerLeft)})`, width: designPx(width) }}>
          <div style={{ ...styles.bar, left: designPx(barLeft), width: designPx(barWidth) }}>
            {BAND_COLORS.map((color) => (
              <div key={color} style={{ flex: 1, background: color }} />
            ))}
          </div>
          {CONFIG.scoring.milestones.map((milestone) => (
            <span
              key={milestone}
              style={{
                ...styles.label,
                bottom: percentOf(milestone),
                left: designPx(barLeft + barWidth + width * 0.05),
                fontSize: designPx(width * 0.25),
              }}
            >
              {milestone}
            </span>
          ))}
          <div
            style={{
              ...styles.arrow,
              bottom: percentOf(score),
              borderTopWidth: designPx(width * 0.11),
              borderBottomWidth: designPx(width * 0.11),
              borderLeftWidth: designPx(arrowWidth),
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Vertical breathing room so the marker/labels at 0 and maxScore, which are
// centred on the bar's ends, don't get clipped or crowd the hearts.
const TRACK_INSET = 10;

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxSizing: 'border-box',
    paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
    // Keeps the bar clear of the basket's row at the bottom of the play area.
    paddingBottom: 'calc(env(safe-area-inset-bottom) + 18dvh)',
    // The HUD sits over the canvas but must never intercept the drag that
    // moves the player.
    pointerEvents: 'none',
    zIndex: 500,
  },
  // Header and hearts share this same left padding, so their left edges line
  // up by construction.
  top: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flexShrink: 0,
    paddingLeft: 'calc(env(safe-area-inset-left) + 20px)',
    paddingRight: 'calc(env(safe-area-inset-right) + 20px)',
  },
  header: {
    width: '100%',
    height: 'auto',
  },
  hearts: {
    display: 'flex',
    gap: 6,
  },
  heart: {
    height: 28,
    width: 'auto',
  },
  tracker: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
  },
  track: {
    position: 'absolute',
    top: TRACK_INSET,
    bottom: TRACK_INSET,
  },
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    border: `2px solid ${PIXEL_NAVY}`,
    borderRadius: 2,
    overflow: 'hidden',
  },
  label: {
    position: 'absolute',
    transform: 'translateY(50%)',
    fontFamily: '"Courier New", monospace',
    fontWeight: 700,
    color: '#FFFFFF',
    // Hard four-direction outline, the same pixel look as the start button.
    textShadow: `1px 0 0 ${PIXEL_NAVY}, -1px 0 0 ${PIXEL_NAVY}, 0 1px 0 ${PIXEL_NAVY}, 0 -1px 0 ${PIXEL_NAVY}`,
  },
  arrow: {
    position: 'absolute',
    left: 0,
    transform: 'translateY(50%)',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    borderRightWidth: 0,
    filter: `drop-shadow(1px 0 0 ${PIXEL_NAVY}) drop-shadow(0 1px 0 ${PIXEL_NAVY})`,
    transition: 'bottom 0.25s ease-out',
  },
};
