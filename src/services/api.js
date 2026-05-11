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
 * Ask a health question with current app context.
 * @param {string} question
 * @param {object} context
 * @returns {{ answer:string, keyFindings:string[], followUps:string[] }}
 */
export async function askHealthChat(question, context) {
  return post('/api/ai/chat', { question, context: context || {} });
}

/**
 * Analyze a body photo with health context for AI body composition assessment.
 * @param {string} base64Image  – full data URL (data:image/jpeg;base64,...)
 * @param {object[]} measurements  – body measurement log history
 * @param {{ checkins:object[], workouts:object[], sleep:object[] }} recentLogs
 * @returns {{ summary:string, estimatedBodyFat:string, muscleDefinition:string, posture:string, strengths:string[], recommendations:string[], trend:string, confidence:number }}
 */
export async function analyzeBodyPhoto(base64Image, measurements = [], recentLogs = {}) {
  return post('/api/ai/body/analyze', { image: base64Image, measurements, recentLogs });
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
 * Analyze sleep patterns and lifestyle correlations.
 * @param {object} appState
 * @returns {{ headline, avgDuration, avgQuality, optimalBedtime, optimalWakeTime, factors, recommendations, trend }}
 */
export async function analyzeSleep(appState) {
  return post('/api/ai/sleep/analyze', {
    sleep: appState.sleep,
    checkins: appState.checkins,
    substances: appState.substances,
    workouts: appState.workouts,
  });
}

/**
 * Get AI insights on today's check-in scores compared to recent trends.
 * @param {object} checkin – today's scores
 * @param {object} appState – full state for context
 * @returns {{ headline:string, insights:string[], actionForToday:string, trendAlert:string|null, restDayRecommended:boolean }}
 */
export async function getCheckinInsights(checkin, appState) {
  return post('/api/ai/checkin/insights', {
    checkin,
    recentCheckins: appState.checkins,
    recentSleep: appState.sleep,
    recentWorkouts: appState.workouts,
    recentSubstances: appState.substances,
  });
}

/**
 * Analyze substance use correlations with sleep, recovery, and workout data.
 * @param {object} appState – full state for context
 * @returns {{ summary:string, correlations:object[], recommendations:string[], dataQuality:string }}
 */
export async function analyzeSubstanceCorrelations(appState) {
  return post('/api/ai/substance/correlations', {
    substances: appState.substances,
    sleep: appState.sleep,
    checkins: appState.checkins,
    workouts: appState.workouts,
    recovery: appState.recovery,
  });
}

/**
 * Get an AI-personalized workout recommendation based on full app state.
 * @param {object} appState – full context (profile, checkins, sleep, injuries, workouts, stretchSessions)
 * @returns {{ shouldTrain, trainingType, routineName, routineIcon, timing, reasoning, intensity, estimatedDurationMins, exercises, warnings }}
 */
export async function recommendWorkout(appState) {
  return post('/api/ai/workout/recommend', {
    profile: appState.profile,
    checkins: appState.checkins,
    sleep: appState.sleep,
    injuries: appState.injuries,
    workouts: appState.workouts,
    stretchSessions: appState.stretchSessions,
    today: new Date().toISOString().slice(0, 10),
  });
}

/**
 * Get an AI-personalized stretching routine recommendation.
 * @param {object} appState
 * @returns {{ routineName, routineIcon, timing, reasoning, focusAreas, exercises, estimatedDurationMins, urgency }}
 */
export async function recommendStretch(appState) {
  return post('/api/ai/stretch/recommend', {
    profile: appState.profile,
    checkins: appState.checkins,
    sleep: appState.sleep,
    injuries: appState.injuries,
    workouts: appState.workouts,
    stretchSessions: appState.stretchSessions,
    today: new Date().toISOString().slice(0, 10),
  });
}

/**
 * Live-adjust a workout session mid-session via chat.
 * @param {string} message – user's request
 * @param {object} currentSession – current session with exercises
 * @param {object} appContext – relevant app state (injuries, profile)
 * @returns {{ reply, modifySession, modifiedExercises }}
 */
export async function adjustWorkoutSession(message, currentSession, appContext) {
  return post('/api/ai/workout/adjust', { message, currentSession, appContext });
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
