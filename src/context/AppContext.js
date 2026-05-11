import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { loadState, saveState } from '../services/storage';

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  profile: null,       // User profile (name, dob, weight, height, health info, contacts)
  checkins: [],        // Daily check-ins (energy, mood, soreness, stress, clarity, caffeine, notes)
  sleep: [],           // Sleep logs
  water: [],           // Water intake logs
  meals: [],           // Nutrition / meal logs
  workouts: [],        // Workout logs (history)
  workoutSessions: [], // Active/completed session records
  stretchSessions: [], // Stretching session records
  recovery: [],        // Daily recovery score snapshots
  injuries: [],        // Injury entries
  bodyLogs: [],        // Body composition logs (measurements + photo refs)
  skiDays: [],         // Ski day logs
  substances: [],      // Alcohol / weed logs
  medications: [],     // Medication definitions
  medicationLogs: [],  // Daily medication dose logs
  events: [],          // Generic event logs
};

// ─── Action Types ─────────────────────────────────────────────────────────────

export const ACTIONS = {
  // Checkin
  ADD_CHECKIN: 'ADD_CHECKIN',
  UPDATE_CHECKIN: 'UPDATE_CHECKIN',
  // Sleep
  ADD_SLEEP: 'ADD_SLEEP',
  DELETE_SLEEP: 'DELETE_SLEEP',
  // Water
  ADD_WATER: 'ADD_WATER',
  DELETE_WATER: 'DELETE_WATER',
  // Nutrition
  ADD_MEAL: 'ADD_MEAL',
  UPDATE_MEAL: 'UPDATE_MEAL',
  DELETE_MEAL: 'DELETE_MEAL',
  // Workouts
  ADD_WORKOUT: 'ADD_WORKOUT',
  UPDATE_WORKOUT: 'UPDATE_WORKOUT',
  DELETE_WORKOUT: 'DELETE_WORKOUT',
  ADD_WORKOUT_SESSION: 'ADD_WORKOUT_SESSION',
  // Stretching
  ADD_STRETCH_SESSION: 'ADD_STRETCH_SESSION',
  // Recovery
  ADD_RECOVERY: 'ADD_RECOVERY',
  UPDATE_RECOVERY: 'UPDATE_RECOVERY',
  // Injuries
  ADD_INJURY: 'ADD_INJURY',
  UPDATE_INJURY: 'UPDATE_INJURY',
  DELETE_INJURY: 'DELETE_INJURY',
  LOG_INJURY_PAIN: 'LOG_INJURY_PAIN',
  LOG_INJURY_ROM: 'LOG_INJURY_ROM',
  // Body composition
  ADD_BODY_LOG: 'ADD_BODY_LOG',
  UPDATE_BODY_LOG: 'UPDATE_BODY_LOG',
  DELETE_BODY_LOG: 'DELETE_BODY_LOG',
  // Ski days
  ADD_SKI_DAY: 'ADD_SKI_DAY',
  DELETE_SKI_DAY: 'DELETE_SKI_DAY',
  // Substances
  ADD_SUBSTANCE: 'ADD_SUBSTANCE',
  DELETE_SUBSTANCE: 'DELETE_SUBSTANCE',
  // Medications
  ADD_MEDICATION: 'ADD_MEDICATION',
  UPDATE_MEDICATION: 'UPDATE_MEDICATION',
  DELETE_MEDICATION: 'DELETE_MEDICATION',
  LOG_MEDICATION_DOSE: 'LOG_MEDICATION_DOSE',
  // Events
  ADD_EVENT: 'ADD_EVENT',
  DELETE_EVENT: 'DELETE_EVENT',
  // Profile
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  // Hydration shorthand (weight/height within checkin or body log)
  LOAD_STATE: 'LOAD_STATE',
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function upsertByDate(arr, item) {
  const idx = arr.findIndex(x => x.date === item.date);
  if (idx >= 0) {
    const next = [...arr];
    next[idx] = { ...next[idx], ...item };
    return next;
  }
  return [...arr, item];
}

function addItem(arr, item) {
  return [...arr, item];
}

function updateItem(arr, id, updates) {
  return arr.map(x => (x.id === id ? { ...x, ...updates } : x));
}

function removeItem(arr, id) {
  return arr.filter(x => x.id !== id);
}

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD_STATE:
      return { ...initialState, ...action.payload };

    // Check-ins (one per day, upsert by date)
    case ACTIONS.ADD_CHECKIN:
    case ACTIONS.UPDATE_CHECKIN:
      return { ...state, checkins: upsertByDate(state.checkins, action.payload) };

    // Sleep
    case ACTIONS.ADD_SLEEP:
      return { ...state, sleep: addItem(state.sleep, action.payload) };
    case ACTIONS.DELETE_SLEEP:
      return { ...state, sleep: removeItem(state.sleep, action.payload) };

    // Water
    case ACTIONS.ADD_WATER:
      return { ...state, water: addItem(state.water, action.payload) };
    case ACTIONS.DELETE_WATER:
      return { ...state, water: removeItem(state.water, action.payload) };

    // Meals
    case ACTIONS.ADD_MEAL:
      return { ...state, meals: addItem(state.meals, action.payload) };
    case ACTIONS.UPDATE_MEAL:
      return { ...state, meals: updateItem(state.meals, action.payload.id, action.payload) };
    case ACTIONS.DELETE_MEAL:
      return { ...state, meals: removeItem(state.meals, action.payload) };

    // Workouts
    case ACTIONS.ADD_WORKOUT:
      return { ...state, workouts: addItem(state.workouts, action.payload) };
    case ACTIONS.UPDATE_WORKOUT:
      return { ...state, workouts: updateItem(state.workouts, action.payload.id, action.payload) };
    case ACTIONS.DELETE_WORKOUT:
      return { ...state, workouts: removeItem(state.workouts, action.payload) };
    case ACTIONS.ADD_WORKOUT_SESSION:
      return { ...state, workoutSessions: addItem(state.workoutSessions, action.payload) };

    // Stretching
    case ACTIONS.ADD_STRETCH_SESSION:
      return { ...state, stretchSessions: addItem(state.stretchSessions, action.payload) };

    // Recovery (one per day, upsert)
    case ACTIONS.ADD_RECOVERY:
    case ACTIONS.UPDATE_RECOVERY:
      return { ...state, recovery: upsertByDate(state.recovery, action.payload) };

    // Injuries
    case ACTIONS.ADD_INJURY:
      return { ...state, injuries: addItem(state.injuries, action.payload) };
    case ACTIONS.UPDATE_INJURY:
      return { ...state, injuries: updateItem(state.injuries, action.payload.id, action.payload) };
    case ACTIONS.DELETE_INJURY:
      return { ...state, injuries: removeItem(state.injuries, action.payload) };
    case ACTIONS.LOG_INJURY_PAIN:
      return {
        ...state,
        injuries: state.injuries.map(inj =>
          inj.id === action.payload.injuryId
            ? { ...inj, painLog: [...(inj.painLog || []), action.payload.entry] }
            : inj
        ),
      };
    case ACTIONS.LOG_INJURY_ROM:
      return {
        ...state,
        injuries: state.injuries.map(inj =>
          inj.id === action.payload.injuryId
            ? { ...inj, romLog: [...(inj.romLog || []), action.payload.entry] }
            : inj
        ),
      };

    // Body Composition
    case ACTIONS.ADD_BODY_LOG:
      return { ...state, bodyLogs: addItem(state.bodyLogs, action.payload) };
    case ACTIONS.UPDATE_BODY_LOG:
      return { ...state, bodyLogs: updateItem(state.bodyLogs, action.payload.id, action.payload) };
    case ACTIONS.DELETE_BODY_LOG:
      return { ...state, bodyLogs: removeItem(state.bodyLogs, action.payload) };

    // Ski Days
    case ACTIONS.ADD_SKI_DAY:
      return { ...state, skiDays: addItem(state.skiDays, action.payload) };
    case ACTIONS.DELETE_SKI_DAY:
      return { ...state, skiDays: removeItem(state.skiDays, action.payload) };

    // Substances
    case ACTIONS.ADD_SUBSTANCE:
      return { ...state, substances: addItem(state.substances, action.payload) };
    case ACTIONS.DELETE_SUBSTANCE:
      return { ...state, substances: removeItem(state.substances, action.payload) };

    // Medications
    case ACTIONS.ADD_MEDICATION:
      return { ...state, medications: addItem(state.medications, action.payload) };
    case ACTIONS.UPDATE_MEDICATION:
      return { ...state, medications: updateItem(state.medications, action.payload.id, action.payload) };
    case ACTIONS.DELETE_MEDICATION:
      return { ...state, medications: removeItem(state.medications, action.payload) };
    case ACTIONS.LOG_MEDICATION_DOSE:
      return { ...state, medicationLogs: addItem(state.medicationLogs, action.payload) };

    // Events
    case ACTIONS.ADD_EVENT:
      return { ...state, events: addItem(state.events, action.payload) };
    case ACTIONS.DELETE_EVENT:
      return { ...state, events: removeItem(state.events, action.payload) };

    // Profile
    case ACTIONS.UPDATE_PROFILE:
      return { ...state, profile: action.payload };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load persisted state from server on mount (falls back to localStorage if offline)
  useEffect(() => {
    loadState().then(saved => {
      if (saved) dispatch({ type: ACTIONS.LOAD_STATE, payload: saved });
    });
  }, []);

  // Persist on every state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
