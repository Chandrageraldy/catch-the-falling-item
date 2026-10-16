import type { EndReason } from '../game/types';

// webview_flutter's addJavaScriptChannel('gameBridge') injects this global
// when the page runs inside the host app. Undefined in a desktop browser.
declare global {
  interface Window {
    gameBridge?: {
      postMessage: (message: string) => void;
    };
  }
}

interface GameReadyMessage {
  type: 'GAME_READY';
  v: 1;
}

interface GameStartedMessage {
  type: 'GAME_STARTED';
  v: 1;
}

interface GameOverMessage {
  type: 'GAME_OVER';
  v: 1;
  payload: {
    score: number;
    misses: number;
    itemsCaught: number;
    // From the engine's simulated clock (GameOverResult.duration), not
    // wall-clock time — see engine.ts's fixed-timestep accumulator.
    durationMs: number;
    endReason: EndReason;
  };
}

interface CloseRequestedMessage {
  type: 'CLOSE_REQUESTED';
  v: 1;
}

interface PlayRequestedMessage {
  type: 'PLAY_REQUESTED';
  v: 1;
}

interface StartRunMessage {
  type: 'START_RUN';
  v: 1;
}

interface StartRejectedMessage {
  type: 'START_REJECTED';
  v: 1;
  reason: 'no_selection' | 'no_ticket' | 'error';
}

export type HostMessage = StartRunMessage | StartRejectedMessage;

type BridgeMessage =
  | PlayRequestedMessage
  | GameReadyMessage
  | GameStartedMessage
  | GameOverMessage
  | CloseRequestedMessage;

// The channel only carries strings, so the message is serialized here.
// The optional chain keeps the same build testable in a desktop browser.
function send(message: BridgeMessage): void {
  console.log('[bridge]', JSON.stringify(message));
  window.gameBridge?.postMessage(JSON.stringify(message));
}

let gameOverSent = false;
let gameReadySent = false;

export function isInHostApp(): boolean {
  return typeof window.gameBridge !== 'undefined';
}

export function onHostMessage(handler: (message: HostMessage) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<HostMessage>).detail);
  window.addEventListener('flutterMessage', listener);
  return () => window.removeEventListener('flutterMessage', listener);
}

export function sendPlayRequested(): void {
  send({ type: 'PLAY_REQUESTED', v: 1 });
}

export function sendGameReady(): void {
  if (gameReadySent) return;
  gameReadySent = true;
  send({ type: 'GAME_READY', v: 1 });
}

export function sendGameStarted(): void {
  gameOverSent = false;
  send({ type: 'GAME_STARTED', v: 1 });
}

export function sendGameOver(payload: GameOverMessage['payload']): void {
  if (gameOverSent) return;
  gameOverSent = true;
  send({ type: 'GAME_OVER', v: 1, payload });
}

export function sendCloseRequested(): void {
  send({ type: 'CLOSE_REQUESTED', v: 1 });
}