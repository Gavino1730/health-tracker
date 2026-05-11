import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { isoNow } from '../../utils/dateUtils';
import { adjustWorkoutSession } from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function WorkoutSession({ session, onComplete, onCancel }) {
  const { state: appState } = useApp();

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
  const [rpe, setRpe] = useState(null);

  // AI chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

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

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (showChat) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showChat]);

  // Apply AI-modified exercises from the current position forward
  function applyAiModifications(newExercises) {
    const preserved = sets.slice(0, currentExIdx);
    const newSetsState = newExercises.map((ex, i) => ({
      ...ex,
      id: `ai-adj-${Date.now()}-${i}`,
      setsList: Array.from({ length: ex.sets }, (_, j) => ({
        setNum: j + 1,
        reps: ex.reps,
        weight: '',
        notes: ex.notes || '',
        completed: false,
        skipped: false,
      })),
    }));
    setSets([...preserved, ...newSetsState]);
    setCurrentExIdx(preserved.length);
    setCurrentSetIdx(0);
  }

  async function handleAiChat(e) {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const sessionSummary = {
        name: session.name,
        currentExercise: sets[currentExIdx]?.name,
        remainingExercises: sets.slice(currentExIdx).map(ex => ({
          name: ex.name,
          sets: ex.setsList.length,
          reps: ex.setsList[0]?.reps,
          notes: ex.notes,
        })),
      };
      const result = await adjustWorkoutSession(msg, sessionSummary, {
        injuries: appState.injuries,
        profile: appState.profile,
      });
      setChatMessages(prev => [...prev, {
        role: 'ai',
        text: result.reply,
        modifiedExercises: result.modifySession ? result.modifiedExercises : null,
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: `Couldn't connect: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  function finishSession() {    const durationMins = Math.round((new Date() - startTime) / 60000);
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

        <div className="card mb-4">
          <p className="font-bold text-slate-200 mb-3">How hard was this workout? <span className="text-slate-400 font-normal text-sm">(RPE 1–10)</span></p>
          <div className="grid grid-cols-5 gap-2">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                onClick={() => setRpe(n)}
                className={`py-2 rounded-xl font-bold text-sm transition-colors ${
                  rpe === n ? 'bg-brand-600 text-white' :
                  n <= 3 ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/40' :
                  n <= 6 ? 'bg-yellow-900/40 text-yellow-300 hover:bg-yellow-800/40' :
                  'bg-red-900/40 text-red-300 hover:bg-red-800/40'
                }`}
              >{n}</button>
            ))}
          </div>
          {rpe && (
            <p className="text-xs text-slate-400 mt-2">
              {rpe <= 3 ? 'Easy — could have done much more' : rpe <= 5 ? 'Moderate — comfortable effort' : rpe <= 7 ? 'Hard — challenging but manageable' : rpe <= 9 ? 'Very Hard — near max effort' : 'All-out max effort'}
            </p>
          )}
        </div>

        <button onClick={() => onComplete({ ...summary, rpe })} className="btn-primary w-full py-3">Save & Exit</button>
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
      <div className="card mb-24">
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

      {/* ── AI Chat Panel ──────────────────────────────────────────────────── */}
      {/* Floating button */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-4 py-3 rounded-full shadow-xl transition-all"
        >
          💬 Ask AI
          {chatMessages.length > 0 && (
            <span className="bg-white text-brand-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {chatMessages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat drawer */}
      {showChat && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-surface-800 border-t border-surface-600 shadow-2xl flex flex-col" style={{ maxHeight: '60vh' }}>
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600 shrink-0">
            <div>
              <p className="font-bold text-slate-100 text-sm">💬 Live AI Coach</p>
              <p className="text-xs text-slate-400">Tell me what's up — I'll adjust your session</p>
            </div>
            <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-slate-200 text-xl leading-none">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chatMessages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 text-center mb-3">Try asking something like…</p>
                {[
                  'My shoulder hurts, swap bench press',
                  'Make this harder',
                  'I\'m tired, cut it short',
                  'What weight should I use?',
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setChatInput(s)}
                    className="w-full text-left text-xs bg-surface-700 hover:bg-surface-600 text-slate-300 px-3 py-2 rounded-xl transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-surface-700 text-slate-200 rounded-bl-sm'
                }`}>
                  <p>{msg.text}</p>
                  {msg.modifiedExercises?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-surface-600">
                      <p className="text-xs font-bold text-brand-300 mb-1.5">Updated plan:</p>
                      {msg.modifiedExercises.map((ex, j) => (
                        <p key={j} className="text-xs text-slate-300">• {ex.name} — {ex.sets}×{ex.reps}</p>
                      ))}
                      <button
                        onClick={() => applyAiModifications(msg.modifiedExercises)}
                        className="mt-2 w-full bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold py-1.5 rounded-xl transition-colors"
                      >
                        ✓ Apply Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-700 text-slate-400 text-sm rounded-2xl rounded-bl-sm px-3 py-2">
                  <span className="animate-pulse">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleAiChat} className="px-4 py-3 border-t border-surface-600 flex gap-2 shrink-0">
            <input
              type="text"
              className="input flex-1 text-sm"
              placeholder="e.g. my knee hurts, make it harder…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={chatLoading}
              autoFocus
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
