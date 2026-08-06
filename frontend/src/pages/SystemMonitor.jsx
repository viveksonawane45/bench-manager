import React, { useEffect, useState } from "react";
import { 
  Activity, 
  Cpu, 
  Database, 
  HardDrive, 
  Settings, 
  Terminal, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw
} from "lucide-react";

export default function SystemMonitor({ systemStats, checkConnection }) {
  const [cpuHistory, setCpuHistory] = useState([]);
  const [ramHistory, setRamHistory] = useState([]);

  // Record history for charts
  useEffect(() => {
    if (systemStats.cpu !== undefined) {
      setCpuHistory((prev) => {
        const next = [...prev, systemStats.cpu];
        if (next.length > 20) next.shift();
        return next;
      });
    }
    if (systemStats.ram?.percent !== undefined) {
      setRamHistory((prev) => {
        const next = [...prev, systemStats.ram.percent];
        if (next.length > 20) next.shift();
        return next;
      });
    }
  }, [systemStats]);

  const formatBytes = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Reusable SVG Chart Component
  const RenderHistoryChart = ({ history, color, gradientId }) => {
    if (history.length < 2) {
      return (
        <div className="h-[120px] flex items-center justify-center text-xs text-darkTextMuted font-mono">
          Gathering charts data...
        </div>
      );
    }

    const width = 500;
    const height = 120;
    const maxVal = 100;
    
    // Create points
    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - (val / maxVal) * height;
      return `${x},${y}`;
    });

    const linePath = `M ${points.join(" L ")}`;
    const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

    return (
      <div className="w-full h-[120px] relative mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.00" />
            </linearGradient>
          </defs>
          
          {/* Horizontal lines */}
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />

          {/* Area fill */}
          <path d={areaPath} fill={`url(#${gradientId})`} />
          
          {/* Stroke path */}
          <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="absolute top-0 right-0 text-[9px] font-mono text-darkTextMuted">100%</span>
        <span className="absolute bottom-0 right-0 text-[9px] font-mono text-darkTextMuted">0%</span>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      
      {/* Top action header */}
      <div className="flex items-center justify-between bg-white dark:bg-[#161722] p-4 rounded-3xl border border-slate-900/10 dark:border-white/10 shadow-sm">
        <div>
          <h3 className="text-base font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-coral" />
            WSL System Health & Performance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time Linux process resources, disk space, and daemon status</p>
        </div>

        <button
          onClick={checkConnection}
          className="p-2.5 rounded-full bg-slate-100 dark:bg-charcoal border border-slate-900/10 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className="w-4 h-4" />
          Poll System Telemetry
        </button>
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CPU Usage Chart Card */}
        <div className="bento-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">CPU Processor Load</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">WSL Ubuntu Virtual Machine</p>
                </div>
              </div>

              <span className="text-2xl font-extrabold font-mono text-slate-950 dark:text-white">
                {systemStats.cpu !== undefined ? `${systemStats.cpu}%` : "---"}
              </span>
            </div>

            <RenderHistoryChart history={cpuHistory} color="#f59e0b" gradientId="cpuGrad" />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-900/5 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Sampling: Live (Every 3s)</span>
            <span>Current Load: {systemStats.cpu || 0}%</span>
          </div>
        </div>

        {/* RAM Usage Chart Card */}
        <div className="bento-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">RAM Memory Utilization</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">System Dynamic Allocations</p>
                </div>
              </div>

              <span className="text-2xl font-extrabold font-mono text-slate-950 dark:text-white">
                {systemStats.ram?.percent !== undefined ? `${systemStats.ram.percent}%` : "---"}
              </span>
            </div>

            <RenderHistoryChart history={ramHistory} color="#6366f1" gradientId="ramGrad" />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-900/5 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Used: {formatBytes(systemStats.ram?.used)}</span>
            <span>Total: {formatBytes(systemStats.ram?.total)}</span>
          </div>
        </div>
      </div>

      {/* Services and Filesystem Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Storage space detailed block */}
        <div className="glass-card p-6 rounded-2xl col-span-2">
          <h4 className="font-bold text-white text-sm tracking-tight mb-4 flex items-center gap-2">
            <HardDrive className="w-4.5 h-4.5 text-emerald-400" />
            Linux / WSL Hard Drive Partition
          </h4>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-darkTextMuted font-semibold mb-2">
                <span>Disk allocation:</span>
                <span className="text-white">{systemStats.disk?.percent}% used</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${systemStats.disk?.percent || 0}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs font-mono pt-2">
              <div className="p-3 bg-slate-900/40 border border-darkBorder/30 rounded-xl">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Total Size</p>
                <p className="text-white font-bold mt-1">{formatBytes(systemStats.disk?.total)}</p>
              </div>
              <div className="p-3 bg-slate-900/40 border border-darkBorder/30 rounded-xl">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Used Space</p>
                <p className="text-white font-bold mt-1">{formatBytes(systemStats.disk?.used)}</p>
              </div>
              <div className="p-3 bg-slate-900/40 border border-darkBorder/30 rounded-xl">
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Free Space</p>
                <p className="text-white font-bold mt-1">{formatBytes(systemStats.disk?.free)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* WSL Environment context */}
        <div className="glass-card p-6 rounded-2xl text-xs space-y-4">
          <h4 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
            <Settings className="w-4.5 h-4.5 text-slate-400" />
            Environment Info
          </h4>
          
          <div className="space-y-3 font-mono">
            <div className="flex justify-between border-b border-darkBorder/30 pb-2">
              <span className="text-slate-500">Platform:</span>
              <span className="text-slate-200">WSL Ubuntu 24.04</span>
            </div>
            <div className="flex justify-between border-b border-darkBorder/30 pb-2">
              <span className="text-slate-500">Port mapping:</span>
              <span className="text-slate-200">Localhost auto</span>
            </div>
            <div className="flex justify-between border-b border-darkBorder/30 pb-2">
              <span className="text-slate-500">DB Host:</span>
              <span className="text-slate-200">127.0.0.1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">MariaDB Socket:</span>
              <span className="text-slate-200">TCP Port 3306</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
