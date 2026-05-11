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
      { to: '/chat', label: 'Chat', icon: '💬' },
      { to: '/export', label: 'Export', icon: '📤' },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

export default function Navbar() {
  const location = useLocation();

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/5 min-h-screen overflow-y-auto"
        style={{ background: 'linear-gradient(180deg, #080f1e 0%, #06101e 100%)' }}>
        <div className="px-4 py-5 border-b border-white/5">
          <span className="text-lg font-extrabold tracking-tight" style={{
            background: 'linear-gradient(90deg, #22d3ee, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            ⚡ Health Tracker
          </span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-5">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 flex overflow-x-auto no-scrollbar"
        style={{
          background: 'rgba(6, 16, 30, 0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
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
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[62px] min-h-[52px] py-2 px-1 text-[10px] font-bold uppercase tracking-wide transition-colors touch-none select-none ${
                isActive ? 'text-brand-400' : 'text-slate-600'
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
