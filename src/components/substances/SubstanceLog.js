import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate } from '../../utils/dateUtils';
import { analyzeSubstanceCorrelations } from '../../services/api';

const ALCOHOL_TYPES = ['Beer', 'Wine', 'Spirits / Liquor', 'Cocktail', 'Cider', 'Hard Seltzer', 'Other'];
const WEED_METHODS = ['Flower (smoked)', 'Vape', 'Edible', 'Concentrate / Dab', 'Tincture', 'Topical', 'Other'];

function AlcoholForm({ onAdd }) {
  const [form, setForm] = useState({ type: 'Beer', amount: '', unit: 'drinks', notes: '', date: today() });
  function handle(e) {
    e.preventDefault();
    onAdd({ ...form, subType: 'alcohol', id: uuidv4(), createdAt: isoNow() });
    setForm({ type: 'Beer', amount: '', unit: 'drinks', notes: '', date: today() });
  }
  return (
    <form onSubmit={handle} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {ALCOHOL_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Amount</label>
          <input type="number" min="0" step="0.5" className="input" placeholder="e.g. 2" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        </div>
        <div>
          <label className="label">Unit</label>
          <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
            {['drinks', 'beers', 'glasses', 'shots', 'oz', 'ml'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <input type="text" className="input" placeholder="e.g. social event, dinner wine" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <button type="submit" className="btn-primary w-full">Log Alcohol</button>
    </form>
  );
}

function WeedForm({ onAdd }) {
  const [form, setForm] = useState({ method: 'Flower (smoked)', amount: '', unit: 'sessions', notes: '', date: today() });
  function handle(e) {
    e.preventDefault();
    onAdd({ ...form, subType: 'weed', id: uuidv4(), createdAt: isoNow() });
    setForm({ method: 'Flower (smoked)', amount: '', unit: 'sessions', notes: '', date: today() });
  }
  return (
    <form onSubmit={handle} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div>
          <label className="label">Method</label>
          <select className="input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
            {WEED_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Amount</label>
          <input type="number" min="0" step="0.5" className="input" placeholder="e.g. 1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        </div>
        <div>
          <label className="label">Unit</label>
          <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
            {['sessions', 'g', 'mg (edible)', 'hits', 'bowls'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <input type="text" className="input" placeholder="e.g. before bed, pain relief" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <button type="submit" className="btn-primary w-full">Log Weed</button>
    </form>
  );
}

export default function SubstanceLog() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState('alcohol');
  const [corrResult, setCorrResult] = useState(null);
  const [corrLoading, setCorrLoading] = useState(false);
  const [corrError, setCorrError] = useState(null);

  function handleAdd(entry) {
    dispatch({ type: ACTIONS.ADD_SUBSTANCE, payload: entry });
  }

  async function handleAnalyze() {
    setCorrLoading(true);
    setCorrError(null);
    try {
      const result = await analyzeSubstanceCorrelations(state);
      setCorrResult(result);
    } catch (err) {
      setCorrError(err.message || 'Analysis failed');
    }
    setCorrLoading(false);
  }

  const alcoholEntries = [...state.substances.filter(s => s.subType === 'alcohol')].reverse();
  const weedEntries    = [...state.substances.filter(s => s.subType === 'weed')].reverse();

  return (
    <div>
      <h1 className="section-title">Substance Log</h1>

      {/* Tabs — includes AI Correlations */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[['alcohol', '🍺 Alcohol'], ['weed', '🌿 Weed'], ['correlations', '🤖 AI Correlations']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === key ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'correlations' ? (
        <div className="space-y-4">
          <div className="card">
            <p className="text-sm text-slate-400 mb-3">
              Analyzes how your alcohol and weed use correlates with sleep quality, next-day energy, mood, soreness, and workout performance across your full log history.
            </p>
            <div className="text-xs text-slate-500 flex flex-wrap gap-3 mb-4">
              <span>🍺 {state.substances.filter(s => s.subType === 'alcohol').length} alcohol entries</span>
              <span>🌿 {state.substances.filter(s => s.subType === 'weed').length} weed entries</span>
              <span>😴 {state.sleep?.length || 0} sleep logs</span>
              <span>📋 {state.checkins?.length || 0} check-ins</span>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={corrLoading || state.substances.length === 0}
              className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {corrLoading ? 'Analyzing…' : corrResult ? 'Re-analyze' : 'Analyze Correlations'}
            </button>
            {state.substances.length === 0 && (
              <p className="text-xs text-slate-500 text-center mt-2">Log some substance data first to enable analysis.</p>
            )}
          </div>

          {corrError && (
            <div className="card border border-red-800/40 text-sm text-red-400">{corrError}</div>
          )}

          {corrResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="card">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">Summary</p>
                <p className="text-sm text-slate-200 leading-relaxed">{corrResult.summary}</p>
                {corrResult.dataQuality && corrResult.dataQuality !== 'sufficient' && (
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠️ Data quality: {corrResult.dataQuality}. More logs will improve accuracy.
                  </p>
                )}
              </div>

              {/* Correlations */}
              {corrResult.correlations?.length > 0 && (
                <div className="card">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-3">Correlations Found</p>
                  <div className="space-y-3">
                    {corrResult.correlations.map((corr, i) => (
                      <div key={i} className="bg-surface-700 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize
                            bg-surface-600 text-slate-300">
                            {corr.substance}
                          </span>
                          <span className="text-xs text-slate-400">→</span>
                          <span className="text-xs font-semibold text-slate-300">{corr.metric}</span>
                          <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                            corr.impact === 'negative' ? 'bg-red-900/50 text-red-300' :
                            corr.impact === 'positive' ? 'bg-emerald-900/50 text-emerald-300' :
                            corr.impact === 'mixed' ? 'bg-yellow-900/50 text-yellow-300' :
                            'bg-surface-600 text-slate-400'
                          }`}>
                            {corr.impact}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-200">{corr.direction}</p>
                        {corr.detail && <p className="text-xs text-slate-400 mt-1">{corr.detail}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {corrResult.recommendations?.length > 0 && (
                <div className="card">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-3">Recommendations</p>
                  <ul className="space-y-2">
                    {corrResult.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-brand-400 mt-0.5 shrink-0">→</span>{rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="card mb-6">
            {tab === 'alcohol' ? <AlcoholForm onAdd={handleAdd} /> : <WeedForm onAdd={handleAdd} />}
          </div>

          {/* History */}
          <div>
            <h2 className="font-bold text-slate-300 mb-3">History</h2>
            {(tab === 'alcohol' ? alcoholEntries : weedEntries).length === 0 ? (
              <p className="text-slate-500 text-sm">No entries yet.</p>
            ) : (
              <div className="space-y-2">
                {(tab === 'alcohol' ? alcoholEntries : weedEntries).map(s => (
                  <div key={s.id} className="card flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-200">
                        {s.subType === 'alcohol' ? s.type : s.method}
                        {s.amount ? ` – ${s.amount} ${s.unit}` : ''}
                      </p>
                      <p className="text-sm text-slate-400">{formatDate(s.date)}{s.notes ? ` · ${s.notes}` : ''}</p>
                    </div>
                    <button onClick={() => dispatch({ type: ACTIONS.DELETE_SUBSTANCE, payload: s.id })} className="text-red-400 hover:text-red-300 ml-3">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
