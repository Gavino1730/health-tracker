import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

function toCSV(rows) {
  if (!rows || !rows.length) return '';
  const cols = Object.keys(rows[0]);
  const header = cols.join(',');
  const body = rows.map(row =>
    cols.map(col => {
      const val = row[col] == null ? '' : String(row[col]);
      // Escape quotes and wrap in quotes if contains comma/newline/quote
      const escaped = val.replace(/"/g, '""');
      return /[,"\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
    }).join(',')
  );
  return [header, ...body].join('\n');
}

function flattenMeal(m) {
  return {
    id: m.id,
    date: m.date,
    meal: m.meal,
    description: m.description,
    calories: m.macros?.calories ?? '',
    protein_g: m.macros?.protein ?? '',
    carbs_g: m.macros?.carbs ?? '',
    fats_g: m.macros?.fats ?? '',
    fiber_g: m.macros?.fiber ?? '',
    sugar_g: m.macros?.sugar ?? '',
    notes: m.notes ?? '',
    createdAt: m.createdAt,
  };
}

function flattenWorkout(w) {
  return {
    id: w.id,
    date: w.date,
    name: w.name,
    type: w.type,
    durationMins: w.durationMins,
    notes: w.notes ?? '',
    createdAt: w.createdAt,
  };
}

function flattenSession(s) {
  // Flatten each completed set into its own row
  const rows = [];
  (s.exercises || []).forEach(ex => {
    (ex.setsList || []).filter(st => st.completed || st.skipped).forEach(st => {
      rows.push({
        sessionId: s.id,
        sessionName: s.name,
        date: s.startedAt ? s.startedAt.slice(0, 10) : '',
        durationMins: s.durationMins,
        rpe: s.rpe ?? '',
        exercise: ex.name,
        setNum: st.setNum,
        reps: st.reps,
        weight: st.weight,
        skipped: st.skipped ? 'yes' : 'no',
      });
    });
  });
  return rows;
}

function flattenSleep(s) {
  return {
    id: s.id,
    date: s.date,
    bedtime: s.bedtime,
    wakeTime: s.wakeTime,
    durationHrs: s.durationHrs,
    quality: s.quality,
    notes: s.notes ?? '',
    createdAt: s.createdAt,
  };
}

function flattenCheckin(c) {
  return {
    id: c.id,
    date: c.date,
    energy: c.energy,
    mood: c.mood,
    soreness: c.soreness,
    stress: c.stress,
    clarity: c.clarity,
    notes: c.notes ?? '',
    createdAt: c.createdAt,
  };
}

function flattenWater(w) {
  return {
    id: w.id,
    date: w.date,
    amount: w.amount,
    unit: w.unit,
    createdAt: w.createdAt,
  };
}

function flattenSubstance(s) {
  return {
    id: s.id,
    date: s.date,
    time: s.time,
    subType: s.subType,
    amount: s.amount,
    unit: s.unit,
    source: s.source ?? '',
    notes: s.notes ?? '',
    createdAt: s.createdAt,
  };
}

function flattenMed(m) {
  return {
    id: m.id,
    date: m.date,
    time: m.time,
    name: m.name,
    dose: m.dose,
    unit: m.unit,
    notes: m.notes ?? '',
    createdAt: m.createdAt,
  };
}

function flattenBody(b) {
  return {
    id: b.id,
    date: b.date,
    weight: b.weight,
    height: b.height,
    bodyFatPct: b.bodyFatPct ?? '',
    chest: b.measurements?.chest ?? '',
    waist: b.measurements?.waist ?? '',
    hips: b.measurements?.hips ?? '',
    thighs: b.measurements?.thighs ?? '',
    calves: b.measurements?.calves ?? '',
    biceps: b.measurements?.biceps ?? '',
    forearms: b.measurements?.forearms ?? '',
    neck: b.measurements?.neck ?? '',
    notes: b.notes ?? '',
    createdAt: b.createdAt,
  };
}

function downloadCSV(csv, filename) {
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const EXPORTS = [
  {
    key: 'checkins',
    label: 'Daily Check-ins',
    icon: '✅',
    getData: s => s.checkins || [],
    flatten: rows => rows.map(flattenCheckin),
    filename: 'checkins.csv',
  },
  {
    key: 'sleep',
    label: 'Sleep Logs',
    icon: '😴',
    getData: s => s.sleepLogs || [],
    flatten: rows => rows.map(flattenSleep),
    filename: 'sleep.csv',
  },
  {
    key: 'water',
    label: 'Water Intake',
    icon: '💧',
    getData: s => s.waterLogs || [],
    flatten: rows => rows.map(flattenWater),
    filename: 'water.csv',
  },
  {
    key: 'meals',
    label: 'Meals / Nutrition',
    icon: '🥗',
    getData: s => s.meals || [],
    flatten: rows => rows.map(flattenMeal),
    filename: 'nutrition.csv',
  },
  {
    key: 'workouts',
    label: 'Workout Log',
    icon: '🏋️',
    getData: s => s.workouts || [],
    flatten: rows => rows.map(flattenWorkout),
    filename: 'workouts.csv',
  },
  {
    key: 'sessions',
    label: 'Workout Sessions (sets)',
    icon: '📋',
    getData: s => s.workoutSessions || [],
    flatten: rows => rows.flatMap(flattenSession),
    filename: 'workout_sessions.csv',
  },
  {
    key: 'body',
    label: 'Body Composition',
    icon: '📏',
    getData: s => s.bodyLogs || [],
    flatten: rows => rows.map(flattenBody),
    filename: 'body_composition.csv',
  },
  {
    key: 'substances',
    label: 'Substances',
    icon: '🍺',
    getData: s => s.substances || [],
    flatten: rows => rows.map(flattenSubstance),
    filename: 'substances.csv',
  },
  {
    key: 'medications',
    label: 'Medications',
    icon: '💊',
    getData: s => s.medications || [],
    flatten: rows => rows.map(flattenMed),
    filename: 'medications.csv',
  },
];

export default function DataExport() {
  const { state } = useApp();
  const [exported, setExported] = useState({});

  function handleExport(exp) {
    const raw = exp.getData(state);
    const flat = exp.flatten(raw);
    if (!flat.length) {
      setExported(prev => ({ ...prev, [exp.key]: 'empty' }));
      return;
    }
    downloadCSV(toCSV(flat), exp.filename);
    setExported(prev => ({ ...prev, [exp.key]: 'done' }));
    setTimeout(() => setExported(prev => ({ ...prev, [exp.key]: null })), 2500);
  }

  function handleExportAll() {
    EXPORTS.forEach(exp => {
      const raw = exp.getData(state);
      const flat = exp.flatten(raw);
      if (flat.length) downloadCSV(toCSV(flat), exp.filename);
    });
  }

  return (
    <div>
      <h1 className="section-title">Export Data</h1>
      <p className="text-slate-400 text-sm mb-6">Download your health data as CSV files. All data is exported from your local app state.</p>

      <button onClick={handleExportAll} className="btn-primary mb-6 w-full sm:w-auto">📦 Export All Data</button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXPORTS.map(exp => {
          const count = exp.getData(state).length;
          const status = exported[exp.key];
          return (
            <div key={exp.key} className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{exp.icon}</span>
                <div>
                  <p className="font-semibold text-slate-200 text-sm">{exp.label}</p>
                  <p className="text-xs text-slate-500">{count} record{count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => handleExport(exp)}
                disabled={count === 0}
                className={`btn-secondary text-xs py-1.5 px-3 shrink-0 disabled:opacity-40 ${status === 'done' ? 'text-emerald-400' : status === 'empty' ? 'text-yellow-400' : ''}`}
              >
                {status === 'done' ? '✓ Saved' : status === 'empty' ? 'No data' : '↓ CSV'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
