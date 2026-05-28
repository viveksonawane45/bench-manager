import React, { useEffect, useState } from "react";
import { API_HOST } from "../config";
import { 
  Terminal as TerminalIcon, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Trash2,
  Clock,
  Play
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
          // Sort by started_at desc
          data.sort((a, b) => b.started_at - a.started_at);
          setTasks(data);
        }
      })
      .catch((err) => console.error("Error fetching tasks:", err));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-danger" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-warning animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "success":
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success uppercase">Success</span>;
      case "failed":
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-danger/10 text-danger uppercase">Failed</span>;
      case "running":
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning uppercase pulse-soft">Running</span>;
      default:
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-darkTextMuted uppercase">Unknown</span>;
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-darkTextMuted">Monitor and inspect background execution tasks running in WSL</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchTasks();
            setTimeout(() => setLoading(false), 500);
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 border border-darkBorder text-xs font-semibold text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Log Tasks
        </button>
      </div>

      {/* Task List table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {tasks.length > 0 ? (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-darkBorder/40 bg-slate-900/40 text-darkTextMuted font-bold tracking-wider uppercase text-[10px]">
                <th className="p-4 w-12"></th>
                <th className="p-4">Command Target</th>
                <th className="p-4">Started At</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Execution Status</th>
                <th className="p-4 text-right">Terminal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-darkBorder/30">
              {tasks.map((task) => (
                <tr key={task.task_id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="p-4 text-center">
                    {getStatusIcon(task.status)}
                  </td>
                  <td className="p-4">
                    <p className="font-mono text-xs text-white max-w-[280px] md:max-w-[400px] truncate" title={task.command}>
                      $ {task.command}
                    </p>
                    <p className="text-[9px] text-darkTextMuted font-mono select-all mt-0.5">{task.task_id}</p>
                  </td>
                  <td className="p-4 font-mono text-darkTextMuted">
                    {formatTime(task.started_at)}
                  </td>
                  <td className="p-4 font-mono text-darkTextMuted">
                    {formatDuration(task)}
                  </td>
                  <td className="p-4">
                    {getStatusBadge(task.status)}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => onRunTask(Promise.resolve({ task_id: task.task_id }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-darkBorder hover:border-darkAccent text-[11px] font-semibold text-slate-200 hover:text-white transition-all rounded-lg"
                    >
                      <TerminalIcon className="w-3.5 h-3.5 text-darkAccent" />
                      View Logs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16">
            <TerminalIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-base font-bold text-white">No tasks executed yet</h3>
            <p className="text-xs text-darkTextMuted mt-1 max-w-xs mx-auto">
              Any commands (bench init, bench new-site, install-app, etc.) run from the dashboard will log execution history here.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
