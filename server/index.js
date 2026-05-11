const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const OpenAI = require('openai');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function requireOpenAI(res) {
  if (!openai) {
    res.status(503).json({ error: 'OPENAI_API_KEY is not set on the server.' });
    return false;
  }
  return true;
}

// Ask GPT for a JSON response. Throws on failure.
async function askGPT(messages, { model = 'gpt-4o', temperature = 0.3 } = {}) {
  const completion = await openai.chat.completions.create({
    model,
    temperature,
    response_format: { type: 'json_object' },
    messages,
  });
  return JSON.parse(completion.choices[0].message.content);
}

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

// ─── AI Routes ────────────────────────────────────────────────────────────────

// Analyze a meal photo → estimated macros
app.post('/api/ai/nutrition/analyze', async (req, res) => {
  if (!requireOpenAI(res)) return;
  try {
    const { image, notes } = req.body;
    // image is a base64 data URL (data:image/jpeg;base64,...)
    const result = await askGPT([
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a nutrition expert. Analyze this meal photo and return a JSON object with these keys:
- calories (number, total kcal)
- protein (number, grams)
- carbs (number, grams)
- fats (number, grams)
- confidence (number, 0-1 how confident you are)
- description (string, brief description of what you see)
${notes ? `User note: ${notes}` : ''}
Return ONLY valid JSON, no markdown.`,
          },
          {
            type: 'image_url',
            image_url: { url: image, detail: 'low' },
          },
        ],
      },
    ]);
    res.json(result);
  } catch (err) {
    console.error('/api/ai/nutrition/analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Calculate recovery score from sleep + check-in data
app.post('/api/ai/recovery/score', async (req, res) => {
  if (!requireOpenAI(res)) return;
  try {
    const { sleep, checkin, injuries } = req.body;
    const result = await askGPT([
      {
        role: 'system',
        content: 'You are a sports science recovery analyst. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Analyze this athlete recovery data and return a JSON object with these keys:
- recoveryScore (number 0-100, overall recovery)
- sleepScore (number 1-10)
- mobilityScore (number 1-10, estimate based on soreness)
- fatigueScore (number 1-10, 10 = fully recovered, 1 = exhausted)
- notes (string, 1-2 sentence actionable insight)

Sleep data: ${JSON.stringify(sleep)}
Check-in data: ${JSON.stringify(checkin)}
Active injuries: ${JSON.stringify(injuries)}`,
      },
    ]);
    res.json(result);
  } catch (err) {
    console.error('/api/ai/recovery/score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Recommend a rehab protocol for an injury
app.post('/api/ai/injury/protocol', async (req, res) => {
  if (!requireOpenAI(res)) return;
  try {
    const injury = req.body;
    const result = await askGPT([
      {
        role: 'system',
        content: 'You are a physical therapist and sports medicine expert. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Create a rehab protocol for this injury and return a JSON object with these keys:
- phaseName (string, name of current rehab phase)
- exercises (array of objects with: name, sets (number), reps (string), notes (string))
- nextMilestone (string, what to achieve before progressing)

Injury details: ${JSON.stringify(injury)}

Include 3-5 appropriate exercises for the current phase. Be specific to the injury location and severity.`,
      },
    ]);
    res.json(result);
  } catch (err) {
    console.error('/api/ai/injury/protocol error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Detect patterns and correlations across health metrics
app.post('/api/ai/patterns/detect', async (req, res) => {
  if (!requireOpenAI(res)) return;
  try {
    const { checkins, sleep, workouts, nutrition, substances } = req.body;

    // Summarize data so we don't blow the context window
    const summary = {
      checkinCount: checkins.length,
      recentCheckins: checkins.slice(-14),
      sleepCount: sleep.length,
      recentSleep: sleep.slice(-14),
      workoutCount: workouts.length,
      recentWorkouts: workouts.slice(-14).map(w => ({ date: w.date, type: w.type, duration: w.duration })),
      substanceCount: substances.length,
      recentSubstances: substances.slice(-14).map(s => ({ date: s.date, subType: s.subType, amount: s.amount })),
    };

    const result = await askGPT([
      {
        role: 'system',
        content: 'You are a health data analyst. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Analyze this health tracking data and identify real correlations. Return a JSON object with a single key:
- correlations (array of objects, each with: metric1 (string), metric2 (string), strength (number 0-1), direction ("positive" or "negative"), summary (string, one sentence insight))

Find 3-5 genuine correlations from the actual data. If data is limited, note that in the summary. Be specific and actionable.

Data summary: ${JSON.stringify(summary)}`,
      },
    ]);
    res.json(result);
  } catch (err) {
    console.error('/api/ai/patterns/detect error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Estimate body composition trend from measurements
app.post('/api/ai/body/estimate', async (req, res) => {
  if (!requireOpenAI(res)) return;
  try {
    const { measurements } = req.body;
    const result = await askGPT([
      {
        role: 'system',
        content: 'You are a body composition expert. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Analyze these body measurement logs and return a JSON object with these keys:
- muscleChangePct (number, estimated % muscle change, positive = gain)
- fatChangePct (number, estimated % fat change, negative = loss)
- trend (string: "gaining" | "losing" | "maintaining" | "recomping")
- notes (string, 2-3 sentence analysis with actionable insight)

Measurements over time: ${JSON.stringify(measurements)}`,
      },
    ]);
    res.json(result);
  } catch (err) {
    console.error('/api/ai/body/estimate error:', err.message);
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
