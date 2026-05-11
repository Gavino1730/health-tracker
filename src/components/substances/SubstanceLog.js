import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate } from '../../utils/dateUtils';

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

  function handleAdd(entry) {
    dispatch({ type: ACTIONS.ADD_SUBSTANCE, payload: entry });
  }

  const alcoholEntries = [...state.substances.filter(s => s.subType === 'alcohol')].reverse();
  const weedEntries    = [...state.substances.filter(s => s.subType === 'weed')].reverse();

  return (
    <div>
      <h1 className="section-title">Substance Log</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[['alcohol', '🍺 Alcohol'], ['weed', '🌿 Weed']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === key ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

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
    </div>
  );
}
