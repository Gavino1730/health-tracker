import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate, minutesToHoursLabel } from '../../utils/dateUtils';
import { WORKOUT_TEMPLATES } from '../../utils/workoutLibrary';
import { recommendWorkout } from '../../services/api';
import WorkoutSession from './WorkoutSession';
import Modal from '../shared/Modal';

const WORKOUT_TYPES = ['Strength', 'Cardio', 'HIIT', 'Mobility', 'Sport', 'Yoga', 'Other'];

export default function WorkoutLog() {
  const { state, dispatch } = useApp();
  const [activeSession, setActiveSession] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: today(), type: 'Strength', name: '', durationMins: '', notes: '' });

  // AI recommendation state
  const [aiRec, setAiRec] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAllExercises, setShowAllExercises] = useState(false);

  const fetchRec = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    setAiRec(null);
    setShowAllExercises(false);
    try {
      const rec = await recommendWorkout(state);
      setAiRec(rec);
    } catch (err) {
      setAiError(err.message || 'Could not load recommendation');
    } finally {
      setAiLoading(false);
    }
  }, [state]);

  useEffect(() => {
    fetchRec();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* ── AI Recommendation ─────────────────────────────────────────────── */}
      {aiLoading && (
        <div className="card mb-6 flex items-center gap-3 text-slate-400">
          <div className="animate-spin text-xl">⚡</div>
          <div>
            <p className="text-sm font-semibold text-slate-300">Building your personalized plan…</p>
            <p className="text-xs">Analyzing your sleep, soreness, injuries, and training history</p>
          </div>
        </div>
      )}

      {aiError && !aiLoading && (
        <div className="card mb-6 border border-red-800/40 text-sm text-red-400 flex items-center justify-between">
          <span>⚠️ {aiError}</span>
          <button onClick={fetchRec} className="ml-3 underline hover:text-red-300">Retry</button>
        </div>
      )}

      {aiRec && !aiLoading && (
        <div className={`card mb-6 ${aiRec.shouldTrain ? 'border border-brand-600/40 bg-brand-900/10' : 'border border-emerald-800/40 bg-emerald-900/10'}`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{aiRec.routineIcon || '🤖'}</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-400">AI Recommendation</p>
                <h2 className="font-extrabold text-slate-100 text-lg leading-tight">{aiRec.routineName}</h2>
              </div>
            </div>
            <button onClick={fetchRec} className="text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0 ml-2">↻ Refresh</button>
          </div>

          {/* Reasoning */}
          <p className="text-sm text-slate-300 mb-3">{aiRec.reasoning}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {aiRec.intensity && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                aiRec.intensity === 'high' ? 'bg-red-900/50 text-red-300' :
                aiRec.intensity === 'moderate' ? 'bg-yellow-900/50 text-yellow-300' :
                'bg-emerald-900/50 text-emerald-300'
              }`}>{aiRec.intensity} intensity</span>
            )}
            {aiRec.estimatedDurationMins > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-700 text-slate-300">⏱ ~{aiRec.estimatedDurationMins} min</span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full bg-surface-700 text-slate-400">🕐 {aiRec.timing}</span>
          </div>

          {/* Warnings */}
          {aiRec.warnings?.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-3 mb-3">
              <p className="text-xs font-bold text-yellow-400 mb-1">⚠️ Heads Up</p>
              {aiRec.warnings.map((w, i) => (
                <p key={i} className="text-xs text-yellow-300">• {w}</p>
              ))}
            </div>
          )}

          {/* Exercise list */}
          {aiRec.exercises?.length > 0 && (
            <div className="bg-surface-700 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Exercises</p>
              <div className="space-y-2">
                {(showAllExercises ? aiRec.exercises : aiRec.exercises.slice(0, 5)).map((ex, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-slate-200">{ex.name}</span>
                      <span className="text-xs font-bold text-brand-400">{ex.sets}×{ex.reps}</span>
                    </div>
                    {ex.notes && (
                      <p className="text-xs text-slate-500 mt-0.5">{ex.notes}</p>
                    )}
                  </div>
                ))}
              </div>
              {aiRec.exercises.length > 5 && (
                <button
                  onClick={() => setShowAllExercises(v => !v)}
                  className="text-xs text-brand-400 hover:text-brand-300 mt-2 transition-colors"
                >
                  {showAllExercises ? '▲ Show less' : `▼ Show ${aiRec.exercises.length - 5} more`}
                </button>
              )}
            </div>
          )}

          {/* CTA */}
          {aiRec.shouldTrain ? (
            <button
              onClick={() => startTemplate({
                id: 'ai-rec',
                name: aiRec.routineName,
                icon: aiRec.routineIcon || '🤖',
                exercises: (aiRec.exercises || []).map((ex, i) => ({ id: `ai-${i}`, ...ex })),
              })}
              className="btn-primary w-full py-2.5 text-base font-bold"
            >
              ▶ Start This Workout
            </button>
          ) : (
            <div className="text-center py-2 text-emerald-400 font-semibold text-sm">
              🌿 Rest day — recovery is training too
            </div>
          )}
        </div>
      )}

      {/* ── Template picker ───────────────────────────────────────────────── */}
      <div className="card mb-6">
        <h2 className="font-bold text-slate-400 mb-3 text-sm uppercase tracking-wide">Or Browse All Templates</h2>
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
