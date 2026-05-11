import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate } from '../../utils/dateUtils';
import ScoreInput from '../shared/ScoreInput';
import Modal from '../shared/Modal';
import { recommendInjuryProtocol } from '../../services/api';

const LOCATIONS = ['Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle', 'Left Hip', 'Right Hip', 'Lower Back', 'Upper Back', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow', 'Left Wrist', 'Right Wrist', 'Neck', 'Hamstring (L)', 'Hamstring (R)', 'Quad (L)', 'Quad (R)', 'Calf (L)', 'Calf (R)', 'Other'];
const SEVERITIES = ['Mild', 'Moderate', 'Severe'];
const STATUSES = ['Active', 'Recovering', 'Healed'];
const PHASES = ['Acute / Protect', 'Subacute / Restore', 'Active Recovery', 'Strength & Function', 'Return to Sport', 'Maintenance'];

function emptyInjury() {
  return { location: 'Left Knee', severity: 'Mild', status: 'Active', startDate: today(), phase: 'Acute / Protect', description: '', protocolExercises: '', notes: '' };
}

export default function InjuryTracker() {
  const { state, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editInjury, setEditInjury] = useState(null);
  const [form, setForm] = useState(emptyInjury());
  const [selectedInjury, setSelectedInjury] = useState(null);
  const [painLevel, setPainLevel] = useState(null);
  const [romNote, setRomNote] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProtocol, setAiProtocol] = useState(null);

  function openAdd() { setForm(emptyInjury()); setEditInjury(null); setShowForm(true); }
  function openEdit(inj) { setForm({ ...inj }); setEditInjury(inj); setShowForm(true); }

  function handleSave(e) {
    e.preventDefault();
    if (editInjury) {
      dispatch({ type: ACTIONS.UPDATE_INJURY, payload: { ...editInjury, ...form } });
    } else {
      dispatch({ type: ACTIONS.ADD_INJURY, payload: { ...form, id: uuidv4(), painLog: [], romLog: [], milestones: [], createdAt: isoNow() } });
    }
    setShowForm(false);
  }

  function logPain() {
    if (!selectedInjury || !painLevel) return;
    dispatch({ type: ACTIONS.LOG_INJURY_PAIN, payload: { injuryId: selectedInjury.id, entry: { date: today(), pain: painLevel, createdAt: isoNow() } } });
    setPainLevel(null);
  }

  function logRom() {
    if (!selectedInjury || !romNote.trim()) return;
    dispatch({ type: ACTIONS.LOG_INJURY_ROM, payload: { injuryId: selectedInjury.id, entry: { date: today(), rom: romNote, createdAt: isoNow() } } });
    setRomNote('');
  }

  async function handleAIProtocol(inj) {
    setAiLoading(true);
    try {
      const result = await recommendInjuryProtocol({
        location: inj.location,
        severity: inj.severity,
        currentPhase: inj.phase,
        painLevel: inj.painLog?.slice(-1)[0]?.pain || 5,
        daysElapsed: Math.round((new Date() - new Date(inj.startDate)) / 86400000),
      });
      setAiProtocol(result);
    } catch {}
    setAiLoading(false);
  }

  const statusColors = { Active: 'bg-red-900/60 text-red-400', Recovering: 'bg-yellow-900/60 text-yellow-400', Healed: 'bg-emerald-900/60 text-emerald-400' };

  const displayedInjury = selectedInjury
    ? state.injuries.find(i => i.id === selectedInjury.id)
    : null;

  return (
    <div>
      <h1 className="section-title">Injury Tracker</h1>
      <button onClick={openAdd} className="btn-primary mb-5">+ Log Injury</button>

      {state.injuries.length === 0 ? (
        <p className="text-slate-500 text-sm">No injuries tracked yet. Stay healthy!</p>
      ) : (
        <div className="space-y-3">
          {state.injuries.map(inj => (
            <div key={inj.id} className="card cursor-pointer hover:border hover:border-brand-600 transition-all" onClick={() => setSelectedInjury(inj)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-slate-200">{inj.location}</p>
                    <span className={`badge ${statusColors[inj.status] || 'bg-surface-700 text-slate-400'}`}>{inj.status}</span>
                    <span className="badge bg-surface-700 text-slate-400">{inj.severity}</span>
                  </div>
                  <p className="text-xs text-slate-400">Since {formatDate(inj.startDate)} · Phase: {inj.phase}</p>
                </div>
                <div className="flex gap-2 shrink-0 ml-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(inj)} className="btn-secondary text-xs py-1 px-2">Edit</button>
                  <button onClick={() => dispatch({ type: ACTIONS.DELETE_INJURY, payload: inj.id })} className="btn-danger text-xs py-1 px-2">✕</button>
                </div>
              </div>
              {inj.description && <p className="text-xs text-slate-400">{inj.description}</p>}
              {inj.painLog?.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Latest pain: {inj.painLog[inj.painLog.length - 1].pain}/10 on {formatDate(inj.painLog[inj.painLog.length - 1].date)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Injury detail modal */}
      <Modal open={!!selectedInjury} onClose={() => { setSelectedInjury(null); setAiProtocol(null); }} title={displayedInjury?.location || 'Injury Detail'}>
        {displayedInjury && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-surface-700 rounded-xl p-3"><p className="font-bold text-slate-200">{displayedInjury.severity}</p><p className="text-xs text-slate-400">Severity</p></div>
              <div className="bg-surface-700 rounded-xl p-3"><p className="font-bold text-slate-200">{displayedInjury.status}</p><p className="text-xs text-slate-400">Status</p></div>
              <div className="bg-surface-700 rounded-xl p-3 col-span-2"><p className="font-bold text-slate-200">{displayedInjury.phase}</p><p className="text-xs text-slate-400">Current Phase</p></div>
            </div>

            {displayedInjury.protocolExercises && (
              <div><p className="label">Protocol / Exercises</p><p className="text-sm text-slate-300 whitespace-pre-line">{displayedInjury.protocolExercises}</p></div>
            )}

            {/* Log pain */}
            <div>
              <label className="label">Log Today's Pain (1-10)</label>
              <ScoreInput value={painLevel} onChange={setPainLevel} />
              <button onClick={logPain} disabled={!painLevel} className="btn-secondary text-sm mt-2">Log Pain Level</button>
            </div>

            {/* Pain history */}
            {displayedInjury.painLog?.length > 0 && (
              <div>
                <p className="label">Pain History</p>
                <div className="space-y-1">
                  {[...displayedInjury.painLog].reverse().slice(0, 7).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-slate-400 bg-surface-700 rounded-lg px-3 py-1.5">
                      <span>{formatDate(p.date)}</span>
                      <span className={`font-bold ${p.pain <= 3 ? 'text-emerald-400' : p.pain <= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{p.pain}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Log ROM */}
            <div>
              <label className="label">Log ROM Note</label>
              <div className="flex gap-2">
                <input className="input" placeholder="e.g. 90° flexion, improved by 10°" value={romNote} onChange={e => setRomNote(e.target.value)} />
                <button onClick={logRom} className="btn-secondary shrink-0">Log</button>
              </div>
              {displayedInjury.romLog?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {[...displayedInjury.romLog].reverse().slice(0, 5).map((r, i) => (
                    <div key={i} className="text-xs text-slate-400 bg-surface-700 rounded-lg px-3 py-1.5 flex justify-between">
                      <span>{formatDate(r.date)}</span><span>{r.rom}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Protocol */}
            <div>
              <button onClick={() => handleAIProtocol(displayedInjury)} disabled={aiLoading} className="btn-secondary w-full">
                {aiLoading ? '🔄 Getting recommendations...' : '🤖 AI Protocol Recommendation'}
              </button>
              {aiProtocol && (
                <div className="mt-3 p-3 bg-brand-900/30 border border-brand-800 rounded-xl space-y-2">
                  <p className="font-semibold text-brand-300">Phase: {aiProtocol.phaseName}</p>
                  <div className="space-y-1">
                    {aiProtocol.exercises.map((ex, i) => (
                      <div key={i} className="text-xs text-slate-300">
                        <span className="font-semibold">{ex.name}</span> — {ex.sets} sets × {ex.reps}
                        {ex.notes && <span className="text-slate-500"> · {ex.notes}</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">Next milestone: {aiProtocol.nextMilestone}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit form modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editInjury ? 'Edit Injury' : 'Log Injury'}>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Location</label>
              <select className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Severity</label>
              <select className="input" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                {SEVERITIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Protocol Phase</label>
            <select className="input" value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}>
              {PHASES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" placeholder="How did it happen?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Protocol / Exercises</label>
            <textarea className="input" rows={3} placeholder="e.g. Phase 1: isometrics, ROM work..." value={form.protocolExercises} onChange={e => setForm(f => ({ ...f, protocolExercises: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary w-full">{editInjury ? 'Update' : 'Save Injury'}</button>
        </form>
      </Modal>
    </div>
  );
}
