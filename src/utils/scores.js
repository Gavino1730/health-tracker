/**
 * Local score calculation utilities.
 * These are used as fallbacks / preview scores before the AI endpoint is wired in.
 */

/**
 * Calculate a recovery score (0-100) from check-in + sleep data.
 * @param {{ soreness:number, stress:number, energy:number }} checkin  – 1-10 scale
 * @param {{ quality:number, durationMins:number }} sleep
 * @param {number} mobilityScore – 1-10
 */
export function calculateRecoveryScore({ checkin = {}, sleep = {}, mobilityScore = 5 } = {}) {
  const { soreness = 5, stress = 5, energy = 5 } = checkin;
  const { quality = 5, durationMins = 420 } = sleep;

  // Invert soreness & stress (high = worse recovery)
  const sorenessScore = 11 - soreness; // 1-10 inverted
  const stressScore   = 11 - stress;
  const sleepQuality  = quality;
  const sleepDuration = Math.min(durationMins / 480, 1) * 10; // 8h = 10

  const raw = (
    sorenessScore  * 0.25 +
    stressScore    * 0.15 +
    energy         * 0.20 +
    sleepQuality   * 0.20 +
    sleepDuration  * 0.10 +
    mobilityScore  * 0.10
  );

  // raw is on a ~1-10 scale, normalize to 0-100
  return Math.round(Math.max(0, Math.min(100, (raw / 10) * 100)));
}

/**
 * Calculate a sleep score (1-10) from duration and quality.
 */
export function calculateSleepScore({ durationMins = 0, quality = 5 } = {}) {
  const idealMins = 480; // 8 hours
  const durationFactor = Math.min(durationMins / idealMins, 1.1); // slight bonus for > 8h
  const raw = (durationFactor * 5 + quality * 0.5);
  return Math.round(Math.max(1, Math.min(10, raw)));
}

/**
 * Calculate a fatigue/readiness score (1-10).
 * High recovery → high readiness.
 */
export function calculateFatigueScore(recoveryScore) {
  // recoveryScore is 0-100
  return Math.round(Math.max(1, Math.min(10, recoveryScore / 10)));
}

/**
 * Compute a simple Pearson-like correlation between two numeric arrays.
 * Returns a value in [-1, 1].
 */
export function pearsonCorrelation(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const meanX = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num  += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  return denom === 0 ? 0 : num / denom;
}

export function scoreColor(score, max = 10) {
  const pct = score / max;
  if (pct >= 0.8) return 'text-emerald-400';
  if (pct >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
}

export function recoveryColor(score) {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}
