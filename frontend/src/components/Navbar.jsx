import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ThemeToggle from './ThemeToggle';

const ROLE_LABELS = { mainboss: 'Main Boss', admin: 'Admin', employee: 'Employee' };
const ROLE_COLORS = {
  mainboss: 'bg-purple-100 text-purple-700 ring-purple-600/20 dark:bg-purple-950/60 dark:text-purple-300',
  admin: 'bg-blue-100 text-blue-700 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300',
  employee: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300',
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-600/20">TF</div>
          <div className="min-w-0">
            <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">TaskFlow</span>
            <span className={`ml-2 hidden rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset sm:inline-flex ${ROLE_COLORS[user.role]}`}>{ROLE_LABELS[user.role]}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 sm:flex">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,.12)]' : 'bg-slate-300 dark:bg-slate-600'}`} />
            {connected ? 'Live' : 'Offline'}
          </div>
          <div className="hidden text-right md:block">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.department}</p>
          </div>
          <ThemeToggle />
          <button onClick={logout} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm">Log out</button>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
