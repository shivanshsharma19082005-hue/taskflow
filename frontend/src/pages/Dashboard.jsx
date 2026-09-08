import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import StatsBar from '../components/StatsBar';
import TaskCard from '../components/TaskCard';
import CreateTaskModal from '../components/CreateTaskModal';
import CreateUserModal from '../components/CreateUserModal';
import TeamPanel from '../components/TeamPanel';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in-progress', label: 'Working' },
  { key: 'completed', label: 'Completed' },
];

const Dashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [team, setTeam] = useState({ admins: [], employees: [] });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const canManage = user.role === 'mainboss' || user.role === 'admin';

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  // Single source of truth for adding/replacing a task in state, used by both
  // the Socket.IO handlers AND the direct API-response handlers below. Both
  // paths can race (HTTP response vs WebSocket message for the same action),
  // so both MUST go through this de-duping upsert instead of ever prepending
  // a task unconditionally - an unconditional prepend is what caused tasks to
  // occasionally appear twice.
  const upsertTask = useCallback((task) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t._id === task._id);
      return exists ? prev.map((t) => (t._id === task._id ? task : t)) : [task, ...prev];
    });
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, statsRes, teamRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/tasks/stats'),
        api.get('/users/team'),
      ]);
      setTasks(tasksRes.data.tasks);
      setStats(statsRes.data.stats);
      setTeam(teamRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // --- Real-time updates via Socket.IO ---
  useEffect(() => {
    if (!socket) return;

    const onCreated = (task) => {
      upsertTask(task);
      if (String(task.assignedTo?._id || task.assignedTo?.id) === String(user.id)) {
        showToast(`New task assigned to you: "${task.title}"`);
      }
      refreshStats();
    };

    const onUpdated = (task) => {
      upsertTask(task);
      refreshStats();
    };

    const onDeleted = ({ id }) => {
      setTasks((prev) => prev.filter((t) => t._id !== id));
      refreshStats();
    };

    const onUserCreated = () => {
      api.get('/users/team').then((res) => setTeam(res.data));
    };
    const onUserDeleted = () => {
      api.get('/users/team').then((res) => setTeam(res.data));
    };

    const refreshStats = () => {
      api.get('/tasks/stats').then((res) => setStats(res.data.stats));
    };

    socket.on('task:created', onCreated);
    socket.on('task:updated', onUpdated);
    socket.on('task:deleted', onDeleted);
    socket.on('user:created', onUserCreated);
    socket.on('user:deleted', onUserDeleted);

    return () => {
      socket.off('task:created', onCreated);
      socket.off('task:updated', onUpdated);
      socket.off('task:deleted', onDeleted);
      socket.off('user:created', onUserCreated);
      socket.off('user:deleted', onUserDeleted);
    };
  }, [socket, user.id, upsertTask]);

  const filteredTasks = useMemo(() => {
    // "All" is the default/active view, so completed tasks are hidden from
    // it to keep it focused on work that still needs attention - they're
    // still fully visible under the dedicated "Completed" tab.
    if (filter === 'all') return tasks.filter((t) => t.status !== 'completed');
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const assignableUsers = useMemo(() => {
    if (user.role === 'mainboss') return [...team.admins, ...team.employees];
    if (user.role === 'admin') return team.employees || [];
    return [];
  }, [user.role, team]);

  const handleStatusChange = async (taskId, status) => {
    const { data } = await api.patch(`/tasks/${taskId}/status`, { status });
    setTasks((prev) => prev.map((t) => (t._id === taskId ? data.task : t)));
    const statsRes = await api.get('/tasks/stats');
    setStats(statsRes.data.stats);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await api.delete(`/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  };

  const handleAddComment = async (taskId, text) => {
    const { data } = await api.post(`/tasks/${taskId}/comments`, { text });
    setTasks((prev) => prev.map((t) => (t._id === taskId ? data.task : t)));
  };

  const handleCreateTask = async (form) => {
    const payload = { ...form };
    if (!payload.dueDate) delete payload.dueDate;
    const { data } = await api.post('/tasks', payload);
    // upsertTask (not a raw prepend) - the socket 'task:created' broadcast for
    // this same task can arrive before or after this HTTP response resolves,
    // and both paths must converge on the same de-duped entry instead of the
    // task ending up in the list twice.
    upsertTask(data.task);
    const statsRes = await api.get('/tasks/stats');
    setStats(statsRes.data.stats);
  };

  const handleCreateUser = async (form) => {
    await api.post('/users', form);
    const res = await api.get('/users/team');
    setTeam(res.data);
  };

  const handleRemoveUser = async (id) => {
    if (!window.confirm('Remove this person? Their tasks will be deleted.')) return;
    await api.delete(`/users/${id}`);
    const res = await api.get('/users/team');
    setTeam(res.data);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1020] transition-colors duration-300">
      <Navbar />

      {toast && (
        <div className="fixed top-16 right-4 z-30 bg-slate-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg animate-pulse">
          {toast}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5 sm:space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {user.role === 'mainboss' ? 'Company overview' : user.role === 'admin' ? `${user.department} team` : 'My tasks'}
            </h1>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {user.role === 'employee'
                ? 'Tasks assigned to you, live-updated as your manager assigns new work.'
                : 'Assign work and track progress across your team in real time.'}
            </p>
          </div>
          <div className="flex w-full sm:w-auto gap-2 mobile-stack-actions">
            {canManage && (
              <button
                onClick={() => setUserModalOpen(true)}
                className="text-sm px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                + Add person
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setTaskModalOpen(true)}
                className="text-sm px-3.5 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700"
              >
                + Assign task
              </button>
            )}
          </div>
        </div>

        <StatsBar stats={stats} />

        <div className={`grid grid-cols-1 ${canManage ? 'lg:grid-cols-[1fr_260px]' : ''} gap-6`}>
          <div>
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                    filter === f.key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Loading tasks…</p>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
                <p className="text-sm text-slate-400">No tasks here yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                    onAddComment={handleAddComment}
                  />
                ))}
              </div>
            )}
          </div>

          {canManage && (
            <aside className="space-y-4">
              {user.role === 'mainboss' && (
                <TeamPanel title="Admins" members={team.admins || []} onRemove={handleRemoveUser} canRemove />
              )}
              <TeamPanel
                title={user.role === 'mainboss' ? 'All employees' : 'My employees'}
                members={team.employees || []}
                onRemove={handleRemoveUser}
                canRemove
              />
            </aside>
          )}
        </div>
      </main>

      <CreateTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onCreate={handleCreateTask}
        assignableUsers={assignableUsers}
      />
      <CreateUserModal open={userModalOpen} onClose={() => setUserModalOpen(false)} onCreate={handleCreateUser} />
    </div>
  );
};

export default Dashboard;
