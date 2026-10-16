import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Engine } from '../game/engine';
import { setTunable, tunables } from '../game/difficulty';

interface DebugPanelProps {
  engine: Engine;
}

type TunableKey = keyof typeof tunables;

interface SliderConfig {
  key: TunableKey;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

const percent = (value: number) => `${Math.round(value * 100)}%`;
const plain = (value: number) => `${value}`;

const SLIDERS: SliderConfig[] = [
  { key: 'fallSpeedBase', label: 'Fall speed base', min: 100, max: 800, step: 10, format: plain },
  { key: 'fallSpeedPerPoint', label: 'Fall speed rate', min: 0, max: 20, step: 0.5, format: plain },
  { key: 'spawnIntervalStart', label: 'Spawn interval start', min: 300, max: 3000, step: 50, format: plain },
  { key: 'spawnIntervalPerPoint', label: 'Spawn interval rate', min: 0, max: 30, step: 1, format: plain },
  { key: 'spawnIntervalMin', label: 'Spawn interval min', min: 100, max: 1500, step: 25, format: plain },
  { key: 'obstacleWeight', label: 'Obstacle %', min: 0, max: 1, step: 0.01, format: percent },
  { key: 'goldenWeight', label: 'Golden %', min: 0, max: 1, step: 0.01, format: percent },
  { key: 'maxLives', label: 'Max lives', min: 1, max: 10, step: 1, format: plain },
  { key: 'trackerWidth', label: 'Tracker width', min: 30, max: 160, step: 2, format: plain },
  { key: 'trackerLeft', label: 'Tracker left offset', min: 0, max: 60, step: 1, format: plain },
];

// FPS/item count are pulled from the engine on a slow interval owned by this
// component — never pushed from the game loop, so this stays outside the
// "loop never touches React state" rule.
const STATS_POLL_MS = 250;

export default function DebugPanel({ engine }: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [values, setValues] = useState<typeof tunables>(() => ({ ...tunables }));
  const [stats, setStats] = useState({ fps: 0, activeItemCount: 0 });

  useEffect(() => {
    const id = window.setInterval(() => {
      setStats(engine.getDebugSnapshot());
    }, STATS_POLL_MS);
    return () => window.clearInterval(id);
  }, [engine]);

  const handleChange = (key: TunableKey, value: number) => {
    setTunable(key, value);
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div style={styles.panel}>
      <button style={styles.toggle} onClick={() => setCollapsed((c) => !c)}>
        Debug {collapsed ? '▲' : '▼'} — {stats.fps.toFixed(0)} fps · {stats.activeItemCount} items
      </button>
      {!collapsed && (
        <div style={styles.body}>
          {SLIDERS.map((slider) => (
            <label key={slider.key} style={styles.row}>
              <span style={styles.rowLabel}>
                {slider.label}: {slider.format(values[slider.key])}
              </span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={values[slider.key]}
                onChange={(e) => handleChange(slider.key, Number(e.target.value))}
                style={styles.slider}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    background: 'rgba(0, 0, 0, 0.85)',
    color: '#fff',
    fontFamily: 'sans-serif',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  toggle: {
    width: '100%',
    minHeight: 48,
    padding: '12px 16px',
    background: 'transparent',
    color: '#fff',
    border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.2)',
    fontSize: 15,
    textAlign: 'left',
  },
  body: {
    maxHeight: '50vh',
    overflowY: 'auto',
    padding: '4px 16px 16px',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '10px 0',
  },
  rowLabel: {
    fontSize: 14,
  },
  slider: {
    width: '100%',
    height: 32,
  },
};
