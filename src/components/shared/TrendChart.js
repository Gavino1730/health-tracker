import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '../../utils/dateUtils';

const COLORS = ['#38bdf8', '#34d399', '#fb923c', '#f472b6', '#a78bfa'];

/**
 * TrendChart – wraps Recharts for multi-series line charts.
 *
 * @param {Array}  data    – array of { date:'yyyy-MM-dd', [key]: number, ... }
 * @param {Array}  series  – array of { key:string, label:string }
 * @param {string} height  – CSS height string, default '220px'
 */
export default function TrendChart({ data = [], series = [], height = 220 }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        Not enough data yet – log more entries to see trends.
      </div>
    );
  }

  const formatted = data.map(d => ({
    ...d,
    dateLabel: formatDate(d.date, 'MMM d'),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="dateLabel" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
          labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
          itemStyle={{ color: '#94a3b8' }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
