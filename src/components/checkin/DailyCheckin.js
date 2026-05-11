import React, { useState } from 'react';
import { useApp, ACTIONS } from '../../context/AppContext';
import ScoreInput from '../shared/ScoreInput';
import { today, isoNow, formatDate } from '../../utils/dateUtils';
import { getCheckinInsights } from '../../services/api';

function emptyForm() {
  return {
    energy: null, mood: null, soreness: null, stress: null, clarity: null,
    notes: '',
  };
}

export default function DailyCheckin() {
  const { state, dispatch } = useApp();
  const todayDate = today();
  const existing = state.checkins.find(c => c.date === todayDate) || null;

  const [form, setForm] = useState(() => existing ? {
    energy: existing.energy,
    mood: existing.mood,
    soreness: existing.soreness,
    stress: existing.stress,
    clarity: existing.clarity,
    notes: existing.notes || '',
  } : emptyForm());

  const [saved, setSaved] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  function setScore(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    setSaved(false);
  }

  function handleSave(e) {
    e.preventDefault();
    dispatch({
      type: ACTIONS.ADD_CHECKIN,
      payload: { ...form, date: todayDate, updatedAt: isoNow() },
    });
    setSaved(true);
    setAiInsights(null);
    setAiError(null);
  }

  async function handleGetInsights() {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await getCheckinInsights(
        { ...form, date: todayDate },
        state
      );
      setAiInsights(result);
    } catch (err) {
      setAiError(err.message || 'Could not load insights');
    }
    setAiLoading(false);
  }

  const FIELDS = [
    { key: 'energy',   label: 'Energy',         hint: '1 = exhausted · 10 = fully charged' },
    { key: 'mood',     label: 'Mood',            hint: '1 = terrible · 10 = amazing' },
    { key: 'soreness', label: 'Soreness',        hint: '1 = none · 10 = extreme pain' },
    { key: 'stress',   label: 'Stress',          hint: '1 = relaxed · 10 = overwhelmed' },
    { key: 'clarity',  label: 'Mental Clarity',  hint: '1 = foggy · 10 = sharp' },
  ];

  return (
    <div>
      <h1 className="section-title">Daily Check-in — {formatDate(todayDate)}</h1>
      {existing && (
        <div className="mb-4 px-3 py-2 bg-brand-900/40 border border-brand-700 rounded-xl text-sm text-brand-300">
          You've already checked in today. Saving will update today's entry.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Scores */}
        <div className="card space-y-5">
          <h2 className="font-bold text-slate-200">How are you feeling?</h2>
          {FIELDS.map(({ key, label, hint }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <p className="text-xs text-slate-500 mb-2">{hint}</p>
              <ScoreInput value={form[key]} onChange={v => setScore(key, v)} />
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="card">
          <label className="label">Insights / Notes</label>
          <textarea
            className="input"
            rows={4}
            placeholder="How's training going? Any patterns you've noticed? Goals for today?"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <button type="submit" className="btn-primary w-full py-3 text-base">
          {existing ? 'Update Check-in' : 'Save Check-in'}
        </button>
        {saved && (
          <div className="space-y-3">
            <p className="text-center text-emerald-400 text-sm font-semibold">✓ Saved!</p>
            <button
              type="button"
              onClick={handleGetInsights}
              disabled={aiLoading}
              className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {aiLoading ? <><span className="animate-spin">🤖</span> Analyzing…</> : '🤖 Get AI Insights'}
            </button>
          </div>
        )}
      </form>

      {/* AI Insights panel */}
      {aiError && (
        <div className="mt-4 card border border-red-800/40 text-sm text-red-400">{aiError}</div>
      )}

      {aiInsights && (
        <div className="mt-4 card space-y-4">
          {/* Headline */}
          <div className={`rounded-xl p-3 ${aiInsights.restDayRecommended ? 'bg-orange-900/30 border border-orange-700/40' : 'bg-brand-900/30 border border-brand-700/40'}`}>
            <p className="font-bold text-slate-100">{aiInsights.headline}</p>
            {aiInsights.restDayRecommended && (
              <span className="inline-block mt-1 text-xs font-semibold bg-orange-800/60 text-orange-300 px-2 py-0.5 rounded-full">Rest day recommended</span>
            )}
          </div>

          {/* Trend alert */}
          {aiInsights.trendAlert && (
            <div className="flex items-start gap-2 text-sm text-yellow-300 bg-yellow-900/20 rounded-xl px-3 py-2">
              <span className="shrink-0">⚠️</span>
              <span>{aiInsights.trendAlert}</span>
            </div>
          )}

          {/* Insights */}
          {aiInsights.insights?.length > 0 && (
            <div>
              <p className="label mb-2">What I'm seeing</p>
              <ul className="space-y-1.5">
                {aiInsights.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-brand-400 mt-0.5 shrink-0">→</span>{insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action for today */}
          {aiInsights.actionForToday && (
            <div className="bg-surface-700 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-1">Action for today</p>
              <p className="text-sm text-slate-200 font-semibold">{aiInsights.actionForToday}</p>
            </div>
          )}
        </div>
      )}

      {/* Recent history */}
      {state.checkins.length > 1 && (
        <div className="mt-8">
          <h2 className="font-bold text-slate-300 mb-3">Recent Check-ins</h2>
          <div className="space-y-2">
            {[...state.checkins].reverse().slice(0, 7).map(c => (
              <div key={c.date} className="card flex items-center justify-between text-sm">
                <span className="text-slate-400">{formatDate(c.date)}</span>
                <div className="flex gap-3">
                  {[['⚡', c.energy], ['😊', c.mood], ['💪', c.soreness], ['😰', c.stress], ['🧠', c.clarity]].map(([icon, val], i) => (
                    <span key={i} className="text-slate-300">{icon} {val ?? '–'}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
