import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDate, groupByDate } from '../../utils/dateUtils';
import PhotoCapture from '../shared/PhotoCapture';
import Modal from '../shared/Modal';
import { analyzeNutritionPhoto } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

function MealEntryModal({ open, onClose, onSave }) {
  const [photo, setPhoto] = useState(null);
  const [description, setDescription] = useState('');
  const [macros, setMacros] = useState({ calories: '', protein: '', carbs: '', fats: '' });
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));

  function buildAutoDescription(result) {
    const foods = Array.isArray(result?.foods)
      ? result.foods.filter(Boolean).map(item => String(item).trim()).filter(Boolean)
      : [];
    const foodsLine = foods.length ? `What I ate: ${foods.join(', ')}` : '';
    const detailLine = result?.description ? `Details: ${result.description}` : '';
    return [foodsLine, detailLine].filter(Boolean).join('\n');
  }

  async function handleAnalyze(photoOverride) {
    const targetPhoto = photoOverride || photo;
    if (!targetPhoto) return;
    setAnalyzing(true);
    try {
      const result = await analyzeNutritionPhoto(targetPhoto.preview, description);
      setAiResult(result);
      setMacros({ calories: result.calories, protein: result.protein, carbs: result.carbs, fats: result.fats });
      if (!description.trim()) {
        const autoDescription = buildAutoDescription(result);
        if (autoDescription) setDescription(autoDescription);
      }
    } catch {}
    setAnalyzing(false);
  }

  async function handlePhotoCapture(p) {
    setPhoto(p);
    await handleAnalyze(p);
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
            <PhotoCapture onCapture={handlePhotoCapture} label={photo ? 'Change Photo' : 'Take/Upload Photo'} />
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
              onClick={() => handleAnalyze()}
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

function CaffeineModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    date: today(),
    time: new Date().toTimeString().slice(0, 5),
    amount: '',
    unit: 'mg',
    source: 'Coffee',
    notes: '',
  });

  function handleSubmit(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;
    onSave({ ...form, amount });
    setForm({
      date: today(),
      time: new Date().toTimeString().slice(0, 5),
      amount: '',
      unit: 'mg',
      source: 'Coffee',
      notes: '',
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="☕ Log Caffeine">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" className="input" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
          <div>
            <label className="label">Amount</label>
            <input type="number" min="1" className="input" placeholder="e.g. 95" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              <option value="mg">mg</option>
              <option value="shots">espresso shots</option>
            </select>
          </div>
          <div>
            <label className="label">Source</label>
            <select className="input" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
              {['Coffee', 'Espresso', 'Tea', 'Energy Drink', 'Pre-Workout', 'Soda', 'Other'].map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input type="text" className="input" placeholder="e.g. morning latte" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full">Add Caffeine</button>
      </form>
    </Modal>
  );
}

export default function NutritionLog() {
  const { state, dispatch } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showCaffeineForm, setShowCaffeineForm] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [tab, setTab] = useState('log');

  // Local copy for editing targets
  const targets = state.macroTargets || { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const [targetDraft, setTargetDraft] = useState(targets);

  function handleSave(meal) {
    dispatch({ type: ACTIONS.ADD_MEAL, payload: meal });
  }

  function handleAddCaffeine(entry) {
    dispatch({
      type: ACTIONS.ADD_SUBSTANCE,
      payload: {
        id: uuidv4(),
        subType: 'caffeine',
        date: entry.date,
        time: entry.time,
        amount: entry.amount,
        unit: entry.unit,
        source: entry.source,
        notes: entry.notes,
        createdAt: isoNow(),
      },
    });
  }

  function saveTargets(e) {
    e.preventDefault();
    dispatch({ type: ACTIONS.UPDATE_MACRO_TARGETS, payload: {
      calories: Number(targetDraft.calories) || 0,
      protein: Number(targetDraft.protein) || 0,
      carbs: Number(targetDraft.carbs) || 0,
      fats: Number(targetDraft.fats) || 0,
    }});
    setShowTargets(false);
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
  const caffeineEntries = [...state.substances]
    .filter(s => s.subType === 'caffeine')
    .sort((a, b) => `${b.date || ''}${b.time || ''}`.localeCompare(`${a.date || ''}${a.time || ''}`));
  const caffeineByDate = groupByDate(caffeineEntries, 'date');

  return (
    <div>
      <h1 className="section-title">Nutrition Log</h1>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[['log', '🥗 Log'], ['summary', '📊 Weekly']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${tab === key ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-300'}`}>{label}</button>
        ))}
        <button onClick={() => { setTargetDraft(targets); setShowTargets(true); }} className="btn-secondary ml-auto text-sm py-2">🎯 Targets</button>
        <button onClick={() => setShowCaffeineForm(true)} className="btn-secondary text-sm py-2">+ Log Caffeine</button>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-2">+ Log Meal</button>
      </div>

      {/* Targets summary strip */}
      {(targets.calories > 0 || targets.protein > 0) && (() => {
        const todayMeals = (state.meals || []).filter(m => m.date === today());
        const todayTotals = todayMeals.reduce((acc, m) => ({
          calories: acc.calories + (m.macros?.calories || 0),
          protein: acc.protein + (m.macros?.protein || 0),
          carbs: acc.carbs + (m.macros?.carbs || 0),
          fats: acc.fats + (m.macros?.fats || 0),
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
        return (
          <div className="card mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-3">Today's Targets</p>
            <div className="space-y-2">
              {[
                { key: 'calories', label: 'Calories', unit: 'kcal', color: 'bg-yellow-500' },
                { key: 'protein', label: 'Protein', unit: 'g', color: 'bg-blue-500' },
                { key: 'carbs', label: 'Carbs', unit: 'g', color: 'bg-orange-500' },
                { key: 'fats', label: 'Fats', unit: 'g', color: 'bg-pink-500' },
              ].filter(m => targets[m.key] > 0).map(({ key, label, unit, color }) => {
                const pct = Math.min(100, Math.round((todayTotals[key] / targets[key]) * 100));
                const over = todayTotals[key] > targets[key];
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{label}</span>
                      <span className={over ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                        {todayTotals[key]}{unit} / {targets[key]}{unit}
                        {over && ' ⚠️'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {tab === 'log' && (
        <div>
          {caffeineEntries.length > 0 && (
            <div className="card mb-6">
              <h2 className="font-bold text-slate-200 mb-3">☕ Caffeine Log</h2>
              <div className="space-y-2 max-h-52 overflow-auto pr-1">
                {caffeineEntries.slice(0, 12).map(entry => (
                  <div key={entry.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="text-slate-200 truncate">
                        {entry.source} · {entry.amount} {entry.unit}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(entry.date)}{entry.time ? ` ${entry.time}` : ''}{entry.notes ? ` · ${entry.notes}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => dispatch({ type: ACTIONS.DELETE_SUBSTANCE, payload: entry.id })}
                      className="text-red-400 hover:text-red-300 ml-3 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {Object.keys(caffeineByDate).length > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-700">
                  <h3 className="font-semibold text-slate-200 mb-2">Daily Totals</h3>
                  <div className="space-y-1.5">
                    {Object.entries(caffeineByDate).slice(0, 7).map(([date, entries]) => {
                      const totalMg = entries.filter(e => e.unit === 'mg').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                      const shotCount = entries.filter(e => e.unit === 'shots').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                      return (
                        <div key={date} className="flex items-center justify-between text-xs text-slate-400">
                          <span>{formatDate(date, 'MMM d')}</span>
                          <span>{totalMg > 0 ? `${Math.round(totalMg)} mg` : '0 mg'}{shotCount > 0 ? ` · ${shotCount} shots` : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

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
                    {targets.calories > 0 && <ReferenceLine y={targets.calories} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Target', fill: '#f59e0b', fontSize: 10 }} />}
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
                    {targets.protein > 0 && <ReferenceLine y={targets.protein} stroke="#38bdf8" strokeDasharray="4 2" />}
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

      <CaffeineModal open={showCaffeineForm} onClose={() => setShowCaffeineForm(false)} onSave={handleAddCaffeine} />
      <MealEntryModal open={showForm} onClose={() => setShowForm(false)} onSave={handleSave} />

      {/* Macro Targets Modal */}
      <Modal open={showTargets} onClose={() => setShowTargets(false)} title="🎯 Daily Macro Targets">
        <form onSubmit={saveTargets} className="space-y-4">
          <p className="text-sm text-slate-400">Set your daily nutrition targets. Progress bars and chart reference lines will update automatically.</p>
          <div className="grid grid-cols-2 gap-3">
            {[['calories', 'Calories (kcal)'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fats', 'Fats (g)']].map(([k, l]) => (
              <div key={k}>
                <label className="label">{l}</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  placeholder="0 = no target"
                  value={targetDraft[k] || ''}
                  onChange={e => setTargetDraft(d => ({ ...d, [k]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <button type="submit" className="btn-primary w-full">Save Targets</button>
        </form>
      </Modal>
    </div>
  );
}
