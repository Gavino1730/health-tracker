import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: '📊' },
      { to: '/checkin', label: 'Check-in', icon: '✅' },
    ],
  },
  {
    label: 'Health',
    items: [
      { to: '/sleep', label: 'Sleep', icon: '😴' },
      { to: '/water', label: 'Water', icon: '💧' },
      { to: '/nutrition', label: 'Nutrition', icon: '🥗' },
      { to: '/medications', label: 'Meds', icon: '💊' },
      { to: '/substances', label: 'Substances', icon: '🍺' },
    ],
  },
  {
    label: 'Fitness',
    items: [
      { to: '/workout', label: 'Workout', icon: '🏋️' },
      { to: '/stretching', label: 'Stretch', icon: '🧘' },
      { to: '/recovery', label: 'Recovery', icon: '❤️‍🔥' },
    ],
  },
  {
    label: 'Tracking',
    items: [
      { to: '/body', label: 'Body', icon: '📏' },
      { to: '/injury', label: 'Injury', icon: '🩹' },
      { to: '/profile', label: 'Profile', icon: '👤' },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

export default function Navbar() {
  const location = useLocation();

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-surface-800 border-r border-surface-700 min-h-screen overflow-y-auto">
        <div className="px-4 py-5 border-b border-surface-700">
          <span className="text-lg font-extrabold text-brand-400 tracking-tight">⚡ Health Tracker</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-5">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="px-2 mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-300 hover:bg-surface-700 hover:text-white'
                      }`
                    }
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Mobile bottom nav (scrollable) ────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-800/95 backdrop-blur-md border-t border-surface-700 flex overflow-x-auto no-scrollbar"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {ALL_NAV.map(item => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[62px] min-h-[52px] py-2 px-1 text-[10px] font-semibold transition-colors touch-none select-none ${
                isActive ? 'text-brand-400' : 'text-slate-500'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <span className="text-[22px] leading-none">{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
