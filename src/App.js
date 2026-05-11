import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import DailyCheckin from './components/checkin/DailyCheckin';
import SleepLog from './components/sleep/SleepLog';
import WaterTracker from './components/water/WaterTracker';
import NutritionLog from './components/nutrition/NutritionLog';
import MedicationLog from './components/medication/MedicationLog';
import SubstanceLog from './components/substances/SubstanceLog';
import WorkoutLog from './components/workout/WorkoutLog';
import StretchingLibrary from './components/stretching/StretchingLibrary';
import RecoveryDashboard from './components/recovery/RecoveryDashboard';
import BodyComposition from './components/body/BodyComposition';
import InjuryTracker from './components/injury/InjuryTracker';
import Profile from './components/profile/Profile';
import HealthChat from './components/chat/HealthChat';
import DataExport from './components/export/DataExport';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="checkin" element={<DailyCheckin />} />
            <Route path="sleep" element={<SleepLog />} />
            <Route path="water" element={<WaterTracker />} />
            <Route path="nutrition" element={<NutritionLog />} />
            <Route path="medications" element={<MedicationLog />} />
            <Route path="substances" element={<SubstanceLog />} />
            <Route path="workout" element={<WorkoutLog />} />
            <Route path="stretching" element={<StretchingLibrary />} />
            <Route path="recovery" element={<RecoveryDashboard />} />
            <Route path="body" element={<BodyComposition />} />
            <Route path="injury" element={<InjuryTracker />} />
            <Route path="profile" element={<Profile />} />
            <Route path="chat" element={<HealthChat />} />
            <Route path="export" element={<DataExport />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
