import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { askHealthChat } from '../../services/api';

function getContextCounts(state) {
  return {
    checkins: state.checkins?.length || 0,
    sleep: state.sleep?.length || 0,
    water: state.water?.length || 0,
    meals: state.meals?.length || 0,
    workouts: state.workouts?.length || 0,
    stretchSessions: state.stretchSessions?.length || 0,
    recovery: state.recovery?.length || 0,
    injuries: state.injuries?.length || 0,
    bodyLogs: state.bodyLogs?.length || 0,
    substances: state.substances?.length || 0,
    medications: state.medications?.length || 0,
    medicationLogs: state.medicationLogs?.length || 0,
    events: state.events?.length || 0,
  };
}

export default function HealthChat() {
  const { state } = useApp();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'assistant',
      text: 'Ask anything about your trends, recovery, sleep, nutrition, caffeine, or workouts. I will use your latest logs as context.',
      findings: [],
      followUps: [],
    },
  ]);

  const context = useMemo(() => state, [state]);
  const contextCounts = useMemo(() => getContextCounts(state), [state]);

  async function handleSend(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    const userMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: question,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await askHealthChat(question, context);
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: result?.answer || 'I could not generate an answer right now.',
          findings: Array.isArray(result?.keyFindings) ? result.keyFindings : [],
          followUps: Array.isArray(result?.followUps) ? result.followUps : [],
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: `Chat failed: ${err.message}`,
          findings: [],
          followUps: [],
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <div>
      <h1 className="section-title">Health Chat</h1>

      <div className="card mb-4">
        <h2 className="font-semibold text-slate-200 mb-2">Context Loaded</h2>
        <p className="text-sm text-slate-400">
          Full app context is included for each question.
        </p>
        <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-2">
          <span>Check-ins: {contextCounts.checkins}</span>
          <span>Sleep: {contextCounts.sleep}</span>
          <span>Water: {contextCounts.water}</span>
          <span>Meals: {contextCounts.meals}</span>
          <span>Workouts: {contextCounts.workouts}</span>
          <span>Stretch: {contextCounts.stretchSessions}</span>
          <span>Recovery: {contextCounts.recovery}</span>
          <span>Injuries: {contextCounts.injuries}</span>
          <span>Body: {contextCounts.bodyLogs}</span>
          <span>Substances: {contextCounts.substances}</span>
          <span>Meds: {contextCounts.medications}</span>
          <span>Med logs: {contextCounts.medicationLogs}</span>
          <span>Events: {contextCounts.events}</span>
        </div>
      </div>

      <div className="card mb-4 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`rounded-xl p-3 ${m.role === 'user' ? 'bg-brand-900/30 border border-brand-700/40' : 'bg-surface-700 border border-surface-600'}`}>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">{m.role === 'user' ? 'You' : 'Assistant'}</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{m.text}</p>

            {m.findings?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-400 mb-1">Key findings</p>
                <div className="flex flex-wrap gap-1.5">
                  {m.findings.map((item, i) => (
                    <span key={`${m.id}-f-${i}`} className="badge bg-surface-800 text-slate-300">{item}</span>
                  ))}
                </div>
              </div>
            )}

            {m.followUps?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-400 mb-1">Follow-up questions</p>
                <div className="space-y-1">
                  {m.followUps.map((item, i) => (
                    <button
                      key={`${m.id}-q-${i}`}
                      type="button"
                      onClick={() => setInput(item)}
                      className="text-left w-full text-xs text-brand-300 hover:text-brand-200"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="card space-y-3">
        <label className="label">Ask a question</label>
        <textarea
          className="input"
          rows={3}
          placeholder="e.g. Why has my energy been low this week and what should I change first?"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" className="btn-primary w-full" disabled={loading || !input.trim()}>
          {loading ? 'Thinking...' : 'Ask Health Chat'}
        </button>
      </form>
    </div>
  );
}