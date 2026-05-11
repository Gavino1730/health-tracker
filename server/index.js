const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 50mb limit to accommodate base64 progress photos
app.use(express.json({ limit: '50mb' }));

// ─── DB Init ──────────────────────────────────────────────────────────────────

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      state JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO app_state (id, state) VALUES (1, '{}') ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      meta JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// ─── State API ────────────────────────────────────────────────────────────────

app.get('/api/state', async (req, res) => {
  try {
    const result = await pool.query('SELECT state FROM app_state WHERE id = 1');
    res.json(result.rows[0]?.state || {});
  } catch (err) {
    console.error('GET /api/state error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/state', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO app_state (id, state, updated_at) VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET state = $1, updated_at = NOW()`,
      [req.body]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/state error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Photos API ───────────────────────────────────────────────────────────────

app.post('/api/photos', async (req, res) => {
  try {
    const { id, data, meta } = req.body;
    await pool.query(
      `INSERT INTO photos (id, data, meta) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET data = $2, meta = $3`,
      [id, data, meta || {}]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/photos error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/photos/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT data, meta FROM photos WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/photos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM photos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/photos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, meta FROM photos ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve React build ────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, '../build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

initDb()
  .then(() => {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Health Tracker server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
