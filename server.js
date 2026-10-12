// Smart Joint Monitor backend (Node 18+, Express).
// Env vars (set in your host's dashboard, never in code):
//   DEVICE_TOKEN   secret the ESP32 sends when posting
//   VIEW_TOKEN     secret you type in the app's Device settings
//   ALLOWED_ORIGIN your site's address, e.g. https://yourname.github.io
const express = require('express');
const app = express();
app.use(express.json({ limit: '4kb' }));
const { DEVICE_TOKEN, VIEW_TOKEN, ALLOWED_ORIGIN = '*' } = process.env;
if (!DEVICE_TOKEN || !VIEW_TOKEN) { console.error('Set DEVICE_TOKEN and VIEW_TOKEN'); process.exit(1); }
let latest = null;

app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  req.method === 'OPTIONS' ? res.sendStatus(204) : next();
});

// ESP32 -> server
app.post('/ingest', (req, res) => {
  if (req.get('Authorization') !== 'Bearer ' + DEVICE_TOKEN) return res.sendStatus(401);
  const b = req.body || {};
  const ok = ['current_a', 'vdrop_mv', 'force_n', 'temp_c'].every(k => Number.isFinite(b[k]));
  if (!ok) return res.status(422).json({ error: 'invalid fields' });
  latest = { ...b, ts: Date.now() }; // server time, so stale data is detectable
  res.json({ ok: true });
});

// App -> server (polled)
app.get('/latest', (req, res) => {
  if (req.get('Authorization') !== 'Bearer ' + VIEW_TOKEN) return res.sendStatus(401);
  latest ? res.json(latest) : res.status(404).json({ error: 'no data yet' });
});

app.get('/', (req, res) => res.send('Smart Joint Monitor backend is running'));
app.listen(process.env.PORT || 3000);
