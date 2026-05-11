import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import ScoreInput from '../shared/ScoreInput';
import { today, isoNow, formatDate } from '../../utils/dateUtils';

const CAFFEINE_TYPES = ['Coffee', 'Espresso', 'Cold Brew', 'Energy Drink', 'Pre-workout', 'Tea', 'Other'];

function emptyForm() {
  return {
    energy: null, mood: null, soreness: null, stress: null, clarity: null,
    notes: '',
    caffeine: [],
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
    caffeine: existing.caffeine || [],
  } : emptyForm());

  const [caffeineForm, setCaffeineForm] = useState({ type: 'Coffee', time: '', amount: '', unit: 'cups' });
  const [saved, setSaved] = useState(false);

  function setScore(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    setSaved(false);
  }

  function addCaffeine() {
    if (!caffeineForm.type) return;
    const entry = { ...caffeineForm, id: uuidv4() };
    setForm(f => ({ ...f, caffeine: [...f.caffeine, entry] }));
    setCaffeineForm({ type: 'Coffee', time: '', amount: '', unit: 'cups' });
  }

  function removeCaffeine(id) {
    setForm(f => ({ ...f, caffeine: f.caffeine.filter(c => c.id !== id) }));
  }

  function handleSave(e) {
    e.preventDefault();
    dispatch({
      type: ACTIONS.ADD_CHECKIN,
      payload: { ...form, date: todayDate, updatedAt: isoNow() },
    });
    setSaved(true);
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

        {/* Caffeine */}
        <div className="card">
          <h2 className="font-bold text-slate-200 mb-3">Caffeine Log</h2>
          {form.caffeine.length > 0 && (
            <div className="mb-3 space-y-1">
              {form.caffeine.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-surface-700 rounded-lg px-3 py-1.5 text-sm">
                  <span>{c.type}{c.amount ? ` – ${c.amount} ${c.unit}` : ''}{c.time ? ` @ ${c.time}` : ''}</span>
                  <button type="button" onClick={() => removeCaffeine(c.id)} className="text-red-400 hover:text-red-300 ml-2">✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="label">Type</label>
              <select className="input" value={caffeineForm.type} onChange={e => setCaffeineForm(f => ({ ...f, type: e.target.value }))}>
                {CAFFEINE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Time</label>
              <input type="time" className="input" value={caffeineForm.time} onChange={e => setCaffeineForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" min="0" step="0.5" className="input" placeholder="e.g. 2" value={caffeineForm.amount} onChange={e => setCaffeineForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={caffeineForm.unit} onChange={e => setCaffeineForm(f => ({ ...f, unit: e.target.value }))}>
                {['cups', 'shots', 'ml', 'oz', 'cans'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <button type="button" onClick={addCaffeine} className="btn-secondary text-sm">+ Add Caffeine Entry</button>
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
          <p className="text-center text-emerald-400 text-sm font-semibold">✓ Saved!</p>
        )}
      </form>

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
