import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate, groupByDate } from '../../utils/dateUtils';
import PhotoCapture from '../shared/PhotoCapture';
import Modal from '../shared/Modal';
import { analyzeNutritionPhoto } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function MealEntryModal({ open, onClose, onSave }) {
  const [photo, setPhoto] = useState(null);
  const [description, setDescription] = useState('');
  const [macros, setMacros] = useState({ calories: '', protein: '', carbs: '', fats: '' });
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));

  async function handleAnalyze() {
    if (!photo) return;
    setAnalyzing(true);
    try {
      const result = await analyzeNutritionPhoto(photo.preview, description);
      setAiResult(result);
      setMacros({ calories: result.calories, protein: result.protein, carbs: result.carbs, fats: result.fats });
    } catch {}
    setAnalyzing(false);
  }

  function handleSave(e) {
    e.preventDefault();
    onSave({
      id: uuidv4(),
      date,
      time,
      photoId: photo?.id || null,
      photoPreview: photo?.preview || null,
      description,
      macros: {
        calories: Number(macros.calories) || 0,
        protein: Number(macros.protein) || 0,
        carbs: Number(macros.carbs) || 0,
        fats: Number(macros.fats) || 0,
      },
      aiAnalyzed: !!aiResult,
      createdAt: isoNow(),
    });
    // Reset
    setPhoto(null); setDescription(''); setMacros({ calories: '', protein: '', carbs: '', fats: '' });
    setAiResult(null); setDate(today()); setTime(new Date().toTimeString().slice(0, 5));
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Meal">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        {/* Photo */}
        <div>
          <label className="label">Meal Photo (optional)</label>
          {photo && (
            <img src={photo.preview} alt="meal" className="w-full h-40 object-cover rounded-xl mb-2 border border-surface-600" />
          )}
          <div className="flex gap-2">
            <PhotoCapture onCapture={p => setPhoto(p)} label={photo ? 'Change Photo' : 'Take/Upload Photo'} />
            {photo && (
              <button type="button" onClick={() => setPhoto(null)} className="btn-secondary text-sm py-1 px-3">Remove</button>
            )}
          </div>
        </div>

        <div>
          <label className="label">Description / What did you eat?</label>
          <textarea className="input" rows={3} placeholder="e.g. Grilled chicken breast with brown rice and broccoli..." value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        {/* AI analysis */}
        {photo && (
          <div>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
            >
              {analyzing ? '🔄 Analyzing...' : '🤖 Estimate Macros with AI'}
            </button>
            {aiResult && (
              <p className="text-xs text-slate-500 mt-1 text-center">AI confidence: {Math.round((aiResult.confidence || 0) * 100)}% · {aiResult.description}</p>
            )}
          </div>
        )}

        {/* Macros */}
        <div>
          <label className="label">Macros (manual or AI-filled)</label>
          <div className="grid grid-cols-2 gap-2">
            {[['calories', 'Calories (kcal)'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fats', 'Fats (g)']].map(([k, l]) => (
              <div key={k}>
                <label className="text-xs text-slate-400 mb-0.5 block">{l}</label>
                <input type="number" min="0" className="input" value={macros[k]} onChange={e => setMacros(m => ({ ...m, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full">Save Meal</button>
      </form>
    </Modal>
  );
}

export default function NutritionLog() {
  const { state, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('log');

  function handleSave(meal) {
    dispatch({ type: ACTIONS.ADD_MEAL, payload: meal });
  }

  // Weekly summary
  const grouped = groupByDate([...state.meals], 'date');
  const weeklyData = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([date, meals]) => ({
    date: formatDate(date, 'MMM d'),
    calories: meals.reduce((s, m) => s + (m.macros?.calories || 0), 0),
    protein: meals.reduce((s, m) => s + (m.macros?.protein || 0), 0),
    carbs: meals.reduce((s, m) => s + (m.macros?.carbs || 0), 0),
    fats: meals.reduce((s, m) => s + (m.macros?.fats || 0), 0),
  }));

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <h1 className="section-title">Nutrition Log</h1>

      <div className="flex gap-2 mb-5">
        {[['log', '🥗 Log'], ['summary', '📊 Weekly']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === key ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-300'}`}>{label}</button>
        ))}
        <button onClick={() => setShowForm(true)} className="btn-primary ml-auto text-sm py-2">+ Log Meal</button>
      </div>

      {tab === 'log' && (
        <div>
          {state.meals.length === 0 ? (
            <p className="text-slate-500 text-sm">No meals logged yet.</p>
          ) : (
            <div className="space-y-4">
              {sortedDates.map(date => {
                const meals = grouped[date];
                const totals = meals.reduce((acc, m) => ({
                  calories: acc.calories + (m.macros?.calories || 0),
                  protein: acc.protein + (m.macros?.protein || 0),
                  carbs: acc.carbs + (m.macros?.carbs || 0),
                  fats: acc.fats + (m.macros?.fats || 0),
                }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

                return (
                  <div key={date}>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-bold text-slate-300">{formatDate(date)}</h2>
                      <div className="flex gap-2 text-xs text-slate-500">
                        <span>{totals.calories} kcal</span>
                        <span>P: {totals.protein}g</span>
                        <span>C: {totals.carbs}g</span>
                        <span>F: {totals.fats}g</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {meals.map(meal => (
                        <div key={meal.id} className="card flex gap-3">
                          {meal.photoPreview && (
                            <img src={meal.photoPreview} alt="meal" className="w-16 h-16 object-cover rounded-xl shrink-0 border border-surface-600" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-200 text-sm truncate">{meal.description || 'Meal'}</p>
                            <p className="text-xs text-slate-400">{meal.time}</p>
                            {meal.macros?.calories > 0 && (
                              <div className="flex gap-2 mt-1 text-xs">
                                <span className="text-yellow-400">{meal.macros.calories} kcal</span>
                                <span className="text-blue-400">P:{meal.macros.protein}g</span>
                                <span className="text-orange-400">C:{meal.macros.carbs}g</span>
                                <span className="text-pink-400">F:{meal.macros.fats}g</span>
                                {meal.aiAnalyzed && <span className="text-slate-500">🤖</span>}
                              </div>
                            )}
                          </div>
                          <button onClick={() => dispatch({ type: ACTIONS.DELETE_MEAL, payload: meal.id })} className="text-red-400 hover:text-red-300 shrink-0">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'summary' && (
        <div className="space-y-5">
          {weeklyData.length === 0 ? (
            <p className="text-slate-500 text-sm">Not enough data for summary.</p>
          ) : (
            <>
              <div className="card">
                <h2 className="font-bold text-slate-200 mb-3">Daily Calories (last 7 days)</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
                    <Bar dataKey="calories" name="Calories" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h2 className="font-bold text-slate-200 mb-3">Macros (last 7 days)</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                    <Bar dataKey="protein" name="Protein (g)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="carbs" name="Carbs (g)" fill="#fb923c" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fats" name="Fats (g)" fill="#f472b6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      <MealEntryModal open={showForm} onClose={() => setShowForm(false)} onSave={handleSave} />
    </div>
  );
}
