import React from 'react';

/**
 * ScoreInput – renders a row of 1-10 buttons for score selection.
 */
export default function ScoreInput({ value, onChange, size = 'md' }) {
  const sizeClasses = size === 'sm'
    ? 'w-7 h-7 text-xs'
    : 'w-9 h-9 text-sm';

  return (
    <div className="flex gap-1 flex-wrap">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
        const selected = value === n;
        let colorClass = 'bg-surface-700 text-slate-400 hover:bg-surface-600';
        if (selected) {
          if (n <= 3)       colorClass = 'bg-red-600 text-white';
          else if (n <= 6)  colorClass = 'bg-yellow-500 text-black';
          else              colorClass = 'bg-emerald-500 text-white';
        }
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`${sizeClasses} ${colorClass} rounded-lg font-bold transition-colors`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
