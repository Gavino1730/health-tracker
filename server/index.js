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
       ON CONFLICT (id) DO UPDATE
       SET state = EXCLUDED.state, updated_at = NOW()
       WHERE app_state.state IS DISTINCT FROM EXCLUDED.state`,
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
       ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, meta = EXCLUDED.meta
       WHERE photos.data IS DISTINCT FROM EXCLUDED.data
         OR photos.meta IS DISTINCT FROM EXCLUDED.meta`,
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
- foods (array of strings, distinct foods/items you can identify)
- description (string, 1 short sentence describing the meal)
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

// Health Q&A chat with structured app context
app.post('/api/ai/chat', async (req, res) => {
  if (!requireOpenAI(res)) return;
  try {
    const { question, context } = req.body;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'question is required' });
    }

    // Pull full persisted app state so chat always has complete context,
    // then merge with client state (client takes precedence for fresh local edits).
    const stateResult = await pool.query('SELECT state FROM app_state WHERE id = 1');
    const persistedState = stateResult.rows[0]?.state || {};
    const clientState = context && typeof context === 'object' ? context : {};
    const mergedState = { ...persistedState, ...clientState };

    const result = await askGPT([
      {
        role: 'system',
        content: 'You are a practical health assistant. Use only the provided context. Respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Answer this user health question based on the app context.

Return a JSON object with these keys:
- answer (string, concise and actionable)
- keyFindings (array of short strings, max 5)
- followUps (array of short strings, max 3 suggested next questions)

User question: ${question}
Context: ${JSON.stringify({
  mergedState,
  persistedState,
  clientState,
})}`,
      },
    ], { temperature: 0.2 });

    res.json(result);
  } catch (err) {
    console.error('/api/ai/chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Analyze a body photo with health context → AI body composition assessment
app.post('/api/ai/body/analyze', async (req, res) => {
  if (!requireOpenAI(res)) return;
  try {
    const { image, measurements, recentLogs } = req.body;
    if (!image) return res.status(400).json({ error: 'image is required' });

    const contextText = [
      measurements?.length
        ? `Measurement history: ${JSON.stringify(measurements.slice(-10))}`
        : '',
      recentLogs?.checkins?.length
        ? `Recent daily check-ins (last 7): ${JSON.stringify(recentLogs.checkins.slice(-7).map(c => ({ date: c.date, energy: c.energy, soreness: c.soreness, mood: c.mood })))}`
        : '',
      recentLogs?.workouts?.length
        ? `Recent workouts (last 7): ${JSON.stringify(recentLogs.workouts.slice(-7).map(w => ({ date: w.date, type: w.type, duration: w.duration })))}`
        : '',
      recentLogs?.sleep?.length
        ? `Recent sleep (last 7): ${JSON.stringify(recentLogs.sleep.slice(-7).map(s => ({ date: s.date, hours: s.hours, quality: s.quality })))}`
        : '',
    ].filter(Boolean).join('\n');

    const result = await askGPT([
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are an expert body composition coach and trainer. Analyze this body photo and health context, then return a JSON object with these keys:
- summary (string, 2-3 sentence overall assessment of what you see in the photo combined with their health data)
- estimatedBodyFat (string, a rough estimated range like "14-17%" or "20-24%", or "Unable to estimate" if the photo is unclear)
- muscleDefinition (string: "low" | "moderate" | "high" — based on visible muscle tone)
- posture (string, 1-2 sentence posture/structural observation)
- strengths (array of 2-3 short strings, positive physical attributes observed)
- recommendations (array of 3-5 short actionable strings, specific advice based on both photo and health data)
- trend (string, only if measurement history is provided: "improving" | "declining" | "stable" | "unknown")
- confidence (number 0-1, how clearly you can assess from the photo)

Note: This is for personal fitness tracking only. Be constructive and practical.
${contextText ? `\nHealth context:\n${contextText}` : ''}
Return ONLY valid JSON, no markdown.`,
          },
          {
            type: 'image_url',
            image_url: { url: image, detail: 'high' },
          },
        ],
      },
    ]);
    res.json(result);
  } catch (err) {
    console.error('/api/ai/body/analyze error:', err.message);
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

// ─── AI Workout Recommendation ───────────────────────────────────────────────

app.post('/api/ai/workout/recommend', async (req, res) => {
  if (!requireOpenAI(res)) return;
  try {
    const { profile, checkins, sleep, injuries, workouts, stretchSessions, today: todayStr } = req.body;

    const recentCheckins = (checkins || []).slice(-7);
    const recentSleep = (sleep || []).slice(-5);
    const recentWorkouts = (workouts || []).slice(-14).map(w => ({
      date: w.date, name: w.name, type: w.type, durationMins: w.durationMins,
    }));
    const activeInjuries = (injuries || []).filter(i => !i.resolvedAt);

    const result = await askGPT([
      {
        role: 'system',
        content: 'You are an expert personal trainer and health coach. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Generate a personalized workout recommendation for today based on this user's health data.

Today is: ${todayStr}

Return a JSON object with these exact keys:
- shouldTrain (boolean)
- trainingType (string: "full_session" | "light" | "rest" | "active_recovery")
- routineName (string, e.g. "Push Day", "Full Body")
- routineIcon (string, one emoji)
- timing (string, when to do it e.g. "Best done this morning before meals" or "Rest today — train tomorrow")
- reasoning (string, 2-3 sentences explaining the recommendation using their actual data)
- intensity (string: "high" | "moderate" | "low")
- estimatedDurationMins (number)
- exercises (array of objects, each with: name, sets (number), reps (string), restSeconds (number), notes (string — include why this rep scheme or any modifications for their situation))
- warnings (array of strings, exercises/movements to avoid given injuries or soreness)

Choose 5-8 exercises for a full session, 3-4 for light/active recovery, 0 for rest.
IMPORTANT: Modify exercises around active injuries. Explain modifications in the notes field.

Profile: ${JSON.stringify(profile)}
Recent check-ins (last 7 days): ${JSON.stringify(recentCheckins)}
Recent sleep: ${JSON.stringify(recentSleep)}
Recent workouts: ${JSON.stringify(recentWorkouts)}
Active injuries: ${JSON.stringify(activeInjuries)}`,
      },
    ], { temperature: 0.4 });

    res.json(result);
  } catch (err) {
    console.error('/api/ai/workout/recommend error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Stretch Recommendation ────────────────────────────────────────────────

app.post('/api/ai/stretch/recommend', async (req, res) => {
  if (!requireOpenAI(res)) return;
  try {
    const { profile, checkins, sleep, injuries, workouts, stretchSessions, today: todayStr } = req.body;

    const recentCheckins = (checkins || []).slice(-3);
    const recentSleep = (sleep || []).slice(-2);
    const recentWorkouts = (workouts || []).slice(-5).map(w => ({ date: w.date, name: w.name, type: w.type }));
    const activeInjuries = (injuries || []).filter(i => !i.resolvedAt);
    const recentStretches = (stretchSessions || []).slice(-5).map(s => ({
      date: s.startedAt?.slice(0, 10), routineName: s.routineName,
    }));

    const result = await askGPT([
      {
        role: 'system',
        content: 'You are an expert mobility coach and physical therapist. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Recommend a personalized stretching/mobility routine for today based on this user's health data.

Today is: ${todayStr}

Return a JSON object with these exact keys:
- routineName (string, descriptive name for this custom routine)
- routineIcon (string, one emoji)
- timing (string, e.g. "Do this now before your workout" or "Best done in the evening after dinner")
- reasoning (string, 2-3 sentences explaining why this specific routine based on their actual recent data)
- focusAreas (array of strings, muscle groups being targeted)
- exercises (array of objects, each with: name (string), duration (string or null e.g. "60s each side"), reps (string or null e.g. "10 slow reps"), notes (string — include coaching cues and why this exercise today))
- estimatedDurationMins (number)
- urgency (string: "high" | "moderate" | "low")

Target 6-10 exercises. Focus on muscle groups trained recently to aid recovery.
Consider active injuries — avoid aggravating them and include mobility work around them.

Profile: ${JSON.stringify(profile)}
Recent check-ins: ${JSON.stringify(recentCheckins)}
Recent sleep: ${JSON.stringify(recentSleep)}
Recent workouts: ${JSON.stringify(recentWorkouts)}
Recent stretch sessions: ${JSON.stringify(recentStretches)}
Active injuries: ${JSON.stringify(activeInjuries)}`,
      },
    ], { temperature: 0.4 });

    res.json(result);
  } catch (err) {
    console.error('/api/ai/stretch/recommend error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Live Workout Session Adjustment ─────────────────────────────────────────

app.post('/api/ai/workout/adjust', async (req, res) => {
  if (!requireOpenAI(res)) return;
  try {
    const { message, currentSession, appContext } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const activeInjuries = (appContext?.injuries || []).filter(i => !i.resolvedAt);

    const result = await askGPT([
      {
        role: 'system',
        content: 'You are a personal trainer helping someone mid-workout. Be concise, direct, and encouraging. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `The user is mid-workout and has a request. Help them adjust their remaining session.

Return a JSON object with these exact keys:
- reply (string, short conversational response 1-3 sentences — be direct and practical)
- modifySession (boolean, true if exercises should be changed)
- modifiedExercises (array or null — if modifySession is true, provide the complete new exercise list for remaining exercises: [{ name, sets (number), reps (string), restSeconds (number), notes (string) }])

Rules:
- Pain/injury mentioned → remove or replace that movement with a safe alternative, explain in reply
- "Harder"/"More"/"Increase" → increase sets or reps by 20-30%
- "Easier"/"Tired"/"Shorter" → reduce sets, lower reps, or remove an exercise
- Form or technique question → just answer in reply, set modifySession to false
- Keep the same muscle focus unless explicitly asked to change

Current session: ${JSON.stringify(currentSession)}
User's active injuries: ${JSON.stringify(activeInjuries)}
User's message: "${String(message).trim()}"`,
      },
    ], { temperature: 0.3 });

    res.json(result);
  } catch (err) {
    console.error('/api/ai/workout/adjust error:', err.message);
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
