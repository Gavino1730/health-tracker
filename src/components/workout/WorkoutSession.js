import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { isoNow } from '../../utils/dateUtils';

export default function WorkoutSession({ session, onComplete, onCancel }) {
  // Build sets state from session exercises
  const [sets, setSets] = useState(() =>
    session.exercises.map(ex => ({
      ...ex,
      setsList: Array.from({ length: ex.sets }, (_, i) => ({
        setNum: i + 1,
        reps: ex.reps,
        weight: '',
        notes: ex.notes || '',
        completed: false,
        skipped: false,
      })),
    }))
  );

  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [startTime] = useState(new Date());
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState(null);

  const totalSets = sets.reduce((sum, ex) => sum + ex.setsList.length, 0);
  const completedSets = sets.reduce((sum, ex) => sum + ex.setsList.filter(s => s.completed || s.skipped).length, 0);

  function updateCurrentSet(field, value) {
    setSets(prev => {
      const next = prev.map((ex, ei) => ei !== currentExIdx ? ex : {
        ...ex,
        setsList: ex.setsList.map((s, si) => si !== currentSetIdx ? s : { ...s, [field]: value }),
      });
      return next;
    });
  }

  function markSetComplete(skipped = false) {
    setSets(prev => {
      const next = prev.map((ex, ei) => ei !== currentExIdx ? ex : {
        ...ex,
        setsList: ex.setsList.map((s, si) => si !== currentSetIdx ? s : { ...s, completed: !skipped, skipped }),
      });
      return next;
    });

    // Advance to next set or exercise
    const ex = sets[currentExIdx];
    if (currentSetIdx < ex.setsList.length - 1) {
      setCurrentSetIdx(s => s + 1);
    } else if (currentExIdx < sets.length - 1) {
      setCurrentExIdx(e => e + 1);
      setCurrentSetIdx(0);
    } else {
      finishSession();
    }
  }

  function finishSession() {
    const durationMins = Math.round((new Date() - startTime) / 60000);
    const sessionData = {
      id: uuidv4(),
      name: session.name,
      exercises: sets,
      startedAt: startTime.toISOString(),
      completedAt: isoNow(),
      durationMins,
    };
    setSummary(sessionData);
    setDone(true);
  }

  if (done && summary) {
    const totalCompleted = summary.exercises.reduce((s, ex) => s + ex.setsList.filter(set => set.completed).length, 0);
    const totalSkipped = summary.exercises.reduce((s, ex) => s + ex.setsList.filter(set => set.skipped).length, 0);
    return (
      <div className="max-w-lg mx-auto">
        <div className="card text-center mb-6">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-extrabold text-emerald-400 mb-1">Workout Complete!</h1>
          <p className="text-slate-400">{summary.name}</p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-surface-700 rounded-xl p-3">
              <p className="text-2xl font-bold text-slate-100">{summary.durationMins}m</p>
              <p className="text-xs text-slate-400">Duration</p>
            </div>
            <div className="bg-surface-700 rounded-xl p-3">
              <p className="text-2xl font-bold text-emerald-400">{totalCompleted}</p>
              <p className="text-xs text-slate-400">Sets Done</p>
            </div>
            <div className="bg-surface-700 rounded-xl p-3">
              <p className="text-2xl font-bold text-yellow-400">{totalSkipped}</p>
              <p className="text-xs text-slate-400">Skipped</p>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <h2 className="font-bold text-slate-200 mb-3">Exercise Summary</h2>
          {summary.exercises.map((ex, i) => (
            <div key={i} className="mb-3">
              <p className="font-semibold text-slate-300 text-sm">{ex.name}</p>
              <div className="space-y-0.5 mt-1">
                {ex.setsList.map((s, si) => (
                  <div key={si} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${s.completed ? 'bg-emerald-600 text-white' : s.skipped ? 'bg-yellow-700 text-white' : 'bg-surface-600'}`}>
                      {s.completed ? '✓' : s.skipped ? '→' : ''}
                    </span>
                    Set {s.setNum}: {s.reps} reps{s.weight ? ` @ ${s.weight}` : ''}
                    {s.notes ? ` · ${s.notes}` : ''}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => onComplete(summary)} className="btn-primary w-full py-3">Save & Exit</button>
      </div>
    );
  }

  const currentEx = sets[currentExIdx];
  const currentSet = currentEx?.setsList[currentSetIdx];
  const pct = Math.round((completedSets / totalSets) * 100);

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-extrabold text-lg text-slate-100">{session.name}</h1>
        <button onClick={onCancel} className="btn-secondary text-sm py-1 px-3">Quit</button>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{completedSets} / {totalSets} sets</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Exercise overview */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
        {sets.map((ex, i) => {
          const allDone = ex.setsList.every(s => s.completed || s.skipped);
          return (
            <button
              key={i}
              onClick={() => { setCurrentExIdx(i); setCurrentSetIdx(0); }}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                i === currentExIdx ? 'bg-brand-600 text-white' : allDone ? 'bg-emerald-900/60 text-emerald-400' : 'bg-surface-700 text-slate-400'
              }`}
            >
              {ex.name}
            </button>
          );
        })}
      </div>

      {/* Current set */}
      {currentEx && currentSet && (
        <div className="card mb-4">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-100">{currentEx.name}</h2>
            <span className="text-slate-400 text-sm">Set {currentSet.setNum} of {currentEx.setsList.length}</span>
          </div>
          <p className="text-slate-400 text-sm mb-4">Target: {currentSet.reps} reps</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">Reps Done</label>
              <input
                type="number"
                min="0"
                className="input"
                value={currentSet.reps}
                onChange={e => updateCurrentSet('reps', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Weight (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 80kg"
                value={currentSet.weight}
                onChange={e => updateCurrentSet('weight', e.target.value)}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="label">Notes</label>
            <input
              type="text"
              className="input"
              placeholder="Form notes, feel, etc."
              value={currentSet.notes}
              onChange={e => updateCurrentSet('notes', e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => markSetComplete(false)} className="btn-primary flex-1 py-3">✓ Complete Set</button>
            <button onClick={() => markSetComplete(true)} className="btn-secondary py-3 px-4">Skip</button>
          </div>
        </div>
      )}

      {/* All sets for current exercise */}
      <div className="card">
        <h3 className="text-sm font-bold text-slate-400 mb-2">All Sets — {currentEx?.name}</h3>
        <div className="space-y-1.5">
          {currentEx?.setsList.map((s, si) => (
            <div
              key={si}
              onClick={() => setCurrentSetIdx(si)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                si === currentSetIdx ? 'bg-brand-800/60 border border-brand-600' :
                s.completed ? 'bg-emerald-900/30' : s.skipped ? 'bg-yellow-900/30' : 'bg-surface-700'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                s.completed ? 'bg-emerald-500 text-white' : s.skipped ? 'bg-yellow-600 text-white' : 'bg-surface-600 text-slate-400'
              }`}>
                {s.completed ? '✓' : s.skipped ? '→' : s.setNum}
              </span>
              <span className="text-sm text-slate-300">Set {s.setNum}: {s.reps} reps{s.weight ? ` @ ${s.weight}` : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
