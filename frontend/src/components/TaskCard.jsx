import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const PRIORITY_STYLES = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS = {
  pending: 'Pending',
  'in-progress': 'In progress',
  completed: 'Completed',
};

const formatDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const isOverdue = (task) =>
  task.dueDate && task.status !== 'completed' && new Date(task.dueDate).getTime() < Date.now();

const TaskCard = ({ task, onStatusChange, onDelete, onAddComment }) => {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete is Boss-only. No one else - not even the Admin who assigned the
  // task - can delete it. This must mirror the backend's authorize('mainboss')
  // guard on DELETE /api/tasks/:id exactly, or the button would appear for
  // people whose delete request the API would just reject.
  const canDelete = user.role === 'mainboss';

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(task._id, commentText.trim());
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800 leading-snug dark:text-slate-100">{task.title}</h3>
        <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="text-sm leading-6 text-slate-500 mt-1.5 dark:text-slate-400 line-clamp-3">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-slate-400 dark:text-slate-500">
        <span>
          Assigned to <span className="font-semibold text-slate-600 dark:text-slate-200">{task.assignedTo?.name}</span>
        </span>
        <span>
          by <span className="font-semibold text-slate-600 dark:text-slate-200">{task.assignedBy?.name}</span>
        </span>
        {task.dueDate && (
          <span className={isOverdue(task) ? 'text-rose-500 font-medium' : ''}>
            Due {formatDate(task.dueDate)}
            {isOverdue(task) ? ' (overdue)' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task._id, e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-600 bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowComments((s) => !s)}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-brand-600"
          >
            {task.comments?.length || 0} comment{(task.comments?.length || 0) === 1 ? '' : 's'}
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete(task._id)}
              className="text-xs text-rose-400 hover:text-rose-600"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {task.comments?.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500">No comments yet.</p>
          )}
          {task.comments?.map((c) => (
            <div key={c._id} className="text-xs bg-slate-50 rounded-lg px-3 py-2 dark:bg-slate-800">
              <span className="font-semibold text-slate-600 dark:text-slate-200">{c.author?.name}</span>{' '}
              <span className="text-slate-400">
                {new Date(c.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <p className="text-slate-600 mt-0.5">{c.text}</p>
            </div>
          ))}
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="text-xs px-3 py-1.5 rounded-md bg-brand-600 text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
