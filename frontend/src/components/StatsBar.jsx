import React from 'react';

const CARDS = [
  { key: 'total', label: 'Total tasks', color: 'text-slate-700', bg: 'bg-white dark:bg-slate-900' },
  { key: 'pending', label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50' },
  { key: 'in-progress', label: 'In progress', color: 'text-blue-700', bg: 'bg-blue-50' },
  { key: 'completed', label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50' },
];

const StatsBar = ({ stats }) => {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {CARDS.map((c) => (
        <div key={c.key} className={`rounded-xl border border-slate-200 dark:border-slate-700 ${c.bg} p-4`}>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{c.label}</p>
          <p className={`text-2xl font-semibold mt-1 ${c.color}`}>{stats[c.key] ?? 0}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
