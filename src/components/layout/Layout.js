import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-surface-900" style={{ minHeight: '100dvh' }}>
      <Navbar />
      {/*
        pb accounts for: mobile bottom nav (~60px) + iPhone home indicator (env safe-area-inset-bottom).
        On desktop md+ the bottom nav is hidden so only standard padding needed.
      */}
      <main
        className="flex-1 overflow-y-auto md:pb-0"
        style={{ paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
      >
        <div
          className="max-w-4xl mx-auto px-4 pb-6"
          style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
