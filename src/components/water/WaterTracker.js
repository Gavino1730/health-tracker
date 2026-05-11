import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDateTime, groupByDate } from '../../utils/dateUtils';

// Water is stored internally as ml, displayed as oz throughout the UI.
// 1 oz = 29.5735 ml
const ML_PER_OZ = 29.5735;
const ozToMl = oz => Math.round(oz * ML_PER_OZ);
const mlToOz = ml => (ml / ML_PER_OZ).toFixed(1);

// Water bottles: 24 oz, 32 oz, 48 oz
const QUICK_AMOUNTS_OZ = [24, 32, 48];
const QUICK_LABEL = { 24: '24 oz', 32: '32 oz', 48: '48 oz' };
const DEFAULT_DAILY_GOAL_OZ = 64; // ~8 cups

export default function WaterTracker() {
  const { state, dispatch } = useApp();
  const [custom, setCustom] = useState('');
  const [goalInput, setGoalInput] = useState(String(state.waterGoalOz || DEFAULT_DAILY_GOAL_OZ));
  const todayStr = today();
  const getEntryDate = w => w?.date || w?.createdAt?.slice(0, 10);
  const dailyGoalOz = state.waterGoalOz || DEFAULT_DAILY_GOAL_OZ;
  const dailyGoalMl = ozToMl(dailyGoalOz);

  useEffect(() => {
    setGoalInput(String(dailyGoalOz));
  }, [dailyGoalOz]);

  const todayEntries = state.water.filter(w => getEntryDate(w) === todayStr);
  const todayTotal = todayEntries.reduce((sum, w) => sum + w.amount, 0);
  const pct = Math.min((todayTotal / dailyGoalMl) * 100, 100);

  function addWater(amountOz) {
    if (!amountOz || amountOz <= 0) return;
    dispatch({
      type: ACTIONS.ADD_WATER,
      payload: { id: uuidv4(), amount: ozToMl(Number(amountOz)), createdAt: isoNow(), date: todayStr },
    });
  }

  function handleCustom(e) {
    e.preventDefault();
    addWater(custom);
    setCustom('');
  }

  function handleGoalSave(e) {
    e.preventDefault();
    const nextGoal = Number(goalInput);
    if (!nextGoal || nextGoal <= 0) return;
    dispatch({ type: ACTIONS.UPDATE_WATER_GOAL, payload: nextGoal });
  }

  const grouped = groupByDate(
    [...state.water]
      .map(w => ({ ...w, date: getEntryDate(w) }))
      .reverse(),
    'date'
  );

  return (
    <div>
      <h1 className="section-title">Water Tracker</h1>

      {/* Daily progress ring / bar */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-200">Today</h2>
          <span className="text-sm text-slate-400">Goal: {dailyGoalOz} oz</span>
        </div>
        <form onSubmit={handleGoalSave} className="flex items-center gap-2 mb-3">
          <label className="text-xs text-slate-400">Edit Goal</label>
          <input
            type="number"
            min="1"
            className="input h-9 text-sm"
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            aria-label="Daily water goal in ounces"
          />
          <button type="submit" className="btn-secondary text-sm shrink-0">Save Goal</button>
        </form>
        <div className="relative h-5 bg-surface-700 rounded-full overflow-hidden mb-2">
          <div
            className="absolute left-0 top-0 h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-brand-400">{mlToOz(todayTotal)}</span>
          <span className="text-slate-400">/ {dailyGoalOz} oz</span>
          <span className="ml-auto text-sm text-slate-400">{Math.round(pct)}%</span>
        </div>
      </div>

      {/* Quick-add */}
      <div className="card mb-6">
        <h2 className="font-semibold text-slate-200 mb-3">Quick Add</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_AMOUNTS_OZ.map(oz => (
            <button key={oz} onClick={() => addWater(oz)} className="btn-secondary text-sm">
              +{QUICK_LABEL[oz]}
            </button>
          ))}
        </div>
        <form onSubmit={handleCustom} className="flex gap-2">
          <input
            type="number"
            min="1"
            className="input"
            placeholder="Custom oz"
            value={custom}
            onChange={e => setCustom(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">Add</button>
        </form>
      </div>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold text-slate-200 mb-2">Today's Log</h2>
          <div className="space-y-1">
            {[...todayEntries].reverse().map(w => (
              <div key={w.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{w.createdAt ? formatDateTime(w.createdAt) : w.date}</span>
                <span className="font-semibold text-brand-300">{mlToOz(w.amount)} oz</span>
                <button
                  onClick={() => dispatch({ type: ACTIONS.DELETE_WATER, payload: w.id })}
                  className="text-red-400 hover:text-red-300 ml-2"
                  aria-label="Delete water entry"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History by day */}
      <div>
        <h2 className="font-bold text-slate-300 mb-3">Daily History</h2>
        <div className="space-y-2">
          {Object.entries(grouped).slice(0, 14).map(([date, entries]) => {
            const total = entries.reduce((s, e) => s + e.amount, 0);
            const dayPct = Math.min((total / dailyGoalMl) * 100, 100);
            return (
              <div key={date} className="card">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-slate-400 text-sm w-24 shrink-0">{date}</span>
                  <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${dayPct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-300 w-16 text-right">{mlToOz(total)} oz</span>
                </div>
                <div className="space-y-1">
                  {entries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {entry.createdAt ? formatDateTime(entry.createdAt) : `${date}, time not recorded`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">{mlToOz(entry.amount)} oz</span>
                        <button
                          onClick={() => dispatch({ type: ACTIONS.DELETE_WATER, payload: entry.id })}
                          className="text-red-400 hover:text-red-300"
                          aria-label="Delete water history entry"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
