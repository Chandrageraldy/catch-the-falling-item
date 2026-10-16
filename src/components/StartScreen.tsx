import type { CSSProperties } from 'react';
import { getAssetUrl } from '../game/assets';

interface StartScreenProps {
  onStart: () => void;
  disabled?: boolean;
}

// App.tsx only ever mounts this once every asset is preloaded (see
// LoadingScreen.tsx), so the button here needs no ready/disabled state of
// its own — by the time this renders, it's always safe to press.
export default function StartScreen({ onStart, disabled }: StartScreenProps) {
  return (
    <div style={styles.overlay}>
      <img src={getAssetUrl('Header')} alt="Catch the falling items!" style={styles.header} />
      <button className="pixel-button" style={styles.button} onClick={onStart} disabled={disabled}>
        {disabled ? 'STARTING…' : 'START'}
      </button>
    </div>
  );
}

// Colors sampled from Header_Asset.png so the hand-styled button (no button
// asset was delivered) matches the delivered art instead of clashing with it.
const PIXEL_ORANGE = '#EF7226';
const PIXEL_NAVY = '#0C2C3A';

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    padding: '0 32px',
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    zIndex: 800,
  },
  header: {
    width: '100%',
    height: 'auto',
  },
  button: {
    minWidth: 220,
    minHeight: 64,
    padding: '0 32px',
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 2,
    fontFamily: '"Courier New", monospace',
    color: '#FFFFFF',
    textShadow: `2px 2px 0 ${PIXEL_NAVY}`,
    background: PIXEL_ORANGE,
    border: `4px solid ${PIXEL_NAVY}`,
    borderRadius: 6,
    boxShadow: `5px 5px 0 ${PIXEL_NAVY}`,
  },
};
