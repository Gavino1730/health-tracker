import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate, minutesToHoursLabel } from '../../utils/dateUtils';
import { WORKOUT_TEMPLATES } from '../../utils/workoutLibrary';
import WorkoutSession from './WorkoutSession';
import Modal from '../shared/Modal';

const WORKOUT_TYPES = ['Strength', 'Cardio', 'HIIT', 'Mobility', 'Sport', 'Yoga', 'Other'];

export default function WorkoutLog() {
  const { state, dispatch } = useApp();
  const [activeSession, setActiveSession] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: today(), type: 'Strength', name: '', durationMins: '', notes: '' });

  // Quick log (no session)
  function handleQuickLog(e) {
    e.preventDefault();
    dispatch({
      type: ACTIONS.ADD_WORKOUT,
      payload: { ...form, id: uuidv4(), createdAt: isoNow() },
    });
    setForm({ date: today(), type: 'Strength', name: '', durationMins: '', notes: '' });
    setShowForm(false);
  }

  function startTemplate(template) {
    setActiveSession({ ...template, startedAt: isoNow() });
  }

  function handleSessionComplete(sessionData) {
    // Save as workout session
    dispatch({ type: ACTIONS.ADD_WORKOUT_SESSION, payload: sessionData });
    // Also log as workout entry
    dispatch({
      type: ACTIONS.ADD_WORKOUT,
      payload: {
        id: uuidv4(),
        name: sessionData.name,
        type: 'Strength',
        date: today(),
        durationMins: sessionData.durationMins || 0,
        notes: `Completed session: ${sessionData.name}`,
        createdAt: isoNow(),
      },
    });
    setActiveSession(null);
  }

  if (activeSession) {
    return <WorkoutSession session={activeSession} onComplete={handleSessionComplete} onCancel={() => setActiveSession(null)} />;
  }

  return (
    <div>
      <h1 className="section-title">Workouts</h1>

      {/* Template picker */}
      <div className="card mb-6">
        <h2 className="font-bold text-slate-200 mb-3">Start a Session</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WORKOUT_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => startTemplate(t)}
              className="flex items-center gap-3 bg-surface-700 hover:bg-surface-600 rounded-xl px-4 py-3 text-left transition-colors"
            >
              <span className="text-2xl">{t.icon}</span>
              <div>
                <p className="font-semibold text-slate-200 text-sm">{t.name}</p>
                <p className="text-xs text-slate-400">{t.exercises.length} exercises</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick-log button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-slate-300">Workout History</h2>
        <button onClick={() => setShowForm(true)} className="btn-secondary text-sm">+ Quick Log</button>
      </div>

      {/* History */}
      {state.workouts.length === 0 ? (
        <p className="text-slate-500 text-sm">No workouts logged yet.</p>
      ) : (
        <div className="space-y-2">
          {[...state.workouts].reverse().map(w => (
            <div key={w.id} className="card flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-200">{w.name || w.type}</p>
                <p className="text-sm text-slate-400">
                  {formatDate(w.date)} · {w.type}
                  {w.durationMins ? ` · ${minutesToHoursLabel(Number(w.durationMins))}` : ''}
                </p>
                {w.notes && <p className="text-xs text-slate-500 mt-0.5">{w.notes}</p>}
              </div>
              <button onClick={() => dispatch({ type: ACTIONS.DELETE_WORKOUT, payload: w.id })} className="text-red-400 hover:text-red-300 ml-3 shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Quick Log Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Quick Log Workout">
        <form onSubmit={handleQuickLog} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {WORKOUT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Name / Description</label>
            <input className="input" placeholder="e.g. Morning run, Upper body" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input type="number" min="0" className="input" placeholder="e.g. 45" value={form.durationMins} onChange={e => setForm(f => ({ ...f, durationMins: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary w-full">Log Workout</button>
        </form>
      </Modal>
    </div>
  );
}
