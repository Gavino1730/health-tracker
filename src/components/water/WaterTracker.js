import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, ACTIONS } from '../../context/AppContext';
import { today, isoNow, formatDateTime, groupByDate } from '../../utils/dateUtils';

const QUICK_AMOUNTS = [250, 350, 500, 750, 1000];
const DAILY_GOAL_ML = 2500;

export default function WaterTracker() {
  const { state, dispatch } = useApp();
  const [custom, setCustom] = useState('');
  const todayStr = today();

  const todayEntries = state.water.filter(w => w.createdAt?.startsWith(todayStr));
  const todayTotal = todayEntries.reduce((sum, w) => sum + w.amount, 0);
  const pct = Math.min((todayTotal / DAILY_GOAL_ML) * 100, 100);

  function addWater(amount) {
    if (!amount || amount <= 0) return;
    dispatch({
      type: ACTIONS.ADD_WATER,
      payload: { id: uuidv4(), amount: Number(amount), createdAt: isoNow(), date: todayStr },
    });
  }

  function handleCustom(e) {
    e.preventDefault();
    addWater(custom);
    setCustom('');
  }

  const grouped = groupByDate([...state.water].reverse(), 'date');

  return (
    <div>
      <h1 className="section-title">Water Tracker</h1>

      {/* Daily progress ring / bar */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-200">Today</h2>
          <span className="text-sm text-slate-400">Goal: {DAILY_GOAL_ML / 1000}L</span>
        </div>
        <div className="relative h-5 bg-surface-700 rounded-full overflow-hidden mb-2">
          <div
            className="absolute left-0 top-0 h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-brand-400">{(todayTotal / 1000).toFixed(2)}</span>
          <span className="text-slate-400">/ {DAILY_GOAL_ML / 1000} L</span>
          <span className="ml-auto text-sm text-slate-400">{Math.round(pct)}%</span>
        </div>
      </div>

      {/* Quick-add */}
      <div className="card mb-6">
        <h2 className="font-semibold text-slate-200 mb-3">Quick Add</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_AMOUNTS.map(amt => (
            <button key={amt} onClick={() => addWater(amt)} className="btn-secondary text-sm">
              +{amt >= 1000 ? `${amt / 1000}L` : `${amt}ml`}
            </button>
          ))}
        </div>
        <form onSubmit={handleCustom} className="flex gap-2">
          <input
            type="number"
            min="1"
            className="input"
            placeholder="Custom ml"
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
                <span className="text-slate-400">{formatDateTime(w.createdAt)}</span>
                <span className="font-semibold text-brand-300">{w.amount >= 1000 ? `${w.amount / 1000}L` : `${w.amount}ml`}</span>
                <button onClick={() => dispatch({ type: ACTIONS.DELETE_WATER, payload: w.id })} className="text-red-400 hover:text-red-300 ml-2">✕</button>
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
            const dayPct = Math.min((total / DAILY_GOAL_ML) * 100, 100);
            return (
              <div key={date} className="card flex items-center gap-3">
                <span className="text-slate-400 text-sm w-24 shrink-0">{date}</span>
                <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${dayPct}%` }} />
                </div>
                <span className="text-sm font-semibold text-slate-300 w-14 text-right">{(total / 1000).toFixed(2)}L</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
