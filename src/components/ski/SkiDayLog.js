import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate } from '../../utils/dateUtils';
import ScoreInput from '../shared/ScoreInput';

const CONDITIONS = ['Powder', 'Groomed', 'Packed powder', 'Crud', 'Ice', 'Spring corn', 'Slush', 'Mixed'];
const TERRAIN_OPTIONS = ['Groomers', 'Moguls', 'Trees/Glades', 'Steeps', 'Park', 'Backcountry', 'Powder runs', 'Mixed'];

function emptyForm() {
  return {
    date: today(),
    resort: '',
    conditions: [],
    terrain: [],
    tricks: '',
    feeling: null,
    tweaks: '',
    notes: '',
    runs: '',
    vertFt: '',
  };
}

export default function SkiDayLog() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState('log');
  const [form, setForm] = useState(emptyForm());
  const [saved, setSaved] = useState(false);

  function toggleList(field, val) {
    setForm(f => {
      const arr = f[field] || [];
      return { ...f, [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  }

  function handleSave(e) {
    e.preventDefault();
    dispatch({ type: ACTIONS.ADD_SKI_DAY, payload: { ...form, id: uuidv4(), createdAt: isoNow() } });
    setForm(emptyForm());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Season summary
  const skiDays = [...state.skiDays].sort((a, b) => a.date.localeCompare(b.date));
  const totalRuns = skiDays.reduce((s, d) => s + (Number(d.runs) || 0), 0);
  const totalVert = skiDays.reduce((s, d) => s + (Number(d.vertFt) || 0), 0);
  const avgFeeling = skiDays.length
    ? (skiDays.reduce((s, d) => s + (d.feeling || 5), 0) / skiDays.length).toFixed(1)
    : '–';

  return (
    <div>
      <h1 className="section-title">Ski Day Tracker</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[['log', '⛷️ Log Day'], ['history', '📋 History'], ['season', '📊 Season']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === key ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="card space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Resort</label>
                <input className="input" placeholder="e.g. Whistler" value={form.resort} onChange={e => setForm(f => ({ ...f, resort: e.target.value }))} />
              </div>
              <div>
                <label className="label">Runs</label>
                <input type="number" min="0" className="input" placeholder="# of runs" value={form.runs} onChange={e => setForm(f => ({ ...f, runs: e.target.value }))} />
              </div>
              <div>
                <label className="label">Vertical (ft)</label>
                <input type="number" min="0" className="input" placeholder="e.g. 20000" value={form.vertFt} onChange={e => setForm(f => ({ ...f, vertFt: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="label">Conditions</label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map(c => (
                  <button type="button" key={c} onClick={() => toggleList('conditions', c)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${form.conditions.includes(c) ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Terrain</label>
              <div className="flex flex-wrap gap-2">
                {TERRAIN_OPTIONS.map(t => (
                  <button type="button" key={t} onClick={() => toggleList('terrain', t)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${form.terrain.includes(t) ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-400'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">How did you feel? (1-10)</label>
              <ScoreInput value={form.feeling} onChange={v => setForm(f => ({ ...f, feeling: v }))} />
            </div>

            <div>
              <label className="label">Tricks / Highlights</label>
              <input className="input" placeholder="e.g. first backflip, big airs on jump line" value={form.tricks} onChange={e => setForm(f => ({ ...f, tricks: e.target.value }))} />
            </div>

            <div>
              <label className="label">Tweaks / Injuries</label>
              <input className="input" placeholder="e.g. slight knee tweak on moguls" value={form.tweaks} onChange={e => setForm(f => ({ ...f, tweaks: e.target.value }))} />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={3} placeholder="Overall thoughts on the day..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3">Log Ski Day</button>
          {saved && <p className="text-center text-emerald-400 text-sm">✓ Saved!</p>}
        </form>
      )}

      {tab === 'history' && (
        <div>
          {skiDays.length === 0 ? (
            <p className="text-slate-500 text-sm">No ski days logged yet.</p>
          ) : (
            <div className="space-y-3">
              {[...skiDays].reverse().map(day => {
                // Correlate with recovery
                const recovery = state.recovery.find(r => r.date === day.date);
                const checkin = state.checkins.find(c => c.date === day.date);
                const sleep = state.sleep.find(s => s.date === day.date);

                return (
                  <div key={day.id} className="card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-slate-200">{day.resort || 'Ski Day'}</p>
                        <p className="text-sm text-slate-400">{formatDate(day.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {day.feeling && <span className="badge bg-brand-900/60 text-brand-300">Feel: {day.feeling}/10</span>}
                        <button onClick={() => dispatch({ type: ACTIONS.DELETE_SKI_DAY, payload: day.id })} className="text-red-400 hover:text-red-300">✕</button>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap text-xs mb-2">
                      {day.runs && <span className="badge bg-surface-700 text-slate-300">{day.runs} runs</span>}
                      {day.vertFt && <span className="badge bg-surface-700 text-slate-300">{Number(day.vertFt).toLocaleString()} ft vert</span>}
                      {day.conditions?.map(c => <span key={c} className="badge bg-surface-700 text-slate-400">{c}</span>)}
                      {day.terrain?.map(t => <span key={t} className="badge bg-surface-700 text-slate-400">{t}</span>)}
                    </div>

                    {day.tricks && <p className="text-xs text-emerald-400 mb-1">🎯 {day.tricks}</p>}
                    {day.tweaks && <p className="text-xs text-red-400 mb-1">⚠️ {day.tweaks}</p>}
                    {day.notes && <p className="text-xs text-slate-500 italic">{day.notes}</p>}

                    {/* Correlation data */}
                    {(recovery || checkin || sleep) && (
                      <div className="mt-3 pt-3 border-t border-surface-700 flex gap-3 text-xs">
                        {sleep && <span className="text-slate-400">😴 {(sleep.durationMins / 60).toFixed(1)}h sleep</span>}
                        {checkin && <span className="text-slate-400">⚡ Energy: {checkin.energy}/10</span>}
                        {recovery && <span className="text-slate-400">❤️‍🔥 Recovery: {recovery.recoveryScore}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'season' && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card text-center">
              <p className="text-3xl font-extrabold text-brand-400">{skiDays.length}</p>
              <p className="text-xs text-slate-400 mt-1">Days on Snow</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-extrabold text-slate-100">{totalRuns}</p>
              <p className="text-xs text-slate-400 mt-1">Total Runs</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-extrabold text-emerald-400">{avgFeeling}</p>
              <p className="text-xs text-slate-400 mt-1">Avg Feeling</p>
            </div>
          </div>
          {totalVert > 0 && (
            <div className="card text-center mb-4">
              <p className="text-4xl font-extrabold text-yellow-400">{totalVert.toLocaleString()}</p>
              <p className="text-sm text-slate-400 mt-1">Total Vertical Feet</p>
            </div>
          )}
          {/* Tricks summary */}
          {skiDays.filter(d => d.tricks).length > 0 && (
            <div className="card">
              <h2 className="font-bold text-slate-200 mb-2">Highlights & Tricks</h2>
              <div className="space-y-1">
                {skiDays.filter(d => d.tricks).map(d => (
                  <div key={d.id} className="text-sm"><span className="text-slate-400">{formatDate(d.date, 'MMM d')}: </span><span className="text-emerald-300">{d.tricks}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
