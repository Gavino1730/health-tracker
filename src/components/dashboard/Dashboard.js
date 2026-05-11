import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { today, formatDate, last7Days } from '../../utils/dateUtils';
import { calculateRecoveryScore, calculateSleepScore } from '../../utils/scores';
import { detectPatterns } from '../../services/api';

// ── Circular SVG score ring ──────────────────────────────────────────────────
function ScoreRing({ value, max = 10, label, color = '#22d3ee', unit = '', to }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const pct = value != null ? Math.min(value / max, 1) : 0;
  const offset = circ * (1 - pct);

  const ring = (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div className="relative" style={{ width: 82, height: 82 }}>
        <svg width="82" height="82" viewBox="0 0 82 82">
          <circle cx="41" cy="41" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          {value != null && (
            <circle
              cx="41" cy="41" r={r}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 41 41)"
              style={{ filter: `drop-shadow(0 0 6px ${color}90)` }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[18px] font-extrabold leading-none"
            style={{ color: value != null ? color : '#334155' }}
          >
            {value != null ? value : '–'}
          </span>
          {unit && <span className="text-[9px] text-slate-600 mt-0.5 leading-none">{unit}</span>}
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );

  return to ? (
    <Link to={to} className="hover:opacity-75 transition-opacity">{ring}</Link>
  ) : ring;
}

// ── Compact stat tile ────────────────────────────────────────────────────────
function StatTile({ label, value, suffix = '', icon, color = '#22d3ee', to }) {
  const tile = (
    <div className="bg-surface-800 border border-white/5 hover:border-white/10 rounded-2xl p-3.5 transition-all">
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-lg leading-none">{icon}</span>
        <div className="text-right leading-none">
          <span className="text-xl font-extrabold" style={{ color: value != null ? color : '#334155' }}>
            {value != null ? value : '–'}
          </span>
          {suffix && value != null && (
            <span className="text-[10px] text-slate-600 ml-0.5">{suffix}</span>
          )}
        </div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{tile}</Link> : tile;
}

// ── Shared chart tooltip ─────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, borderColor = 'rgba(34,211,238,0.2)' }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs shadow-2xl"
      style={{ background: '#0a1628', border: `1px solid ${borderColor}` }}
    >
      <p className="font-bold text-slate-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Quick log items ──────────────────────────────────────────────────────────
const QUICK_LINKS = [
  { to: '/checkin',    icon: '✅', label: 'Check-in'   },
  { to: '/sleep',      icon: '😴', label: 'Sleep'      },
  { to: '/nutrition',  icon: '🥗', label: 'Meal'       },
  { to: '/workout',    icon: '🏋️', label: 'Workout'   },
  { to: '/water',      icon: '💧', label: 'Water'      },
  { to: '/stretching', icon: '🧘', label: 'Stretch'    },
  { to: '/recovery',   icon: '❤️‍🔥', label: 'Recovery' },
  { to: '/substances', icon: '🍺', label: 'Substances' },
];

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { state } = useApp();
  const todayStr = today();

  const todayCheckin   = state.checkins.find(c => c.date === todayStr);
  const todaySleep     = [...state.sleep].sort((a, b) => b.date.localeCompare(a.date))[0];
  const todayRecovery  = state.recovery.find(r => r.date === todayStr);
  const todayWaterMl   = state.water.filter(w => w.createdAt?.startsWith(todayStr)).reduce((s, w) => s + w.amount, 0);
  const todayWorkouts  = state.workouts.filter(w => w.date === todayStr);
  const todayMeals     = state.meals.filter(m => m.date === todayStr);
  const activeInjuries = state.injuries.filter(i => i.status !== 'Healed');

  const localRecovery   = calculateRecoveryScore({ checkin: todayCheckin || {}, sleep: todaySleep || {} });
  const sleepScore      = todaySleep ? calculateSleepScore(todaySleep) : null;
  const displayRecovery = todayRecovery?.recoveryScore ?? (todayCheckin ? localRecovery : null);
  const waterOzToday    = todayWaterMl ? Math.round(todayWaterMl / 29.5735) : null;

  const [patterns, setPatterns]               = useState(null);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [patternsError, setPatternsError]     = useState('');

  const patternPayload = useMemo(() => ({
    checkins:   state.checkins,
    sleep:      state.sleep,
    workouts:   state.workouts,
    nutrition:  state.meals,
    substances: state.substances,
  }), [state.checkins, state.sleep, state.workouts, state.meals, state.substances]);

  const hasPatternData =
    (patternPayload.checkins?.length   || 0) +
    (patternPayload.sleep?.length      || 0) +
    (patternPayload.workouts?.length   || 0) +
    (patternPayload.nutrition?.length  || 0) +
    (patternPayload.substances?.length || 0) >= 3;

  const loadPatterns = useCallback(async () => {
    if (!hasPatternData) { setPatterns(null); setPatternsError(''); return; }
    setPatternsLoading(true); setPatternsError('');
    try {
      const result = await detectPatterns(patternPayload);
      setPatterns(result?.correlations || []);
    } catch (err) {
      setPatternsError(err.message || 'Could not analyze patterns right now.');
    }
    setPatternsLoading(false);
  }, [hasPatternData, patternPayload]);

  useEffect(() => {
    const t = setTimeout(loadPatterns, 500);
    return () => clearTimeout(t);
  }, [patternPayload, loadPatterns]);

  // Build 7-day chart data
  const days = last7Days();
  const chartData = days.map(date => {
    const c = state.checkins.find(x => x.date === date);
    const s = state.sleep.find(x => x.date === date);
    const r = state.recovery.find(x => x.date === date);
    const wOz = Math.round(
      state.water.filter(x => x.createdAt?.startsWith(date)).reduce((a, w) => a + w.amount, 0) / 29.5735
    );
    return {
      date,
      day:      formatDate(date, 'EEE'),
      Energy:   c?.energy   ?? null,
      Mood:     c?.mood     ?? null,
      Recovery: r ? Math.round(r.recoveryScore / 10) : null,
      Sleep:    s ? +(s.durationMins / 60).toFixed(1) : null,
      Water:    wOz || null,
    };
  });

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {state.profile?.name ? `Hey, ${state.profile.name.split(' ')[0]} 👋` : 'Dashboard'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{formatDate(todayStr, 'EEEE, MMMM d')}</p>
        </div>
        <Link to="/checkin" className="btn-primary text-sm py-2 px-4">
          {todayCheckin ? '✓ Edit Check-in' : '+ Check-in'}
        </Link>
      </div>

      {/* ── Today's Vitals — Score Rings ────────────────────────────────── */}
      <div className="card-glow">
        <p className="micro-label mb-4">Today's Vitals</p>
        <div className="grid grid-cols-4 gap-1">
          <ScoreRing value={displayRecovery} max={100} label="Recovery" color="#22d3ee" unit="/100" to="/recovery" />
          <ScoreRing value={sleepScore}      max={10}  label="Sleep"    color="#a78bfa" unit="/10"  to="/sleep" />
          <ScoreRing value={todayCheckin?.energy} max={10} label="Energy" color="#fbbf24" unit="/10" to="/checkin" />
          <ScoreRing value={todayCheckin?.mood}   max={10} label="Mood"   color="#34d399" unit="/10" to="/checkin" />
        </div>
      </div>

      {/* ── Secondary Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Water"    value={waterOzToday}          suffix="oz"  icon="💧" color="#22d3ee" to="/water" />
        <StatTile label="Stress"   value={todayCheckin?.stress}   suffix="/10" icon="🧠"
          color={todayCheckin?.stress   ? (todayCheckin.stress   <= 3 ? '#34d399' : todayCheckin.stress   <= 6 ? '#fbbf24' : '#f87171') : '#334155'} />
        <StatTile label="Soreness" value={todayCheckin?.soreness} suffix="/10" icon="💪"
          color={todayCheckin?.soreness ? (todayCheckin.soreness <= 3 ? '#34d399' : todayCheckin.soreness <= 6 ? '#fbbf24' : '#f87171') : '#334155'} />
        <StatTile label="Clarity"  value={todayCheckin?.clarity}  suffix="/10" icon="🎯" color="#a78bfa" />
      </div>

      {/* ── 7-Day Trend — Area Chart ─────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="micro-label">7-Day Trends</p>
          <div className="flex gap-3 text-[10px] font-bold">
            <span style={{ color: '#fbbf24' }}>● Energy</span>
            <span style={{ color: '#34d399' }}>● Mood</span>
            <span style={{ color: '#22d3ee' }}>● Recovery</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -28 }}>
            <defs>
              <linearGradient id="gEnergy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#fbbf24" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="gMood" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#34d399" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="gRecovery" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#22d3ee" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="day"  tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip borderColor="rgba(34,211,238,0.2)" />} />
            <Area type="monotone" dataKey="Energy"   stroke="#fbbf24" strokeWidth={2} fill="url(#gEnergy)"   dot={false} connectNulls activeDot={{ r: 4, fill: '#fbbf24' }} />
            <Area type="monotone" dataKey="Mood"     stroke="#34d399" strokeWidth={2} fill="url(#gMood)"     dot={false} connectNulls activeDot={{ r: 4, fill: '#34d399' }} />
            <Area type="monotone" dataKey="Recovery" name="Recovery ×10" stroke="#22d3ee" strokeWidth={2} fill="url(#gRecovery)" dot={false} connectNulls activeDot={{ r: 4, fill: '#22d3ee' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Sleep + Water Charts ─────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <p className="micro-label mb-3">Sleep (hrs)</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={chartData} margin={{ top: 4, right: 5, bottom: 0, left: -30 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 12]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip borderColor="rgba(167,139,250,0.25)" />} />
              <Bar dataKey="Sleep" name="hrs" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <p className="micro-label mb-3">Water (oz)</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={chartData} margin={{ top: 4, right: 5, bottom: 0, left: -30 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip borderColor="rgba(34,211,238,0.2)" />} />
              <Bar dataKey="Water" name="oz" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Quick Log ───────────────────────────────────────────────────── */}
      <div>
        <p className="micro-label mb-3">Quick Log</p>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_LINKS.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-1.5 bg-surface-800 hover:bg-surface-700 border border-white/5 hover:border-brand-500/30 rounded-2xl py-3.5 px-2 transition-all"
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Today's Activity ─────────────────────────────────────────────── */}
      {(todayWorkouts.length > 0 || todayMeals.length > 0) && (
        <div className="card">
          <p className="micro-label mb-3">Today's Activity</p>
          <div className="space-y-2">
            {todayWorkouts.map(w => (
              <div key={w.id} className="flex items-center gap-3 p-2.5 bg-surface-700/50 rounded-xl">
                <span className="text-lg">🏋️</span>
                <span className="text-sm font-semibold text-slate-200">{w.name || w.type}</span>
                <span className="ml-auto badge bg-brand-900/40 text-brand-300 text-[10px]">Workout</span>
              </div>
            ))}
            {todayMeals.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 bg-surface-700/50 rounded-xl">
                <span className="text-lg">🥗</span>
                <span className="text-sm font-semibold text-slate-200">{m.description || 'Meal'}</span>
                {m.macros?.calories > 0 && (
                  <span className="ml-auto text-xs text-slate-500">{m.macros.calories} kcal</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Injuries + Medications ───────────────────────────────────────── */}
      {(activeInjuries.length > 0 || state.medications.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {activeInjuries.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(248,113,113,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="micro-label">🩹 Injuries</p>
                <Link to="/injury" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">View all →</Link>
              </div>
              <div className="space-y-2">
                {activeInjuries.map(inj => (
                  <div key={inj.id} className="flex items-center justify-between p-2.5 bg-surface-700/50 rounded-xl text-sm">
                    <span className="font-semibold text-slate-200">{inj.location}</span>
                    <div className="flex gap-1.5">
                      <span className="badge bg-rose-900/40 text-rose-400">{inj.severity}</span>
                      <span className="badge bg-surface-600 text-slate-400">{inj.phase}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.medications.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="micro-label">💊 Medications</p>
                <Link to="/medications" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Manage →</Link>
              </div>
              <div className="space-y-2">
                {state.medications.map(med => {
                  const taken = state.medicationLogs.some(l => l.medId === med.id && l.date === todayStr);
                  return (
                    <div key={med.id} className="flex items-center justify-between p-2.5 bg-surface-700/50 rounded-xl text-sm">
                      <span className="text-slate-300">
                        {med.name} <span className="text-slate-500 text-xs">({med.dosage})</span>
                      </span>
                      {taken
                        ? <span className="badge bg-emerald-900/60 text-emerald-400">✓ Taken</span>
                        : <span className="badge bg-surface-600/80 text-slate-500">Pending</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI Pattern Detection ─────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="micro-label">🔍 AI Patterns</p>
          <button
            onClick={loadPatterns}
            disabled={patternsLoading}
            className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 disabled:opacity-40 transition-colors"
          >
            {patternsLoading ? 'Analyzing…' : 'Refresh'}
          </button>
        </div>

        {patternsLoading && !patterns && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="animate-pulse text-brand-500">●</span> Scanning your data…
          </div>
        )}
        {!patternsLoading && patternsError && (
          <p className="text-sm text-rose-400">{patternsError}</p>
        )}
        {!patternsLoading && !patternsError && patterns && patterns.length > 0 ? (
          <div className="space-y-2">
            {patterns.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-surface-700/50 rounded-xl">
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  p.direction === 'positive'
                    ? 'bg-emerald-900/60 text-emerald-400'
                    : 'bg-rose-900/60 text-rose-400'
                }`}>
                  {p.direction === 'positive' ? '↑' : '↓'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{p.metric1} → {p.metric2}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.summary}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Strength: {Math.round(p.strength * 100)}%</p>
                </div>
              </div>
            ))}
          </div>
        ) : !patternsLoading && !patternsError && hasPatternData ? (
          <p className="text-sm text-slate-500">No strong patterns yet — keep logging!</p>
        ) : (
          <p className="text-sm text-slate-600">
            Log more data to unlock automatic pattern detection (sleep vs energy, workouts vs soreness, etc).
          </p>
        )}
      </div>

    </div>
  );
}
