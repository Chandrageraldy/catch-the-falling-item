import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = '/minigame/catch-falling-item';
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = process.env.PORT || 5573;

const app = express();

app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

app.use((req, res, next) => {
  if (req.path === BASE) return res.redirect(301, `${BASE}/`);
  next();
});

app.use(
  `${BASE}/assets`,
  express.static(path.join(DIST, 'assets'), {
    setHeaders: (res, filePath) => {
      const hashed = /-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/.test(path.basename(filePath));
      res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  })
);

app.use(
  BASE,
  express.static(DIST, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

app.use(BASE, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(DIST, 'index.html'));
});

app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, '0.0.0.0');
