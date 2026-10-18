import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/minigame/catch-falling-item/',
  server: {
    host: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'],
    hmr: { clientPort: 443 },
  }
});