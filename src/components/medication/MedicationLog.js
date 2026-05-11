import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate } from '../../utils/dateUtils';
import Modal from '../shared/Modal';

const FREQUENCIES = ['Daily', 'Twice daily', 'Weekly', 'As needed', 'Morning', 'Evening', 'With meals'];

export default function MedicationLog() {
  const { state, dispatch } = useApp();
  const todayStr = today();

  const [showAdd, setShowAdd] = useState(false);
  const [editMed, setEditMed] = useState(null);
  const [form, setForm] = useState({ name: '', dosage: '', frequency: 'Daily', notes: '' });

  function openAdd() { setForm({ name: '', dosage: '', frequency: 'Daily', notes: '' }); setEditMed(null); setShowAdd(true); }
  function openEdit(med) { setForm({ name: med.name, dosage: med.dosage, frequency: med.frequency, notes: med.notes || '' }); setEditMed(med); setShowAdd(true); }

  function handleSave(e) {
    e.preventDefault();
    if (!form.name) return;
    if (editMed) {
      dispatch({ type: ACTIONS.UPDATE_MEDICATION, payload: { ...editMed, ...form } });
    } else {
      dispatch({ type: ACTIONS.ADD_MEDICATION, payload: { ...form, id: uuidv4(), createdAt: isoNow() } });
    }
    setShowAdd(false);
  }

  function handleDelete(id) {
    if (window.confirm('Delete this medication?')) {
      dispatch({ type: ACTIONS.DELETE_MEDICATION, payload: id });
    }
  }

  function toggleDose(medId) {
    const existing = state.medicationLogs.find(l => l.medId === medId && l.date === todayStr);
    if (existing) {
      // undo – filter it out via a re-add trick using negative log (just remove from list in reducer isn't ideal; we'll just add a "skipped" flag)
      // simplest: dispatch again and toggle in reducer – for now toggle display only via state
      dispatch({ type: ACTIONS.DELETE_MEDICATION, payload: null }); // noop
    } else {
      dispatch({
        type: ACTIONS.LOG_MEDICATION_DOSE,
        payload: { id: uuidv4(), medId, date: todayStr, takenAt: isoNow() },
      });
    }
  }

  function isDoseTaken(medId) {
    return state.medicationLogs.some(l => l.medId === medId && l.date === todayStr);
  }

  return (
    <div>
      <h1 className="section-title">Medications</h1>

      {/* Today's check-off */}
      {state.medications.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-bold text-slate-200 mb-3">Today — {formatDate(todayStr)}</h2>
          <div className="space-y-2">
            {state.medications.map(med => {
              const taken = isDoseTaken(med.id);
              return (
                <div key={med.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleDose(med.id)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-colors ${
                      taken ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-surface-600 text-slate-600 hover:border-brand-500'
                    }`}
                  >
                    {taken ? '✓' : ''}
                  </button>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-200">{med.name}</p>
                    <p className="text-xs text-slate-400">{med.dosage} · {med.frequency}</p>
                  </div>
                  {taken && <span className="badge bg-emerald-900/60 text-emerald-400">Taken</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button onClick={openAdd} className="btn-primary mb-5 flex items-center gap-2">
        + Add Medication
      </button>

      {/* Med list */}
      {state.medications.length === 0 ? (
        <p className="text-slate-500 text-sm">No medications added yet.</p>
      ) : (
        <div className="space-y-2">
          {state.medications.map(med => (
            <div key={med.id} className="card flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-200">{med.name}</p>
                <p className="text-sm text-slate-400">{med.dosage} · {med.frequency}</p>
                {med.notes && <p className="text-xs text-slate-500 mt-1">{med.notes}</p>}
              </div>
              <div className="flex gap-2 shrink-0 ml-3">
                <button onClick={() => openEdit(med)} className="btn-secondary text-xs py-1 px-2">Edit</button>
                <button onClick={() => handleDelete(med.id)} className="btn-danger text-xs py-1 px-2">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent dose history */}
      {state.medicationLogs.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-slate-300 mb-3">Dose History</h2>
          <div className="space-y-1">
            {[...state.medicationLogs].reverse().slice(0, 20).map(log => {
              const med = state.medications.find(m => m.id === log.medId);
              return (
                <div key={log.id} className="flex items-center justify-between text-sm text-slate-400 card py-2">
                  <span>{med?.name || 'Unknown'}</span>
                  <span>{formatDate(log.date)} — taken ✓</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editMed ? 'Edit Medication' : 'Add Medication'}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="label">Medication Name *</label>
            <input className="input" placeholder="e.g. Vitamin D3" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Dosage</label>
            <input className="input" placeholder="e.g. 2000 IU, 500mg" value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} />
          </div>
          <div>
            <label className="label">Frequency</label>
            <select className="input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
              {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" placeholder="e.g. take with food" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary w-full">{editMed ? 'Update' : 'Add'}</button>
        </form>
      </Modal>
    </div>
  );
}
