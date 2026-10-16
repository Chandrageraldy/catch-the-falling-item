import type { CSSProperties } from 'react';

// Mirrors the host app's Material CircularProgressIndicator (36px, 4px
// stroke, theme orange, arc that grows/shrinks while rotating) on the same
// black background, so the handoff from the app's loading overlay to this
// one looks like a single spinner.
const SPINNER_COLOR = '#8F4C38';

export default function LoadingScreen() {
  return (
    <div style={styles.overlay}>
      <style>{keyframes}</style>
      <svg width={36} height={36} viewBox="0 0 36 36" style={styles.svg}>
        <circle
          cx={18}
          cy={18}
          r={16}
          fill="none"
          stroke={SPINNER_COLOR}
          strokeWidth={4}
          style={styles.arc}
        />
      </svg>
    </div>
  );
}

// Inline CSS can't declare @keyframes, so they ship with the component.
// The dash values are Material's indeterminate pattern scaled to r=16.
const keyframes = `
@keyframes loading-rotate {
  100% { transform: rotate(360deg); }
}
@keyframes loading-dash {
  0%   { stroke-dasharray: 1, 150;  stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 79, 150; stroke-dashoffset: -12; }
  100% { stroke-dasharray: 79, 150; stroke-dashoffset: -99; }
}
`;

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
  },
  svg: {
    animation: 'loading-rotate 1.4s linear infinite',
  },
  arc: {
    strokeLinecap: 'square',
    animation: 'loading-dash 1.4s ease-in-out infinite',
  },
};