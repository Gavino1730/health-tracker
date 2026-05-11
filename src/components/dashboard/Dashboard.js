import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { today, formatDate, last7Days } from '../../utils/dateUtils';
import { calculateRecoveryScore, calculateSleepScore, recoveryColor, scoreColor } from '../../utils/scores';
import { detectPatterns } from '../../services/api';
import TrendChart from '../shared/TrendChart';

function MetricCard({ label, value, unit, color, to }) {
  const content = (
    <div className="card text-center hover:border hover:border-brand-600 transition-all">
      <p className={`text-3xl font-extrabold ${color || 'text-slate-100'}`}>{value ?? '–'}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
      {unit && <p className="text-xs text-slate-600">{unit}</p>}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Dashboard() {
  const { state } = useApp();
  const todayStr = today();

  const todayCheckin  = state.checkins.find(c => c.date === todayStr);
  const todaySleep    = [...state.sleep].sort((a, b) => b.date.localeCompare(a.date))[0];
  const todayRecovery = state.recovery.find(r => r.date === todayStr);
  const todayWater    = state.water.filter(w => w.createdAt?.startsWith(todayStr)).reduce((s, w) => s + w.amount, 0);
  const todayWorkouts = state.workouts.filter(w => w.date === todayStr);
  const todayMeals    = state.meals.filter(m => m.date === todayStr);
  const activeInjuries = state.injuries.filter(i => i.status !== 'Healed');

  // Computed scores
  const localRecovery = calculateRecoveryScore({ checkin: todayCheckin || {}, sleep: todaySleep || {} });
  const sleepScore = todaySleep ? calculateSleepScore(todaySleep) : null;
  const displayRecovery = todayRecovery?.recoveryScore ?? (todayCheckin ? localRecovery : null);

  // Pattern detection
  const [patterns, setPatterns] = useState(null);
  const [patternsLoading, setPatternsLoading] = useState(false);

  async function loadPatterns() {
    setPatternsLoading(true);
    try {
      const result = await detectPatterns({
        checkins: state.checkins,
        sleep: state.sleep,
        workouts: state.workouts,
        nutrition: state.meals,
        substances: state.substances,
      });
      setPatterns(result.correlations);
    } catch {}
    setPatternsLoading(false);
  }

  // Chart data – last 7 days
  const days = last7Days();
  const trendData = days.map(date => {
    const c = state.checkins.find(x => x.date === date);
    const s = state.sleep.find(x => x.date === date);
    const r = state.recovery.find(x => x.date === date);
    return {
      date,
      Energy: c?.energy || null,
      Mood: c?.mood || null,
      Sleep: s ? +(s.durationMins / 60).toFixed(1) : null,
      Recovery: r ? Math.round(r.recoveryScore / 10) : null, // scale to 1-10 for chart
    };
  }).filter(d => Object.values(d).some(v => v !== null && v !== d.date));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-400">{formatDate(todayStr, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link to="/checkin" className="btn-primary text-sm py-2">
          {todayCheckin ? '✓ Edit Check-in' : '+ Check-in'}
        </Link>
      </div>

      {/* Today's metrics */}
      <h2 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-3">Today</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Recovery" value={displayRecovery} unit="/100" color={displayRecovery !== null ? recoveryColor(displayRecovery) : 'text-slate-500'} to="/recovery" />
        <MetricCard label="Sleep" value={sleepScore} unit="/10" color={sleepScore !== null ? scoreColor(sleepScore) : 'text-slate-500'} to="/sleep" />
        <MetricCard label="Energy" value={todayCheckin?.energy} unit="/10" color={todayCheckin?.energy ? scoreColor(todayCheckin.energy) : 'text-slate-500'} to="/checkin" />
        <MetricCard label="Water" value={todayWater ? `${(todayWater / 1000).toFixed(1)}L` : null} color="text-brand-400" to="/water" />
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Mood" value={todayCheckin?.mood} unit="/10" color={todayCheckin?.mood ? scoreColor(todayCheckin.mood) : 'text-slate-500'} />
        <MetricCard label="Soreness" value={todayCheckin?.soreness} unit="/10" color={todayCheckin?.soreness ? (todayCheckin.soreness <= 3 ? 'text-emerald-400' : todayCheckin.soreness <= 6 ? 'text-yellow-400' : 'text-red-400') : 'text-slate-500'} />
        <MetricCard label="Stress" value={todayCheckin?.stress} unit="/10" color={todayCheckin?.stress ? (todayCheckin.stress <= 3 ? 'text-emerald-400' : todayCheckin.stress <= 6 ? 'text-yellow-400' : 'text-red-400') : 'text-slate-500'} />
        <MetricCard label="Clarity" value={todayCheckin?.clarity} unit="/10" color={todayCheckin?.clarity ? scoreColor(todayCheckin.clarity) : 'text-slate-500'} />
      </div>

      {/* Quick links */}
      <h2 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-3">Quick Log</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {[
          { to: '/checkin', icon: '✅', label: 'Check-in' },
          { to: '/sleep', icon: '😴', label: 'Sleep' },
          { to: '/nutrition', icon: '🥗', label: 'Meal' },
          { to: '/workout', icon: '🏋️', label: 'Workout' },
          { to: '/water', icon: '💧', label: 'Water' },
          { to: '/stretching', icon: '🧘', label: 'Stretch' },
          { to: '/ski', icon: '⛷️', label: 'Ski Day' },
          { to: '/substances', icon: '🍺', label: 'Substances' },
        ].map(item => (
          <Link key={item.to} to={item.to} className="flex items-center gap-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-xl px-3 py-2.5 transition-colors">
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm font-semibold text-slate-300">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Trend chart */}
      {trendData.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-bold text-slate-200 mb-3">7-Day Trends</h2>
          <TrendChart
            data={trendData}
            series={[
              { key: 'Energy', label: 'Energy' },
              { key: 'Mood', label: 'Mood' },
              { key: 'Sleep', label: 'Sleep (hrs)' },
              { key: 'Recovery', label: 'Recovery ×10' },
            ]}
          />
        </div>
      )}

      {/* Active injuries */}
      {activeInjuries.length > 0 && (
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-200">🩹 Active Injuries</h2>
            <Link to="/injury" className="text-sm text-brand-400 hover:text-brand-300">View all →</Link>
          </div>
          <div className="space-y-2">
            {activeInjuries.map(inj => (
              <div key={inj.id} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-200">{inj.location}</span>
                <div className="flex gap-2">
                  <span className="badge bg-red-900/40 text-red-400">{inj.severity}</span>
                  <span className="badge bg-surface-700 text-slate-400">{inj.phase}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medications */}
      {state.medications.length > 0 && (
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-200">💊 Medications</h2>
            <Link to="/medications" className="text-sm text-brand-400 hover:text-brand-300">Manage →</Link>
          </div>
          <div className="space-y-1">
            {state.medications.map(med => {
              const taken = state.medicationLogs.some(l => l.medId === med.id && l.date === todayStr);
              return (
                <div key={med.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{med.name} <span className="text-slate-500">({med.dosage})</span></span>
                  {taken ? <span className="badge bg-emerald-900/60 text-emerald-400">✓ Taken</span> : <span className="badge bg-surface-700 text-slate-500">Not taken</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {(todayWorkouts.length > 0 || todayMeals.length > 0) && (
        <div className="card mb-5">
          <h2 className="font-bold text-slate-200 mb-3">Today's Activity</h2>
          {todayWorkouts.map(w => (
            <div key={w.id} className="flex items-center gap-2 text-sm mb-1">
              <span>🏋️</span><span className="text-slate-300">{w.name || w.type}</span>
            </div>
          ))}
          {todayMeals.map(m => (
            <div key={m.id} className="flex items-center gap-2 text-sm mb-1">
              <span>🥗</span><span className="text-slate-300">{m.description || 'Meal'}</span>
              {m.macros?.calories > 0 && <span className="text-slate-500 text-xs">{m.macros.calories} kcal</span>}
            </div>
          ))}
        </div>
      )}

      {/* Pattern detection */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-200">🔍 Pattern Detection</h2>
          <button onClick={loadPatterns} disabled={patternsLoading} className="btn-secondary text-xs py-1 px-3">
            {patternsLoading ? 'Analyzing...' : 'Detect Patterns'}
          </button>
        </div>
        {patterns ? (
          <div className="space-y-3">
            {patterns.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-surface-700 rounded-xl">
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${p.direction === 'positive' ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'}`}>
                  {p.direction === 'positive' ? '↑' : '↓'}
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-sm">{p.metric1} → {p.metric2}</p>
                  <p className="text-xs text-slate-400">{p.summary}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Correlation strength: {Math.round(p.strength * 100)}%</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Click "Detect Patterns" to analyze correlations across your health data (sleep vs energy, workouts vs soreness, caffeine vs sleep, etc.).</p>
        )}
      </div>
    </div>
  );
}
