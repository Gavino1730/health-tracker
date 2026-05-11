import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { isoNow, formatDateTime } from '../../utils/dateUtils';
import { STRETCHING_ROUTINES } from '../../utils/routineLibrary';
import { recommendStretch } from '../../services/api';

function RoutinePicker({ onSelect }) {
  return (
    <div>
      <h1 className="section-title">Stretching & Mobility</h1>
      <p className="text-slate-400 text-sm mb-5">Or choose a preset routine below.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STRETCHING_ROUTINES.map(r => (
          <button
            key={r.id}
            onClick={() => onSelect(r)}
            className="card text-left hover:border hover:border-brand-500 transition-all group"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{r.icon}</span>
              <div>
                <p className="font-bold text-slate-200 group-hover:text-brand-400 transition-colors">{r.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>
                <p className="text-xs text-brand-400 mt-1">{r.durationLabel} · {r.exercises.length} exercises</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveSession({ routine, onComplete, onBack }) {
  const [exercises, setExercises] = useState(routine.exercises.map(ex => ({
    ...ex,
    completed: false,
    skipped: false,
    sessionNotes: '',
  })));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [startTime] = useState(new Date());

  const current = exercises[currentIdx];
  const completedCount = exercises.filter(e => e.completed).length;
  const pct = Math.round((exercises.filter(e => e.completed || e.skipped).length / exercises.length) * 100);

  function updateNotes(val) {
    setExercises(prev => prev.map((e, i) => i === currentIdx ? { ...e, sessionNotes: val } : e));
  }

  function markDone(skipped = false) {
    setExercises(prev => prev.map((e, i) => i === currentIdx ? { ...e, completed: !skipped, skipped } : e));
    if (currentIdx < exercises.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      finishSession();
    }
  }

  function finishSession() {
    const durationMins = Math.round((new Date() - startTime) / 60000);
    onComplete({
      id: uuidv4(),
      routineId: routine.id,
      routineName: routine.name,
      exercises,
      completedCount: exercises.filter(e => e.completed).length,
      startedAt: startTime.toISOString(),
      completedAt: isoNow(),
      durationMins,
    });
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-extrabold text-lg text-slate-100">{routine.icon} {routine.name}</h1>
          <p className="text-xs text-slate-400">{completedCount}/{exercises.length} exercises</p>
        </div>
        <button onClick={onBack} className="btn-secondary text-sm py-1 px-3">← Exit</button>
      </div>

      {/* Progress */}
      <div className="h-2 bg-surface-700 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* Exercise dots nav */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {exercises.map((e, i) => (
          <button
            key={i}
            onClick={() => setCurrentIdx(i)}
            className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${
              i === currentIdx ? 'bg-brand-500 text-white' :
              e.completed ? 'bg-emerald-600 text-white' :
              e.skipped ? 'bg-yellow-700 text-white' :
              'bg-surface-700 text-slate-400'
            }`}
          >
            {e.completed ? '✓' : e.skipped ? '→' : i + 1}
          </button>
        ))}
      </div>

      {/* Current exercise */}
      {current && (
        <div className="card mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xs font-bold uppercase text-brand-400 tracking-widest">Exercise {currentIdx + 1}/{exercises.length}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 mb-1">{current.name}</h2>
          {current.duration && (
            <div className="inline-flex items-center gap-1 bg-brand-900/40 text-brand-300 text-sm font-semibold px-3 py-1 rounded-full mb-2">
              ⏱ {current.duration}
            </div>
          )}
          {current.reps && (
            <div className="inline-flex items-center gap-1 bg-surface-700 text-slate-300 text-sm font-semibold px-3 py-1 rounded-full mb-2 ml-2">
              🔁 {current.reps}
            </div>
          )}
          {current.notes && (
            <p className="text-sm text-slate-400 italic mt-2 mb-3">{current.notes}</p>
          )}

          <div className="mb-4">
            <label className="label">Session Notes</label>
            <textarea
              className="input"
              rows={2}
              placeholder="How did it feel? Modifications made?"
              value={current.sessionNotes}
              onChange={e => updateNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => markDone(false)} className="btn-primary flex-1 py-3">
              {currentIdx === exercises.length - 1 ? '✓ Finish Routine' : '✓ Done'}
            </button>
            <button onClick={() => markDone(true)} className="btn-secondary py-3 px-4">Skip</button>
          </div>
        </div>
      )}

      {/* All exercises list */}
      <div className="card">
        <h3 className="text-sm font-bold text-slate-400 mb-2">Full Routine</h3>
        <div className="space-y-1">
          {exercises.map((e, i) => (
            <div
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                i === currentIdx ? 'bg-brand-800/60 border border-brand-600' :
                e.completed ? 'bg-emerald-900/30 text-emerald-300' :
                e.skipped ? 'bg-yellow-900/20 text-yellow-400' :
                'bg-surface-700 text-slate-400'
              }`}
            >
              <span className="w-5 text-center">{e.completed ? '✓' : e.skipped ? '→' : `${i + 1}.`}</span>
              <span className="flex-1 font-semibold">{e.name}</span>
              <span className="text-xs opacity-60">{e.duration || e.reps}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionSummary({ session, onDone }) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="card text-center mb-6">
        <div className="text-5xl mb-3">🧘</div>
        <h1 className="text-2xl font-extrabold text-emerald-400 mb-1">Routine Complete!</h1>
        <p className="text-slate-400">{session.routineName}</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-surface-700 rounded-xl p-3">
            <p className="text-2xl font-bold text-slate-100">{session.durationMins}m</p>
            <p className="text-xs text-slate-400">Duration</p>
          </div>
          <div className="bg-surface-700 rounded-xl p-3">
            <p className="text-2xl font-bold text-emerald-400">{session.completedCount}</p>
            <p className="text-xs text-slate-400">Completed</p>
          </div>
          <div className="bg-surface-700 rounded-xl p-3">
            <p className="text-2xl font-bold text-yellow-400">{session.exercises.filter(e => e.skipped).length}</p>
            <p className="text-xs text-slate-400">Skipped</p>
          </div>
        </div>
      </div>
      <button onClick={onDone} className="btn-primary w-full py-3">Save & Return</button>
    </div>
  );
}

export default function StretchingLibrary() {
  const { state, dispatch } = useApp();
  const [view, setView] = useState('picker');
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [lastSession, setLastSession] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const rec = state.aiStretchRec;

  async function fetchRec() {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await recommendStretch(state);
      dispatch({ type: ACTIONS.SET_AI_STRETCH_REC, payload: { ...result, generatedAt: new Date().toISOString() } });
    } catch (err) {
      setAiError(err.message || 'Could not generate recommendation');
    } finally {
      setAiLoading(false);
    }
  }

  function handleSelect(routine) {
    setSelectedRoutine(routine);
    setView('session');
  }

  function startAiRoutine() {
    if (!rec?.exercises?.length) return;
    handleSelect({
      id: 'ai-stretch',
      name: rec.routineName,
      icon: rec.routineIcon || '🧘',
      description: rec.reasoning,
      durationLabel: `~${rec.estimatedDurationMins} min`,
      exercises: rec.exercises.map((ex, i) => ({
        id: `ai-s-${i}`,
        name: ex.name,
        duration: ex.duration || null,
        reps: ex.reps || null,
        notes: ex.notes || '',
      })),
    });
  }

  function handleComplete(sessionData) {
    dispatch({ type: ACTIONS.ADD_STRETCH_SESSION, payload: sessionData });
    setLastSession(sessionData);
    setView('summary');
  }

  if (view === 'session' && selectedRoutine) {
    return <ActiveSession routine={selectedRoutine} onComplete={handleComplete} onBack={() => setView('picker')} />;
  }
  if (view === 'summary' && lastSession) {
    return <SessionSummary session={lastSession} onDone={() => setView('picker')} />;
  }

  return (
    <div>
      {/* ── AI Recommendation ─────────────────────────────────────────────── */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-200">
            {rec ? `${rec.routineIcon || '🧘'} ${rec.routineName}` : '✨ AI Recommendation'}
          </h2>
          <div className="flex items-center gap-2">
            {rec?.generatedAt && (
              <span className="text-xs text-slate-500">{new Date(rec.generatedAt).toLocaleDateString()}</span>
            )}
            <button
              onClick={fetchRec}
              disabled={aiLoading}
              className="text-xs bg-surface-700 hover:bg-surface-600 text-slate-300 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-40"
            >
              {aiLoading ? '…' : rec ? '↻ Refresh' : 'Get Recommendation'}
            </button>
          </div>
        </div>

        {aiError && <p className="text-xs text-red-400 mb-3">⚠️ {aiError}</p>}

        {!rec && !aiLoading && !aiError && (
          <p className="text-sm text-slate-500">
            Hit "Get Recommendation" and AI will look at your recent workouts, soreness, and injuries to suggest the right mobility work.
          </p>
        )}

        {aiLoading && <p className="text-sm text-slate-400 animate-pulse">Analyzing your data…</p>}

        {rec && !aiLoading && (
          <>
            <p className="text-sm text-slate-300 mb-1">{rec.reasoning}</p>
            <p className="text-xs text-slate-500 mb-3">🕐 {rec.timing}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {rec.urgency && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  rec.urgency === 'high' ? 'bg-orange-900/50 text-orange-300' :
                  rec.urgency === 'moderate' ? 'bg-yellow-900/50 text-yellow-300' :
                  'bg-emerald-900/50 text-emerald-300'
                }`}>{rec.urgency} priority</span>
              )}
              {rec.estimatedDurationMins > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-surface-700 text-slate-400">⏱ ~{rec.estimatedDurationMins} min</span>
              )}
              {rec.focusAreas?.map((area, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-slate-400">{area}</span>
              ))}
            </div>

            {rec.exercises?.length > 0 && (
              <div className="space-y-1 mb-4">
                {rec.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface-700 rounded-xl px-4 py-2.5">
                    <span className="text-sm font-semibold text-slate-200">{ex.name}</span>
                    <span className="text-xs font-bold text-brand-400">{ex.duration || ex.reps}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={startAiRoutine} className="btn-primary w-full py-2.5 font-bold">
              ▶ Start This Routine
            </button>
          </>
        )}
      </div>

      <RoutinePicker onSelect={handleSelect} />

      {state.stretchSessions.length > 0 && (
        <div className="mt-8">
          <h2 className="font-bold text-slate-300 mb-3">Recent Sessions</h2>
          <div className="space-y-2">
            {[...state.stretchSessions].reverse().slice(0, 10).map(s => (
              <div key={s.id} className="card flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-slate-200">{s.routineName}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(s.completedAt)} · {s.durationMins}min · {s.completedCount} exercises</p>
                </div>
                <span className="badge bg-emerald-900/50 text-emerald-400">Done</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
