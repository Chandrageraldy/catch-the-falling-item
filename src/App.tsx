import { useCallback, useEffect, useState } from 'react';
import { isInHostApp, onHostMessage, sendGameOver, sendGameReady, sendGameStarted, sendPlayRequested } from './bridge/flutter';
import GameCanvas from './components/GameCanvas';
import GameOverModal from './components/GameOverModal';
import Hud from './components/Hud';
import LoadingScreen from './components/LoadingScreen';
import StartScreen from './components/StartScreen';
import { preloadAssets } from './game/assets';
import { tunables } from './game/difficulty';
import type { GameOverResult, HudState } from './game/types';

type Phase = 'start' | 'playing' | 'gameOver';

function initialHud(): HudState {
  return { score: 0, lives: tunables.maxLives };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('start');
  const [hud, setHud] = useState<HudState>(initialHud);
  const [result, setResult] = useState<GameOverResult | null>(null);
  // Bumped on "Play Again" to force GameCanvas to remount with a fresh
  // Engine instance rather than adding an Engine.reset() nothing else needs.
  const [runKey, setRunKey] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [waitingForHost, setWaitingForHost] = useState(false);

  useEffect(() => {
    if (assetsReady) sendGameReady();
  }, [assetsReady]);

  useEffect(() => {
    return onHostMessage((message) => {
      if (message.type === 'START_RUN') {
        if (!waitingForHost) return;
        setWaitingForHost(false);
        sendGameStarted();
        setPhase('playing');
      } else if (message.type === 'START_REJECTED') {
        setWaitingForHost(false);
      }
    });
  }, [waitingForHost]);

  // A sprite that finishes decoding mid-run causes a visible hitch, and on
  // slow mobile data the first item to spawn just wouldn't draw yet — so
  // nothing else in the app (canvas included, see GameCanvas.tsx) mounts
  // until every registered image is decoded, not just requested.
  useEffect(() => {
    let cancelled = false;
    preloadAssets().then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stable across renders so GameCanvas's engine-owning effect never sees
  // these as changed and tears down the engine unnecessarily.
  const handleStateChange = useCallback((state: HudState) => setHud(state), []);
  const handleGameOver = useCallback((gameOverResult: GameOverResult) => {
    setResult(gameOverResult);
    setPhase('gameOver');
    sendGameOver({
      score: gameOverResult.score,
      misses: gameOverResult.misses,
      itemsCaught: gameOverResult.itemsCaught,
      durationMs: gameOverResult.duration,
      endReason: gameOverResult.endReason,
    });
  }, []);

  const handleStart = () => {
    if (isInHostApp()) {
      sendPlayRequested();
      setWaitingForHost(true);
      return;
    }
    sendGameStarted();
    setPhase('playing');
  };

  const handlePlayAgain = () => {
    setHud(initialHud());
    setResult(null);
    setRunKey((key) => key + 1);
    sendGameStarted();
    setPhase('playing');
  };

  // Nothing else — canvas included — mounts until every asset has decoded,
  // so the flat-color/placeholder flash that used to show through the start
  // screen can't happen: there's nothing behind LoadingScreen to flash.
  if (!assetsReady) {
    return <LoadingScreen />;
  }

  return (
    <>
      <GameCanvas
        key={runKey}
        shouldPlay={phase === 'playing'}
        onStateChange={handleStateChange}
        onGameOver={handleGameOver}
      />
      {phase === 'playing' && <Hud score={hud.score} lives={hud.lives} />}
      {phase === 'start' && <StartScreen onStart={handleStart} disabled={waitingForHost} />}
      {phase === 'gameOver' && result && !isInHostApp() && <GameOverModal result={result} onPlayAgain={handlePlayAgain} />}
    </>
  );
}