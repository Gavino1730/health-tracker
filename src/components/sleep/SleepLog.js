import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import ScoreInput from '../shared/ScoreInput';
import { today, isoNow, formatDate, minutesToHoursLabel } from '../../utils/dateUtils';
import { calculateSleepScore } from '../../utils/scores';
import TrendChart from '../shared/TrendChart';
import PhotoCapture from '../shared/PhotoCapture';

export default function SleepLog() {
  const { state, dispatch } = useApp();
  const [bedtime, setBedtime] = useState('');
  const [waketime, setWaketime] = useState('');
  const [quality, setQuality] = useState(null);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(today());
  const [saved, setSaved] = useState(false);
  const [photoIds, setPhotoIds] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  function handlePhotoCapture({ id, preview }) {
    setPhotoIds(prev => [...prev, id]);
    setPhotoPreviews(prev => [...prev, { id, preview }]);
  }

  function getDuration() {
    if (!bedtime || !waketime) return 0;
    // Build ISO strings for today/tomorrow
    const bed = new Date(`${date}T${bedtime}:00`);
    let wake = new Date(`${date}T${waketime}:00`);
    if (wake <= bed) wake.setDate(wake.getDate() + 1); // crossed midnight
    return Math.round((wake - bed) / 60000);
  }

  const durationMins = getDuration();

  function handleSave(e) {
    e.preventDefault();
    if (!bedtime || !waketime) return;
    const entry = {
      id: uuidv4(),
      date,
      bedtime,
      waketime,
      durationMins,
      quality: quality || 5,
      notes,
      photoIds,
      sleepScore: calculateSleepScore({ durationMins, quality: quality || 5 }),
      createdAt: isoNow(),
    };
    dispatch({ type: ACTIONS.ADD_SLEEP, payload: entry });
    setBedtime(''); setWaketime(''); setQuality(null); setNotes(''); setDate(today());
    setPhotoIds([]); setPhotoPreviews([]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleDelete(id) {
    dispatch({ type: ACTIONS.DELETE_SLEEP, payload: id });
  }

  // Chart data
  const chartData = [...state.sleep]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(s => ({
      date: s.date,
      'Hours': +(s.durationMins / 60).toFixed(1),
      'Quality': s.quality,
      'Score': s.sleepScore,
    }));

  return (
    <div>
      <h1 className="section-title">Sleep Log</h1>

      {/* Form */}
      <form onSubmit={handleSave} className="card space-y-4 mb-6">
        <h2 className="font-bold text-slate-200">Log Sleep</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div />
          <div>
            <label className="label">Bedtime</label>
            <input type="time" className="input" value={bedtime} onChange={e => setBedtime(e.target.value)} />
          </div>
          <div>
            <label className="label">Wake Time</label>
            <input type="time" className="input" value={waketime} onChange={e => setWaketime(e.target.value)} />
          </div>
        </div>
        {durationMins > 0 && (
          <p className="text-sm text-brand-400 font-semibold">Duration: {minutesToHoursLabel(durationMins)}</p>
        )}
        <div>
          <label className="label">Sleep Quality (1-10)</label>
          <ScoreInput value={quality} onChange={setQuality} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} placeholder="e.g. woke up twice, vivid dreams..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div>
          <label className="label">Sleep Screenshot (optional)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {photoPreviews.map(p => (
              <img key={p.id} src={p.preview} alt="sleep screenshot preview" className="w-20 h-20 object-cover rounded-xl border border-surface-600" />
            ))}
          </div>
          <PhotoCapture onCapture={handlePhotoCapture} label="Add Apple Watch Screenshot" />
          <p className="text-xs text-slate-500 mt-1">Screenshots are stored locally on your device only.</p>
        </div>
        <button type="submit" className="btn-primary w-full">Save Sleep</button>
        {saved && <p className="text-emerald-400 text-sm text-center">✓ Saved!</p>}
      </form>

      {/* Trend */}
      {state.sleep.length > 1 && (
        <div className="card mb-6">
          <h2 className="font-semibold text-slate-200 mb-3">Sleep Trends (last 14 days)</h2>
          <TrendChart
            data={chartData}
            series={[{ key: 'Hours', label: 'Hours Slept' }, { key: 'Quality', label: 'Quality' }]}
          />
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="font-bold text-slate-300 mb-3">History</h2>
        {state.sleep.length === 0 ? (
          <p className="text-slate-500 text-sm">No sleep logs yet.</p>
        ) : (
          <div className="space-y-2">
            {[...state.sleep].reverse().map(s => (
              <div key={s.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-200">{formatDate(s.date)}</p>
                  <p className="text-sm text-slate-400">
                    {s.bedtime} → {s.waketime} · {minutesToHoursLabel(s.durationMins)} · Quality: {s.quality}/10 · Score: {s.sleepScore}/10
                  </p>
                  {s.photoIds?.length > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5">📷 {s.photoIds.length} screenshot{s.photoIds.length > 1 ? 's' : ''}</p>
                  )}
                  {s.notes && <p className="text-xs text-slate-500 mt-0.5">{s.notes}</p>}
                </div>
                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 text-sm ml-3 shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
