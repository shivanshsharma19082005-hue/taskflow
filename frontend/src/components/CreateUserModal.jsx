import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const CreateUserModal = ({ open, onClose, onCreate }) => {
  const { user } = useAuth();
  const canChooseRole = user.role === 'mainboss';

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      setError('Name, email, and a password of at least 6 characters are required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onCreate(form);
      setForm({ name: '', email: '', password: '', role: 'employee', department: '' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl dark:bg-slate-900 shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Add a new {canChooseRole ? 'team member' : 'employee'}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Full name</label>
            <input
              value={form.name}
              onChange={update('name')}
              className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Temporary password</label>
            <input
              type="text"
              value={form.password}
              onChange={update('password')}
              className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              placeholder="At least 6 characters"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {canChooseRole && (
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Role</label>
                <select
                  value={form.role}
                  onChange={update('role')}
                  className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
                >
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
            )}
            <div className={canChooseRole ? '' : 'col-span-2'}>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Department</label>
              <input
                value={form.department}
                onChange={update('department')}
                className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
                placeholder="e.g. Engineering"
              />
            </div>
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="text-sm px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
