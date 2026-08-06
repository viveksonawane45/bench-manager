import React, { useEffect, useState } from "react";
import { API_HOST } from "../config";
import { 
  Terminal as TerminalIcon, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Clock
} from "lucide-react";

export default function ProcessManager({ onRunTask }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = () => {
    fetch(`${API_HOST}/api/processes/tasks`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          data.sort((a, b) => b.started_at - a.started_at);
          setTasks(data);
        }
      })
      .catch((err) => console.error("Error fetching tasks:", err));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "success":
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">Success</span>;
      case "failed":
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase">Failed</span>;
      case "running":
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase animate-pulse">Running</span>;
      default:
        return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">Unknown</span>;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "---";
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  const formatDuration = (task) => {
    if (!task.started_at) return "---";
    const end = task.ended_at || Date.now() / 1000;
    const diff = Math.round(end - task.started_at);
    if (diff < 60) return `${diff}s`;
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}m ${s}s`;
  };

  const runningTasksCount = tasks.filter((t) => t.status === "running").length;
  const successTasksCount = tasks.filter((t) => t.status === "success").length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      
      {/* TOP: Compact KPI row */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-900/10 dark:border-white/10">
          <h3 className="text-sm font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-coral" />
            Worker Telemetry
          </h3>
          <span className="text-[10px] font-mono font-bold bg-coral/10 text-coral px-2.5 py-0.5 rounded-full">
            {tasks.length} Tasks
          </span>
        </div>

        <div className="kpi-row kpi-row-3">
          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Total Executed Tasks</p>
              <h3 className="kpi-value">{tasks.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TerminalIcon className="w-6 h-6" />
            </div>
          </div>

          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Active Workers</p>
              <h3 className="kpi-value text-amber-500">{runningTasksCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          </div>

          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Successful Tasks</p>
              <h3 className="kpi-value text-emerald-600 dark:text-emerald-400">{successTasksCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Full-width content */}
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white dark:bg-[#161722] p-4 rounded-3xl border border-slate-900/10 dark:border-white/10 shadow-sm">
          <div>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
              <TerminalIcon className="w-5 h-5 text-coral" />
              Background Task Stream
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time WSL command execution logs and honcho process output</p>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              fetchTasks();
              setTimeout(() => setLoading(false), 500);
            }}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-charcoal border border-slate-900/10 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Stream
          </button>
        </div>

        {/* Task List Table */}
        <div className="bento-card overflow-hidden !p-0">
          {tasks.length > 0 ? (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900/5 dark:border-white/10 bg-slate-100/50 dark:bg-charcoal text-slate-500 dark:text-slate-400 font-extrabold tracking-wider uppercase text-[10px]">
                  <th className="p-4">Status</th>
                  <th className="p-4">Command / Task Description</th>
                  <th className="p-4">Started At</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4 text-right">Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/5 dark:divide-white/5">
                {tasks.map((task) => (
                  <tr key={task.task_id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        {getStatusBadge(task.status)}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-semibold text-slate-900 dark:text-white max-w-xs truncate" title={task.description || task.command}>
                      {task.description || task.command || task.task_id}
                    </td>
                    <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                      {formatTime(task.started_at)}
                    </td>
                    <td className="p-4 font-mono text-slate-500 dark:text-slate-400">
                      {formatDuration(task)}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onRunTask({ task_id: task.task_id })}
                        className="px-3.5 py-1.5 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-[11px] font-bold hover:scale-105 transition-all shadow-sm"
                      >
                        View Live Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16">
              <TerminalIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-950 dark:text-white">No Executed Tasks Found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Start a bench, create a site, or run a migration to stream live task logs.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
