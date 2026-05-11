import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate } from '../../utils/dateUtils';
import ScoreInput from '../shared/ScoreInput';
import TrendChart from '../shared/TrendChart';
import { calculateRecoveryScore, calculateSleepScore, calculateFatigueScore, recoveryColor, scoreColor } from '../../utils/scores';
import { calculateRecoveryScore as aiRecoveryScore } from '../../services/api';

export default function RecoveryDashboard() {
  const { state, dispatch } = useApp();
  const todayStr = today();

  const [mobilityScore, setMobilityScore] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [saved, setSaved] = useState(false);

  const todayCheckin = state.checkins.find(c => c.date === todayStr);
  const todaySleep   = state.sleep.find(s => s.date === todayStr)
    || [...state.sleep].sort((a, b) => b.date.localeCompare(a.date))[0];
  const todayRecovery = state.recovery.find(r => r.date === todayStr);

  // Local score calculation
  const localRecovery = calculateRecoveryScore({
    checkin: todayCheckin || {},
    sleep: todaySleep || {},
    mobilityScore: mobilityScore || todayRecovery?.mobilityScore || 5,
  });
  const sleepScore = todaySleep ? calculateSleepScore(todaySleep) : (todayRecovery?.sleepScore || null);
  const fatigueScore = calculateFatigueScore(todayRecovery?.recoveryScore || localRecovery);

  async function handleAIScore() {
    setAiLoading(true);
    try {
      const result = await aiRecoveryScore({
        sleep: todaySleep || {},
        checkin: todayCheckin || {},
        injuries: state.injuries.filter(i => i.status !== 'healed'),
      });
      setAiResult(result);
    } catch {}
    setAiLoading(false);
  }

  function handleSave() {
    const payload = {
      date: todayStr,
      recoveryScore: aiResult?.recoveryScore || localRecovery,
      sleepScore: aiResult?.sleepScore || sleepScore || 5,
      mobilityScore: aiResult?.mobilityScore || mobilityScore || 5,
      fatigueScore: aiResult?.fatigueScore || fatigueScore,
      aiUsed: !!aiResult,
      notes: aiResult?.notes || '',
      updatedAt: isoNow(),
    };
    dispatch({ type: ACTIONS.ADD_RECOVERY, payload });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Chart data
  const last14 = [...Array(14)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });

  const chartData = last14.map(date => {
    const r = state.recovery.find(x => x.date === date);
    return { date, Recovery: r?.recoveryScore || null, Sleep: r?.sleepScore ? r.sleepScore * 10 : null, Fatigue: r?.fatigueScore ? r.fatigueScore * 10 : null };
  }).filter(d => d.Recovery !== null);

  const displayScore = todayRecovery?.recoveryScore ?? localRecovery;

  return (
    <div>
      <h1 className="section-title">Recovery Dashboard</h1>

      {/* Today's scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Recovery', value: displayScore, unit: '/100', color: recoveryColor(displayScore) },
          { label: 'Sleep Score', value: sleepScore, unit: '/10', color: sleepScore ? scoreColor(sleepScore) : 'text-slate-500' },
          { label: 'Mobility', value: todayRecovery?.mobilityScore || mobilityScore, unit: '/10', color: scoreColor(todayRecovery?.mobilityScore || mobilityScore || 0) },
          { label: 'Readiness', value: fatigueScore, unit: '/10', color: scoreColor(fatigueScore) },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-extrabold ${color}`}>{value ?? '–'}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
            <p className="text-xs text-slate-600">{unit}</p>
          </div>
        ))}
      </div>

      {/* Score input */}
      {!todayRecovery && (
        <div className="card mb-5">
          <h2 className="font-bold text-slate-200 mb-3">Log Today's Mobility Score</h2>
          <p className="text-xs text-slate-400 mb-2">Rate your joint mobility / range of motion today (1 = stiff/painful, 10 = full range)</p>
          <ScoreInput value={mobilityScore} onChange={setMobilityScore} />
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="btn-primary flex-1">Save Recovery Scores</button>
            <button onClick={handleAIScore} disabled={aiLoading} className="btn-secondary flex-1">
              {aiLoading ? '🔄 Calculating...' : '🤖 AI Score'}
            </button>
          </div>
          {saved && <p className="text-emerald-400 text-sm text-center mt-2">✓ Saved!</p>}
          {aiResult && (
            <div className="mt-3 p-3 bg-brand-900/30 border border-brand-800 rounded-xl text-sm">
              <p className="font-semibold text-brand-300 mb-1">AI Analysis</p>
              <p className="text-slate-400 text-xs">{aiResult.notes}</p>
            </div>
          )}
        </div>
      )}

      {todayRecovery && (
        <div className="card mb-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-emerald-400">✓ Recovery logged today</p>
            <p className="text-xs text-slate-400">Recovery: {todayRecovery.recoveryScore}/100 · Sleep: {todayRecovery.sleepScore}/10 · Mobility: {todayRecovery.mobilityScore}/10</p>
          </div>
          <button onClick={() => dispatch({ type: ACTIONS.UPDATE_RECOVERY, payload: { ...todayRecovery, mobilityScore: mobilityScore || todayRecovery.mobilityScore } })} className="btn-secondary text-sm py-1 px-3">Update</button>
        </div>
      )}

      {/* Trend chart */}
      {chartData.length > 1 && (
        <div className="card mb-5">
          <h2 className="font-semibold text-slate-200 mb-3">Recovery Trends (last 14 days)</h2>
          <TrendChart
            data={chartData}
            series={[{ key: 'Recovery', label: 'Recovery Score' }, { key: 'Sleep', label: 'Sleep Score ×10' }]}
          />
        </div>
      )}

      {/* Score breakdown legend */}
      <div className="card">
        <h2 className="font-bold text-slate-200 mb-3">How Scores Are Calculated</h2>
        <div className="space-y-2 text-sm text-slate-400">
          <div className="flex items-start gap-2">
            <span className="text-brand-400 font-bold shrink-0">Recovery (0-100)</span>
            <span>Weighted blend of: soreness (25%), energy (20%), sleep quality (20%), sleep duration (10%), stress (15%), mobility (10%)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold shrink-0">Sleep (1-10)</span>
            <span>Sleep duration vs 8h ideal + quality rating</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 font-bold shrink-0">Readiness (1-10)</span>
            <span>Derived from recovery score / 10</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Connect an AI endpoint via REACT_APP_API_URL for enhanced scoring.</p>
        </div>
      </div>

      {/* History */}
      {state.recovery.length > 0 && (
        <div className="mt-6">
          <h2 className="font-bold text-slate-300 mb-3">Recovery History</h2>
          <div className="space-y-2">
            {[...state.recovery].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14).map(r => (
              <div key={r.date} className="card flex items-center justify-between text-sm">
                <span className="text-slate-400">{formatDate(r.date)}</span>
                <div className="flex gap-3">
                  <span className={recoveryColor(r.recoveryScore)}>{r.recoveryScore}/100</span>
                  <span className="text-slate-400">Sleep: {r.sleepScore}/10</span>
                  <span className="text-slate-400">Mob: {r.mobilityScore}/10</span>
                  {r.aiUsed && <span className="text-xs text-brand-400">🤖</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
