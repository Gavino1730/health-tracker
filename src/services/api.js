/**
 * AI API — calls the Express server which forwards to OpenAI.
 * Set OPENAI_API_KEY in your Railway environment variables.
 */

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Analyze a meal photo and return estimated macros.
 * @param {string} base64Image  – full data URL (data:image/jpeg;base64,...)
 * @param {string} notes        – optional user description
 * @returns {{ calories:number, protein:number, carbs:number, fats:number, confidence:number, description:string }}
 */
export async function analyzeNutritionPhoto(base64Image, notes = '') {
  return post('/api/ai/nutrition/analyze', { image: base64Image, notes });
}

/**
 * Calculate a recovery score from recent logs.
 * @param {{ sleep:object, checkin:object, injuries:object[] }} payload
 * @returns {{ recoveryScore:number, sleepScore:number, mobilityScore:number, fatigueScore:number, notes:string }}
 */
export async function calculateRecoveryScore(payload) {
  return post('/api/ai/recovery/score', payload);
}

/**
 * Recommend a rehab protocol for an injury.
 * @param {{ location:string, severity:string, currentPhase:string, painLevel:number, daysElapsed:number }} injury
 * @returns {{ phaseName:string, exercises:{ name:string, sets:number, reps:string, notes:string }[], nextMilestone:string }}
 */
export async function recommendInjuryProtocol(injury) {
  return post('/api/ai/injury/protocol', injury);
}

/**
 * Detect patterns and correlations across all health metrics.
 * @param {{ checkins:object[], sleep:object[], workouts:object[], nutrition:object[], substances:object[] }} logs
 * @returns {{ correlations: { metric1:string, metric2:string, strength:number, direction:string, summary:string }[] }}
 */
export async function detectPatterns(logs) {
  return post('/api/ai/patterns/detect', logs);
}

/**
 * Estimate body composition changes from measurement history.
 * @param {object[]} measurements
 * @returns {{ muscleChangePct:number, fatChangePct:number, trend:string, notes:string }}
 */
export async function estimateBodyComposition(photoIds, measurements) {
  return post('/api/ai/body/estimate', { measurements });
}

/**
 * Generate a custom workout plan (not wired to AI — uses template library).
 */
export async function generateWorkoutPlan(preferences) {
  return {
    name: `Custom ${preferences.goal || 'Fitness'} Plan`,
    days: [],
  };
}
