import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate } from '../../utils/dateUtils';
import PhotoCapture from '../shared/PhotoCapture';
import Modal from '../shared/Modal';
import { analyzeBodyPhoto, estimateBodyComposition } from '../../services/api';

const MEASUREMENTS = [
  { key: 'chest',    label: 'Chest (in)' },
  { key: 'waist',    label: 'Waist (in)' },
  { key: 'hips',     label: 'Hips (in)' },
  { key: 'thighs',   label: 'Thighs (in)' },
  { key: 'calves',   label: 'Calves (in)' },
  { key: 'biceps',   label: 'Biceps (in)' },
  { key: 'forearms', label: 'Forearms (in)' },
  { key: 'neck',     label: 'Neck (in)' },
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

  // AI Analysis state
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisPhoto, setAnalysisPhoto] = useState(null); // { preview: base64 }
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  // AI Trend Estimate state
  const [trendResult, setTrendResult] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState(null);
  const [showTrend, setShowTrend] = useState(false);

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

  function handleAnalysisPhoto({ preview }) {
    setAnalysisPhoto({ preview });
    setAnalysisResult(null);
    setAnalysisError(null);
  }

  async function runAnalysis() {
    if (!analysisPhoto) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await analyzeBodyPhoto(
        analysisPhoto.preview,
        state.bodyLogs,
        {
          checkins: state.checkins,
          workouts: state.workouts,
          sleep: state.sleep,
        }
      );
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisError(err.message || 'Analysis failed. Check your API key and try again.');
    }
    setAnalysisLoading(false);
  }

  function closeAnalysis() {
    setShowAnalysis(false);
    setAnalysisPhoto(null);
    setAnalysisResult(null);
    setAnalysisError(null);
  }

  async function handleEstimateTrend() {
    setTrendLoading(true);
    setTrendError(null);
    try {
      const result = await estimateBodyComposition([], state.bodyLogs);
      setTrendResult(result);
      setShowTrend(true);
    } catch (err) {
      setTrendError(err.message || 'Trend analysis failed');
    }
    setTrendLoading(false);
  }

  return (
    <div>
      <h1 className="section-title">Body Composition</h1>

      <div className="flex gap-3 mb-5 flex-wrap">
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Log Measurements</button>
        <button onClick={() => setShowAnalysis(true)} className="btn-secondary flex items-center gap-2">🤖 AI Photo Analysis</button>
        {state.bodyLogs.length >= 2 && (
          <button
            onClick={handleEstimateTrend}
            disabled={trendLoading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-40"
          >
            {trendLoading ? '📈 Analyzing…' : '📈 AI Trend Analysis'}
          </button>
        )}
      </div>

      {trendError && <p className="text-sm text-red-400 mb-4">{trendError}</p>}

      {showTrend && trendResult && (
        <div className="card mb-5 space-y-3">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-400">Measurement Trend Analysis</p>
            <button onClick={() => setShowTrend(false)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface-700 rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${(trendResult.muscleChangePct || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(trendResult.muscleChangePct || 0) >= 0 ? '+' : ''}{trendResult.muscleChangePct ?? '—'}%
              </p>
              <p className="text-xs text-slate-400">Muscle</p>
            </div>
            <div className="bg-surface-700 rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${(trendResult.fatChangePct || 0) <= 0 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {(trendResult.fatChangePct || 0) >= 0 ? '+' : ''}{trendResult.fatChangePct ?? '—'}%
              </p>
              <p className="text-xs text-slate-400">Fat</p>
            </div>
            <div className="bg-surface-700 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-slate-100 capitalize">{trendResult.trend ?? '—'}</p>
              <p className="text-xs text-slate-400">Trend</p>
            </div>
          </div>
          {trendResult.notes && (
            <p className="text-sm text-slate-300 bg-surface-700 rounded-xl px-3 py-2">{trendResult.notes}</p>
          )}
        </div>
      )}

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
                    {log.weight && <span>⚖️ {log.weight} lbs</span>}
                    {log.bodyFatPct && <span>📊 {log.bodyFatPct}% BF</span>}
                    {log.photoIds?.length > 0 && <span>📷 {log.photoIds.length} photo{log.photoIds.length > 1 ? 's' : ''}</span>}
                  </div>
                  {Object.keys(log.measurements || {}).length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {Object.entries(log.measurements).filter(([,v]) => v).map(([k, v]) => (
                        <span key={k} className="badge bg-surface-700 text-slate-300">{k}: {v}"</span>
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
              <label className="label">Weight (lbs)</label>
              <input type="number" step="0.1" className="input" placeholder="e.g. 175" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
            <div>
              <label className="label">Height (in)</label>
              <input type="number" step="0.25" className="input" placeholder="e.g. 70" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} />
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
              {selectedLog.weight && <div className="bg-surface-700 rounded-xl p-3 text-center"><p className="text-xl font-bold text-slate-100">{selectedLog.weight}</p><p className="text-xs text-slate-400">lbs</p></div>}
              {selectedLog.bodyFatPct && <div className="bg-surface-700 rounded-xl p-3 text-center"><p className="text-xl font-bold text-slate-100">{selectedLog.bodyFatPct}%</p><p className="text-xs text-slate-400">Body Fat</p></div>}
              {selectedLog.height && <div className="bg-surface-700 rounded-xl p-3 text-center"><p className="text-xl font-bold text-slate-100">{Math.floor(selectedLog.height/12)}'{Math.round(selectedLog.height%12)}"</p><p className="text-xs text-slate-400">Height</p></div>}
            </div>
            {Object.keys(selectedLog.measurements || {}).length > 0 && (
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(selectedLog.measurements).filter(([,v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm text-slate-400 bg-surface-700 rounded-lg px-3 py-1.5">
                    <span className="capitalize">{k}</span><span className="font-semibold text-slate-200">{v}"</span>
                  </div>
                ))}
              </div>
            )}
            {selectedLog.notes && <p className="text-sm text-slate-400 italic">{selectedLog.notes}</p>}
          </div>
        </Modal>
      )}
      {/* AI Body Analysis modal */}
      <Modal open={showAnalysis} onClose={closeAnalysis} title="🤖 AI Body Analysis">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Take or upload a body photo. The AI will analyze it alongside your measurement history, workouts, sleep, and check-ins.
          </p>

          {/* Context summary */}
          <div className="bg-surface-700 rounded-xl p-3 text-xs text-slate-400 flex flex-wrap gap-3">
            <span>📏 {state.bodyLogs.length} measurement log{state.bodyLogs.length !== 1 ? 's' : ''}</span>
            <span>🏋️ {state.workouts?.length || 0} workouts</span>
            <span>😴 {state.sleep?.length || 0} sleep logs</span>
            <span>📋 {state.checkins?.length || 0} check-ins</span>
          </div>

          {/* Photo capture */}
          <div>
            <label className="label mb-2">Body Photo for Analysis</label>
            {analysisPhoto && (
              <div className="mb-3">
                <img
                  src={analysisPhoto.preview}
                  alt="Analysis"
                  className="w-48 h-48 object-cover rounded-xl border border-surface-600 mx-auto block"
                />
                <button
                  type="button"
                  onClick={() => { setAnalysisPhoto(null); setAnalysisResult(null); setAnalysisError(null); }}
                  className="text-xs text-slate-500 hover:text-slate-300 mt-1 block mx-auto"
                >
                  Remove photo
                </button>
              </div>
            )}
            <PhotoCapture onCapture={handleAnalysisPhoto} label={analysisPhoto ? 'Replace Photo' : 'Take / Upload Photo'} />
            <p className="text-xs text-slate-500 mt-1">Photo is used only for this analysis and not saved to your logs.</p>
          </div>

          {analysisError && (
            <p className="text-sm text-red-400 bg-red-900/20 rounded-xl px-3 py-2">{analysisError}</p>
          )}

          {/* Results */}
          {analysisResult && (
            <div className="space-y-3">
              <div className="bg-surface-700 rounded-xl p-4">
                <p className="text-sm text-slate-200 leading-relaxed">{analysisResult.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {analysisResult.estimatedBodyFat && (
                  <div className="bg-surface-700 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-brand-400">{analysisResult.estimatedBodyFat}</p>
                    <p className="text-xs text-slate-400">Est. Body Fat</p>
                  </div>
                )}
                {analysisResult.muscleDefinition && (
                  <div className="bg-surface-700 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-slate-100 capitalize">{analysisResult.muscleDefinition}</p>
                    <p className="text-xs text-slate-400">Muscle Definition</p>
                  </div>
                )}
                {analysisResult.trend && analysisResult.trend !== 'unknown' && (
                  <div className="bg-surface-700 rounded-xl p-3 text-center col-span-2">
                    <p className="text-lg font-bold text-slate-100 capitalize">{analysisResult.trend}</p>
                    <p className="text-xs text-slate-400">Overall Trend</p>
                  </div>
                )}
              </div>

              {analysisResult.posture && (
                <div>
                  <p className="label mb-1">Posture Observation</p>
                  <p className="text-sm text-slate-300 bg-surface-700 rounded-xl px-3 py-2">{analysisResult.posture}</p>
                </div>
              )}

              {analysisResult.strengths?.length > 0 && (
                <div>
                  <p className="label mb-1">Strengths</p>
                  <ul className="space-y-1">
                    {analysisResult.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">✓</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.recommendations?.length > 0 && (
                <div>
                  <p className="label mb-1">Recommendations</p>
                  <ul className="space-y-1">
                    {analysisResult.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-brand-400 mt-0.5">→</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.confidence !== undefined && (
                <p className="text-xs text-slate-500 text-right">
                  AI confidence: {Math.round(analysisResult.confidence * 100)}%
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={runAnalysis}
            disabled={!analysisPhoto || analysisLoading}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {analysisLoading ? 'Analyzing…' : analysisResult ? 'Re-analyze' : 'Analyze'}
          </button>
        </div>
      </Modal>

    </div>
  );
}
