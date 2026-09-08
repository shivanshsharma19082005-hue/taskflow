import React, { useState } from 'react';

const CreateTaskModal = ({ open, onClose, onCreate, assignableUsers }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.assignedTo) {
      setError('Title and assignee are required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onCreate(form);
      setForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl dark:bg-slate-900 shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Assign a new task</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Title</label>
            <input
              value={form.title}
              onChange={update('title')}
              className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              placeholder="e.g. Fix homepage layout bug"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Description</label>
            <textarea
              value={form.description}
              onChange={update('description')}
              rows={3}
              className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              placeholder="Optional details…"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Assign to</label>
            <select
              value={form.assignedTo}
              onChange={update('assignedTo')}
              className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
            >
              <option value="">Select a person…</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Priority</label>
              <select
                value={form.priority}
                onChange={update('priority')}
                className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Due date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={update('dueDate')}
                className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
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
              {submitting ? 'Assigning…' : 'Assign task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
