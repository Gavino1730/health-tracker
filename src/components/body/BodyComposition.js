import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate } from '../../utils/dateUtils';
import PhotoCapture from '../shared/PhotoCapture';
import Modal from '../shared/Modal';

const MEASUREMENTS = [
  { key: 'chest',   label: 'Chest (cm)' },
  { key: 'waist',   label: 'Waist (cm)' },
  { key: 'hips',    label: 'Hips (cm)' },
  { key: 'thighs',  label: 'Thighs (cm)' },
  { key: 'calves',  label: 'Calves (cm)' },
  { key: 'biceps',  label: 'Biceps (cm)' },
  { key: 'forearms',label: 'Forearms (cm)' },
  { key: 'neck',    label: 'Neck (cm)' },
];

function emptyForm() {
  return {
    date: today(),
    weight: '',
    height: '',
    bodyFatPct: '',
    photoIds: [],
    measurements: {},
    notes: '',
  };
}

export default function BodyComposition() {
  const { state, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);

  function handlePhoto({ id, preview }) {
    setForm(f => ({ ...f, photoIds: [...f.photoIds, id] }));
    setPhotoPreviews(p => [...p, { id, preview }]);
  }

  function handleSave(e) {
    e.preventDefault();
    dispatch({
      type: ACTIONS.ADD_BODY_LOG,
      payload: { ...form, id: uuidv4(), createdAt: isoNow() },
    });
    setForm(emptyForm());
    setPhotoPreviews([]);
    setShowForm(false);
  }

  function setMeasurement(key, val) {
    setForm(f => ({ ...f, measurements: { ...f.measurements, [key]: val } }));
  }

  return (
    <div>
      <h1 className="section-title">Body Composition</h1>

      <button onClick={() => setShowForm(true)} className="btn-primary mb-5">+ Log Measurements</button>

      {/* Logs list */}
      {state.bodyLogs.length === 0 ? (
        <p className="text-slate-500 text-sm">No body composition logs yet.</p>
      ) : (
        <div className="space-y-3">
          {[...state.bodyLogs].reverse().map(log => (
            <div key={log.id} className="card cursor-pointer hover:border hover:border-brand-600 transition-all" onClick={() => setSelectedLog(log)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-200">{formatDate(log.date)}</p>
                  <div className="flex gap-4 mt-1 text-sm text-slate-400">
                    {log.weight && <span>⚖️ {log.weight} kg</span>}
                    {log.bodyFatPct && <span>📊 {log.bodyFatPct}% BF</span>}
                    {log.photoIds?.length > 0 && <span>📷 {log.photoIds.length} photo{log.photoIds.length > 1 ? 's' : ''}</span>}
                  </div>
                  {Object.keys(log.measurements || {}).length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {Object.entries(log.measurements).filter(([,v]) => v).map(([k, v]) => (
                        <span key={k} className="badge bg-surface-700 text-slate-300">{k}: {v}cm</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); dispatch({ type: ACTIONS.DELETE_BODY_LOG, payload: log.id }); }}
                  className="text-red-400 hover:text-red-300 ml-3"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Measurement history table */}
      {state.bodyLogs.length > 1 && (
        <div className="card mt-6 overflow-x-auto">
          <h2 className="font-bold text-slate-200 mb-3">Measurement History</h2>
          <table className="w-full text-xs text-slate-400">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left py-2 pr-3 font-semibold text-slate-300">Date</th>
                <th className="text-right py-2 px-2">Weight</th>
                {MEASUREMENTS.map(m => <th key={m.key} className="text-right py-2 px-2">{m.label.split(' ')[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...state.bodyLogs].sort((a, b) => a.date.localeCompare(b.date)).map(log => (
                <tr key={log.id} className="border-b border-surface-700/50">
                  <td className="py-2 pr-3">{formatDate(log.date, 'MMM d')}</td>
                  <td className="text-right py-2 px-2">{log.weight || '–'}</td>
                  {MEASUREMENTS.map(m => <td key={m.key} className="text-right py-2 px-2">{log.measurements?.[m.key] || '–'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log form modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Body Composition">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Weight (kg)</label>
              <input type="number" step="0.1" className="input" placeholder="e.g. 80.5" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
            <div>
              <label className="label">Height (cm)</label>
              <input type="number" step="0.5" className="input" placeholder="e.g. 178" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} />
            </div>
            <div>
              <label className="label">Body Fat %</label>
              <input type="number" step="0.1" className="input" placeholder="e.g. 18.5" value={form.bodyFatPct} onChange={e => setForm(f => ({ ...f, bodyFatPct: e.target.value }))} />
            </div>
          </div>

          <div>
            <h3 className="label mb-2">Body Measurements</h3>
            <div className="grid grid-cols-2 gap-2">
              {MEASUREMENTS.map(m => (
                <div key={m.key}>
                  <label className="text-xs text-slate-400 mb-0.5 block">{m.label}</label>
                  <input type="number" step="0.5" className="input" value={form.measurements[m.key] || ''} onChange={e => setMeasurement(m.key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Progress photos */}
          <div>
            <label className="label">Progress Photos</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {photoPreviews.map(p => (
                <img key={p.id} src={p.preview} alt="preview" className="w-20 h-20 object-cover rounded-xl border border-surface-600" />
              ))}
            </div>
            <PhotoCapture onCapture={handlePhoto} label="Add Progress Photo" />
            <p className="text-xs text-slate-500 mt-1">Photos are stored locally on your device only.</p>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <button type="submit" className="btn-primary w-full">Save Log</button>
        </form>
      </Modal>

      {/* Detail modal */}
      {selectedLog && (
        <Modal open={!!selectedLog} onClose={() => setSelectedLog(null)} title={`Log – ${formatDate(selectedLog.date)}`}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {selectedLog.weight && <div className="bg-surface-700 rounded-xl p-3 text-center"><p className="text-xl font-bold text-slate-100">{selectedLog.weight}</p><p className="text-xs text-slate-400">kg</p></div>}
              {selectedLog.bodyFatPct && <div className="bg-surface-700 rounded-xl p-3 text-center"><p className="text-xl font-bold text-slate-100">{selectedLog.bodyFatPct}%</p><p className="text-xs text-slate-400">Body Fat</p></div>}
              {selectedLog.height && <div className="bg-surface-700 rounded-xl p-3 text-center"><p className="text-xl font-bold text-slate-100">{selectedLog.height}</p><p className="text-xs text-slate-400">cm</p></div>}
            </div>
            {Object.keys(selectedLog.measurements || {}).length > 0 && (
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(selectedLog.measurements).filter(([,v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm text-slate-400 bg-surface-700 rounded-lg px-3 py-1.5">
                    <span className="capitalize">{k}</span><span className="font-semibold text-slate-200">{v} cm</span>
                  </div>
                ))}
              </div>
            )}
            {selectedLog.notes && <p className="text-sm text-slate-400 italic">{selectedLog.notes}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
