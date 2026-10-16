import { useEffect, useRef, useState } from 'react';
import { Engine } from '../game/engine';
import type { GameOverResult, HudState } from '../game/types';
import DebugPanel from './DebugPanel';

const DEBUG_ENABLED = new URLSearchParams(window.location.search).get('debug') === '1';

interface GameCanvasProps {
  shouldPlay: boolean;
  onStateChange: (state: HudState) => void;
  onGameOver: (result: GameOverResult) => void;
}

// App.tsx only ever mounts this once every asset is preloaded (see
// LoadingScreen.tsx), so the engine's very first idle-frame render already
// has every sprite available — no separate "assets just became ready,
// redraw" signal needed here.
export default function GameCanvas({ shouldPlay, onStateChange, onGameOver }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Only used to hand the engine instance to DebugPanel once it exists, and
  // to gate the start effect below — a one-time mount signal, not a
  // per-frame update, so it doesn't touch the "loop never touches React
  // state" rule.
  const [engine, setEngine] = useState<Engine | null>(null);

  // Kept current via refs rather than effect deps, so App.tsx's inline
  // handlers don't force the engine to be torn down and recreated every
  // render.
  const onStateChangeRef = useRef(onStateChange);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
    onGameOverRef.current = onGameOver;
  }, [onStateChange, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas);
    engine.onStateChange = (state) => onStateChangeRef.current(state);
    engine.onGameOver = (result) => onGameOverRef.current(result);

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    setEngine(engine);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
      setEngine(null);
    };
  }, []);

  // The engine draws its idle frame on construction but only runs the loop
  // once the start screen's button flips this to true.
  useEffect(() => {
    if (engine && shouldPlay) engine.start();
  }, [engine, shouldPlay]);

  return (
    <>
      <canvas ref={canvasRef} style={{ touchAction: 'none' }} />
      {DEBUG_ENABLED && engine && <DebugPanel engine={engine} />}
    </>
  );
}
