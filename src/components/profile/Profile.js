import React, { useState, useEffect } from 'react';
import { useApp, ACTIONS } from '../../context/AppContext';

const BLOOD_TYPES = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 'light', label: 'Lightly Active', desc: '1-3 days/week' },
  { value: 'moderate', label: 'Moderately Active', desc: '3-5 days/week' },
  { value: 'very', label: 'Very Active', desc: '6-7 days/week' },
  { value: 'extra', label: 'Extremely Active', desc: 'Hard daily training' },
];
const GOALS = ['Lose Fat', 'Build Muscle', 'Body Recomposition', 'Improve Endurance', 'Improve Flexibility', 'General Health', 'Injury Recovery', 'Ski Performance'];
const GENDERS = ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other'];

function calcAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function calcBMI(weightLbs, heightIn) {
  if (!weightLbs || !heightIn) return null;
  return (703 * weightLbs / (heightIn * heightIn)).toFixed(1);
}

function bmiLabel(bmi) {
  if (!bmi) return null;
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-brand-400' };
  if (bmi < 25) return { label: 'Normal', color: 'text-emerald-400' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-yellow-400' };
  return { label: 'Obese', color: 'text-red-400' };
}

function calcTDEE(profile) {
  const { gender, weightLbs, heightFt, heightIn, dob, activityLevel } = profile;
  const totalIn = (Number(heightFt) || 0) * 12 + (Number(heightIn) || 0);
  const weightKg = Number(weightLbs) * 0.453592;
  const heightCm = totalIn * 2.54;
  if (!weightLbs || !totalIn || !dob) return null;
  const age = calcAge(dob);
  // Mifflin-St Jeor
  let bmr;
  if (gender === 'Male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extra: 1.9 };
  return Math.round(bmr * (multipliers[activityLevel] || 1.375));
}

const EMPTY = {
  name: '', dob: '', gender: 'Prefer not to say',
  weightLbs: '', heightFt: '', heightIn: '', bodyFatPct: '', wristIn: '',
  restingHR: '', bloodPressure: '', bloodType: 'Unknown', vo2max: '',
  activityLevel: 'moderate', primaryGoal: 'General Health', targetWeightLbs: '', targetBodyFatPct: '',
  allergies: '', medicalConditions: '', medications: '', doctorName: '', doctorPhone: '',
  emergencyContact: '', emergencyPhone: '',
  bio: '',
};

export default function Profile() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ ...EMPTY, ...(state.profile || {}) });
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(!state.profile?.name);

  // Keep form in sync if state loads async from server
  useEffect(() => {
    if (state.profile) setForm(f => ({ ...EMPTY, ...state.profile, ...f }));
  }, []); // eslint-disable-line

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleSave(e) {
    e.preventDefault();
    dispatch({ type: ACTIONS.UPDATE_PROFILE, payload: { ...form, updatedAt: new Date().toISOString() } });
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  }

  const age = calcAge(form.dob);
  const totalIn = (Number(form.heightFt) || 0) * 12 + (Number(form.heightIn) || 0);
  const bmi = calcBMI(Number(form.weightLbs), totalIn);
  const bmiInfo = bmiLabel(Number(bmi));
  const tdee = calcTDEE(form);
  const heightDisplay = form.heightFt ? `${form.heightFt}′${form.heightIn || 0}″` : null;

  if (!editing && state.profile?.name) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="section-title mb-0">Profile</h1>
          <button onClick={() => setEditing(true)} className="btn-secondary text-sm">Edit</button>
        </div>

        {/* Identity card */}
        <div className="card mb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-700 flex items-center justify-center text-3xl font-extrabold text-brand-200 shrink-0">
            {form.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-100">{form.name}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {age !== null && <span className="badge bg-surface-700 text-slate-300">{age} yrs</span>}
              {form.gender !== 'Prefer not to say' && <span className="badge bg-surface-700 text-slate-300">{form.gender}</span>}
              {form.bloodType !== 'Unknown' && <span className="badge bg-red-900/50 text-red-300">🩸 {form.bloodType}</span>}
              {form.primaryGoal && <span className="badge bg-brand-900/60 text-brand-300">{form.primaryGoal}</span>}
            </div>
            {form.bio && <p className="text-sm text-slate-400 mt-2">{form.bio}</p>}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Weight', value: form.weightLbs ? `${form.weightLbs} lbs` : null, sub: null },
            { label: 'Height', value: heightDisplay },
            { label: 'BMI', value: bmi, sub: bmiInfo?.label, color: bmiInfo?.color },
            { label: 'TDEE', value: tdee ? `${tdee}` : null, sub: 'kcal/day' },
            { label: 'Body Fat', value: form.bodyFatPct ? `${form.bodyFatPct}%` : null },
            { label: 'Target Weight', value: form.targetWeightLbs ? `${form.targetWeightLbs} lbs` : null },
            { label: 'Resting HR', value: form.restingHR ? `${form.restingHR} bpm` : null },
            { label: 'VO₂ Max', value: form.vo2max ? `${form.vo2max}` : null, sub: 'ml/kg/min' },
          ].filter(s => s.value).map(s => (
            <div key={s.label} className="card text-center py-3">
              <p className={`text-2xl font-extrabold ${s.color || 'text-slate-100'}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              {s.sub && <p className={`text-xs mt-0.5 ${s.color || 'text-slate-500'}`}>{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Health info */}
        {(form.allergies || form.medicalConditions || form.bloodPressure) && (
          <div className="card mb-4">
            <h2 className="font-bold text-slate-200 mb-3">Health Info</h2>
            <div className="space-y-2 text-sm">
              {form.bloodPressure && <div><span className="text-slate-400">Blood Pressure: </span><span className="text-slate-200">{form.bloodPressure}</span></div>}
              {form.medicalConditions && <div><span className="text-slate-400">Conditions: </span><span className="text-slate-200">{form.medicalConditions}</span></div>}
              {form.allergies && <div><span className="text-slate-400">Allergies: </span><span className="text-slate-200">{form.allergies}</span></div>}
              {form.medications && <div><span className="text-slate-400">Medications: </span><span className="text-slate-200">{form.medications}</span></div>}
            </div>
          </div>
        )}

        {/* Emergency / Doctor */}
        {(form.emergencyContact || form.doctorName) && (
          <div className="card mb-4">
            <h2 className="font-bold text-slate-200 mb-3">Contacts</h2>
            <div className="space-y-2 text-sm">
              {form.emergencyContact && (
                <div className="flex items-center justify-between">
                  <div><p className="text-slate-300 font-semibold">{form.emergencyContact}</p><p className="text-xs text-slate-500">Emergency contact</p></div>
                  {form.emergencyPhone && <a href={`tel:${form.emergencyPhone}`} className="text-brand-400 text-sm">{form.emergencyPhone}</a>}
                </div>
              )}
              {form.doctorName && (
                <div className="flex items-center justify-between">
                  <div><p className="text-slate-300 font-semibold">{form.doctorName}</p><p className="text-xs text-slate-500">Doctor</p></div>
                  {form.doctorPhone && <a href={`tel:${form.doctorPhone}`} className="text-brand-400 text-sm">{form.doctorPhone}</a>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity */}
        {form.activityLevel && (
          <div className="card">
            <h2 className="font-bold text-slate-200 mb-2">Activity Level</h2>
            {(() => {
              const a = ACTIVITY_LEVELS.find(l => l.value === form.activityLevel);
              return a ? <p className="text-slate-300">{a.label} <span className="text-slate-500 text-sm">— {a.desc}</span></p> : null;
            })()}
          </div>
        )}
      </div>
    );
  }

  // ── Edit form ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0">{state.profile?.name ? 'Edit Profile' : 'Set Up Profile'}</h1>
        {state.profile?.name && (
          <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Personal */}
        <div className="card space-y-3">
          <h2 className="font-bold text-slate-200">Personal</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Full Name</label>
              <input className="input" placeholder="Gavin" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" className="input" value={form.dob} onChange={e => set('dob', e.target.value)} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Bio / About Me</label>
            <textarea className="input" rows={2} placeholder="Skier, gym rat, trying to sleep more..." value={form.bio} onChange={e => set('bio', e.target.value)} />
          </div>
        </div>

        {/* Physical */}
        <div className="card space-y-3">
          <h2 className="font-bold text-slate-200">Physical Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Weight (lbs)</label>
              <input type="number" step="0.1" className="input" placeholder="175" value={form.weightLbs} onChange={e => set('weightLbs', e.target.value)} />
            </div>
            <div className="col-span-1">
              <label className="label">Height</label>
              <div className="flex gap-2">
                <input type="number" className="input" placeholder="5 ft" value={form.heightFt} onChange={e => set('heightFt', e.target.value)} />
                <input type="number" className="input" placeholder="10 in" value={form.heightIn} onChange={e => set('heightIn', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Body Fat %</label>
              <input type="number" step="0.1" className="input" placeholder="15" value={form.bodyFatPct} onChange={e => set('bodyFatPct', e.target.value)} />
            </div>
            <div>
              <label className="label">Wrist Circumference (in)</label>
              <input type="number" step="0.1" className="input" placeholder="6.5" value={form.wristIn} onChange={e => set('wristIn', e.target.value)} />
            </div>
          </div>
          {/* Live BMI */}
          {bmi && (
            <div className="flex items-center gap-3 p-3 bg-surface-700 rounded-xl text-sm">
              <span className="text-slate-400">BMI:</span>
              <span className={`font-bold text-lg ${bmiInfo?.color}`}>{bmi}</span>
              <span className={bmiInfo?.color}>{bmiInfo?.label}</span>
              {tdee && <><span className="text-slate-600 mx-1">·</span><span className="text-slate-400">TDEE:</span><span className="font-bold text-slate-200">{tdee} kcal/day</span></>}
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="card space-y-3">
          <h2 className="font-bold text-slate-200">Goals</h2>
          <div>
            <label className="label">Primary Goal</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <button type="button" key={g}
                  onClick={() => set('primaryGoal', g)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${form.primaryGoal === g ? 'bg-brand-600 border-brand-500 text-white' : 'bg-surface-700 border-surface-600 text-slate-300'}`}
                >{g}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target Weight (lbs)</label>
              <input type="number" step="0.1" className="input" placeholder="165" value={form.targetWeightLbs} onChange={e => set('targetWeightLbs', e.target.value)} />
            </div>
            <div>
              <label className="label">Target Body Fat %</label>
              <input type="number" step="0.1" className="input" placeholder="12" value={form.targetBodyFatPct} onChange={e => set('targetBodyFatPct', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Activity Level</label>
            <div className="space-y-2">
              {ACTIVITY_LEVELS.map(a => (
                <button type="button" key={a.value}
                  onClick={() => set('activityLevel', a.value)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-colors ${form.activityLevel === a.value ? 'bg-brand-600 border-brand-500 text-white' : 'bg-surface-700 border-surface-600 text-slate-300'}`}
                >
                  <span className="font-semibold">{a.label}</span>
                  <span className={`text-xs ${form.activityLevel === a.value ? 'text-brand-200' : 'text-slate-500'}`}>{a.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Health baseline */}
        <div className="card space-y-3">
          <h2 className="font-bold text-slate-200">Health Baseline</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Resting Heart Rate (bpm)</label>
              <input type="number" className="input" placeholder="60" value={form.restingHR} onChange={e => set('restingHR', e.target.value)} />
            </div>
            <div>
              <label className="label">Blood Pressure</label>
              <input className="input" placeholder="120/80" value={form.bloodPressure} onChange={e => set('bloodPressure', e.target.value)} />
            </div>
            <div>
              <label className="label">Blood Type</label>
              <select className="input" value={form.bloodType} onChange={e => set('bloodType', e.target.value)}>
                {BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">VO₂ Max (ml/kg/min)</label>
              <input type="number" step="0.1" className="input" placeholder="45" value={form.vo2max} onChange={e => set('vo2max', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Allergies</label>
            <input className="input" placeholder="Peanuts, penicillin..." value={form.allergies} onChange={e => set('allergies', e.target.value)} />
          </div>
          <div>
            <label className="label">Medical Conditions</label>
            <textarea className="input" rows={2} placeholder="Asthma, previous ACL repair..." value={form.medicalConditions} onChange={e => set('medicalConditions', e.target.value)} />
          </div>
          <div>
            <label className="label">Current Medications / Supplements</label>
            <textarea className="input" rows={2} placeholder="Vitamin D, creatine..." value={form.medications} onChange={e => set('medications', e.target.value)} />
          </div>
        </div>

        {/* Contacts */}
        <div className="card space-y-3">
          <h2 className="font-bold text-slate-200">Contacts</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Doctor / GP Name</label>
              <input className="input" placeholder="Dr. Smith" value={form.doctorName} onChange={e => set('doctorName', e.target.value)} />
            </div>
            <div>
              <label className="label">Doctor Phone</label>
              <input type="tel" className="input" placeholder="+1 555 0100" value={form.doctorPhone} onChange={e => set('doctorPhone', e.target.value)} />
            </div>
            <div>
              <label className="label">Emergency Contact</label>
              <input className="input" placeholder="Mom" value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} />
            </div>
            <div>
              <label className="label">Emergency Phone</label>
              <input type="tel" className="input" placeholder="+1 555 0199" value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full text-base py-3">
          Save Profile
        </button>
        {saved && <p className="text-emerald-400 text-center text-sm">✓ Profile saved!</p>}
      </form>
    </div>
  );
}
