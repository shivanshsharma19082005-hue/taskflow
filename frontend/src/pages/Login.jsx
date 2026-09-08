import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
  const { login, bootstrapMainBoss } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await bootstrapMainBoss(form.name, form.email, form.password);
      navigate('/');
    } catch (err) { setError(err.response?.data?.message || 'Something went wrong'); }
    finally { setSubmitting(false); }
  };

  return (
    <main className="login-scene relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 dark:bg-[#080c18] sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="floating-orb absolute -left-16 top-16 h-48 w-48 rounded-full bg-brand-300/30 blur-3xl dark:bg-brand-600/20" />
        <div className="floating-orb absolute -right-12 bottom-10 h-56 w-56 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-600/15" />
        <div className="floating-orb absolute left-1/2 top-0 h-32 w-32 rounded-full bg-cyan-200/25 blur-3xl dark:bg-cyan-500/10" />
      </div>

      <div className="absolute right-4 top-4 sm:right-6 sm:top-6"><ThemeToggle /></div>

      <div className="relative w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 font-display font-bold text-white shadow-xl shadow-brand-600/25">TF</div>
          <span className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">TaskFlow</span>
        </div>

        <section className="login-card rounded-3xl border border-white/70 bg-white/90 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/90 sm:p-8">
          <div className="mb-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-brand-600 dark:text-brand-400">{mode === 'login' ? 'Workspace access' : 'Workspace setup'}</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{mode === 'login' ? 'Welcome back' : 'Set up your company'}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{mode === 'login' ? 'Sign in to manage tasks, people, and progress.' : 'Create the first Main Boss account for your organization.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'bootstrap' && <div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Your name</label><input required value={form.name} onChange={update('name')} className="field" autoComplete="name" /></div>}
            <div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</label><input required type="email" value={form.email} onChange={update('email')} className="field" autoComplete="email" /></div>
            <div><label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Password</label><input required type="password" value={form.password} onChange={update('password')} className="field" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Please wait…' : mode === 'login' ? 'Sign in to TaskFlow' : 'Create Main Boss account'}</button>
          </form>

          <button onClick={() => { setError(''); setMode((m) => m === 'login' ? 'bootstrap' : 'login'); }} className="mt-5 w-full text-center text-sm font-medium text-slate-500 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400">
            {mode === 'login' ? 'First time here? Set up your company' : 'Already have an account? Sign in'}
          </button>
        </section>
        <p className="mt-5 text-center text-xs leading-5 text-slate-400 dark:text-slate-500">Demo: boss@company.com / password123</p>
      </div>
    </main>
  );
};
export default Login;
