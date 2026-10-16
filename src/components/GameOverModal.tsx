import type { CSSProperties } from 'react';
import { CONFIG } from '../game/config';
import type { EndReason, GameOverResult } from '../game/types';

interface GameOverModalProps {
  result: GameOverResult;
  onPlayAgain: () => void;
}

const END_REASON_TEXT: Record<EndReason, string> = {
  missed_item: 'Out of lives — one too many items hit the floor.',
  caught_obstacle: 'Out of lives — caught by an obstacle.',
  max_score: `You reached ${CONFIG.scoring.maxScore} points!`,
};

// Same dialog for both outcomes — a win (reaching maxScore) only changes the
// title and reason line.
export default function GameOverModal({ result, onPlayAgain }: GameOverModalProps) {
  const seconds = (result.duration / 1000).toFixed(1);
  const won = result.endReason === 'max_score';

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.title}>{won ? 'You Win!' : 'Game Over'}</h2>
        <p style={styles.reason}>{END_REASON_TEXT[result.endReason]}</p>
        <div style={styles.stats}>
          <Stat label="Score" value={Math.min(result.score, CONFIG.scoring.maxScore)} />
          <Stat label="Items caught" value={result.itemsCaught} />
          <Stat label="Items missed" value={result.misses} />
          <Stat label="Duration" value={`${seconds}s`} />
        </div>
        <button style={styles.button} onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={styles.statRow}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.6)',
    zIndex: 900,
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  card: {
    background: '#10394F',
    color: '#fff',
    borderRadius: 16,
    padding: '28px 32px',
    minWidth: 260,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    fontFamily: 'sans-serif',
  },
  title: {
    margin: 0,
    fontSize: 28,
    textAlign: 'center',
  },
  reason: {
    margin: 0,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.85,
  },
  stats: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 16,
  },
  statLabel: {
    opacity: 0.8,
  },
  statValue: {
    fontWeight: 700,
  },
  button: {
    minHeight: 56,
    fontSize: 18,
    fontWeight: 600,
    borderRadius: 999,
    border: 'none',
    background: '#3D8BFD',
    color: '#fff',
  },
};
