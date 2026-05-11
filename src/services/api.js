/**
 * AI-Ready API stubs.
 *
 * Replace the bodies of these functions with real fetch/axios calls to your
 * backend endpoints. Each function documents what it receives and what shape
 * it should return.
 */

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json();
}

/**
 * Analyze a meal photo and return estimated macros.
 * @param {string} base64Image  – JPEG/PNG base64 encoded image
 * @param {string} notes        – optional user description
 * @returns {{ calories:number, protein:number, carbs:number, fats:number, confidence:number, description:string }}
 */
export async function analyzeNutritionPhoto(base64Image, notes = '') {
  // STUB – replace with real call:
  // return post('/api/nutrition/analyze', { image: base64Image, notes });
  return new Promise(resolve =>
    setTimeout(() => resolve({
      calories: Math.floor(Math.random() * 400 + 200),
      protein: Math.floor(Math.random() * 40 + 10),
      carbs: Math.floor(Math.random() * 60 + 20),
      fats: Math.floor(Math.random() * 30 + 5),
      confidence: 0.72,
      description: 'AI estimate (stub) – wire up REACT_APP_API_URL to get real results.',
    }), 800)
  );
}

/**
 * Estimate body composition changes from a series of progress photos.
 * @param {string[]} photoIds  – ordered array of photo IDs from IndexedDB
 * @param {{ weight:number, height:number }[]} measurements
 * @returns {{ muscleChangePct:number, fatChangePct:number, trend:'gaining'|'losing'|'maintaining', notes:string }}
 */
export async function estimateBodyComposition(photoIds, measurements) {
  // STUB – replace with real call:
  // return post('/api/body/estimate', { photoIds, measurements });
  return new Promise(resolve =>
    setTimeout(() => resolve({
      muscleChangePct: 0.8,
      fatChangePct: -1.2,
      trend: 'gaining',
      notes: 'AI estimate (stub) – wire up REACT_APP_API_URL to get real results.',
    }), 800)
  );
}

/**
 * Calculate a recovery score from recent logs.
 * @param {{ sleep:object, checkin:object, injuries:object[] }} payload
 * @returns {{ recoveryScore:number, sleepScore:number, mobilityScore:number, fatigueScore:number, notes:string }}
 */
export async function calculateRecoveryScore(payload) {
  // STUB – replace with real call:
  // return post('/api/recovery/score', payload);
  return new Promise(resolve =>
    setTimeout(() => resolve({
      recoveryScore: Math.floor(Math.random() * 30 + 60),
      sleepScore: Math.floor(Math.random() * 4 + 6),
      mobilityScore: Math.floor(Math.random() * 4 + 6),
      fatigueScore: Math.floor(Math.random() * 4 + 5),
      notes: 'AI estimate (stub) – wire up REACT_APP_API_URL to get real results.',
    }), 600)
  );
}

/**
 * Recommend a rehab protocol for an injury.
 * @param {{ location:string, severity:string, currentPhase:string, painLevel:number, daysElapsed:number }} injury
 * @returns {{ phaseName:string, exercises:{ name:string, sets:number, reps:string, notes:string }[], nextMilestone:string }}
 */
export async function recommendInjuryProtocol(injury) {
  // STUB – replace with real call:
  // return post('/api/injury/protocol', injury);
  return new Promise(resolve =>
    setTimeout(() => resolve({
      phaseName: 'Active Recovery',
      exercises: [
        { name: 'Gentle ROM circles', sets: 2, reps: '10 each direction', notes: 'Pain-free range only' },
        { name: 'Isometric hold', sets: 3, reps: '30s', notes: 'No joint load' },
      ],
      nextMilestone: 'Full ROM without pain for 3 consecutive days',
    }), 700)
  );
}

/**
 * Detect patterns and correlations across all health metrics.
 * @param {{ checkins:object[], sleep:object[], workouts:object[], nutrition:object[], substances:object[] }} logs
 * @returns {{ correlations: { metric1:string, metric2:string, strength:number, direction:'positive'|'negative', summary:string }[] }}
 */
export async function detectPatterns(logs) {
  // STUB – replace with real call:
  // return post('/api/patterns/detect', logs);
  return new Promise(resolve =>
    setTimeout(() => resolve({
      correlations: [
        { metric1: 'Sleep Duration', metric2: 'Energy', strength: 0.74, direction: 'positive', summary: 'More sleep → higher energy next day' },
        { metric1: 'Workout Volume', metric2: 'Soreness', strength: 0.68, direction: 'positive', summary: 'High workout volume correlates with next-day soreness' },
        { metric1: 'Caffeine (late)', metric2: 'Sleep Quality', strength: 0.61, direction: 'negative', summary: 'Late caffeine reduces sleep quality' },
      ],
    }), 900)
  );
}

/**
 * Generate a custom workout plan.
 * @param {{ goal:string, daysPerWeek:number, equipment:string[], focusAreas:string[], duration:number }} preferences
 * @returns {{ name:string, days: { name:string, exercises: { name:string, sets:number, reps:string, restSeconds:number, notes:string }[] }[] }}
 */
export async function generateWorkoutPlan(preferences) {
  // STUB – replace with real call:
  // return post('/api/workout/generate', preferences);
  return new Promise(resolve =>
    setTimeout(() => resolve({
      name: `Custom ${preferences.goal} Plan`,
      days: [
        {
          name: 'Day 1 – Push',
          exercises: [
            { name: 'Push-up', sets: 3, reps: '12-15', restSeconds: 60, notes: 'Full range of motion' },
            { name: 'Shoulder Press', sets: 3, reps: '10', restSeconds: 90, notes: '' },
            { name: 'Tricep Dip', sets: 3, reps: '12', restSeconds: 60, notes: '' },
          ],
        },
        {
          name: 'Day 2 – Pull',
          exercises: [
            { name: 'Pull-up', sets: 3, reps: '8', restSeconds: 90, notes: 'Assist band if needed' },
            { name: 'Bent Row', sets: 3, reps: '10', restSeconds: 90, notes: '' },
            { name: 'Bicep Curl', sets: 3, reps: '12', restSeconds: 60, notes: '' },
          ],
        },
      ],
    }), 1000)
  );
}
