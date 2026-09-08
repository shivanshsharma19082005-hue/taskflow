import React from 'react';

const ROLE_DOT = {
  admin: 'bg-blue-500',
  employee: 'bg-emerald-500',
};

const TeamPanel = ({ title, members, onRemove, canRemove }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <div className="mt-3 space-y-2">
        {members.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400">No one here yet.</p>}
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 group">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ROLE_DOT[m.role] || 'bg-slate-400'}`} />
              <div className="min-w-0">
                <p className="text-sm text-slate-800 dark:text-slate-100 truncate">{m.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.department}</p>
              </div>
            </div>
            {canRemove && (
              <button
                onClick={() => onRemove(m.id)}
                className="text-xs text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamPanel;
