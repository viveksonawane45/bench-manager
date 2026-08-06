import React from "react";
import { 
  Server, 
  Globe, 
  Cpu, 
  Database, 
  Zap, 
  Square,
  HardDrive,
  Compass,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Play
} from "lucide-react";
import { API_HOST } from "../config";

export default function Dashboard({ systemStats, benches, onRunTask, setActiveTab }) {
  const runningBenches = benches.filter(b => b.is_running);
  const stoppedBenches = benches.filter(b => !b.is_running);
  const totalSitesCount = benches.reduce((acc, b) => acc + (b.sites?.length || 0), 0);

  const formatBytes = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getProgressColor = (pct) => {
    if (pct > 85) return "bg-rose-500";
    if (pct > 65) return "bg-amber-500";
    return "bg-slate-900 dark:bg-white";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      
      {/* Hero Welcome Banner (Reference Image 2 Top Section Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-[#161722] p-8 sm:p-10 rounded-4xl border border-slate-900/10 dark:border-white/10 shadow-bento">
        <div className="lg:col-span-7 space-y-5">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-[1.15]">
            Manage And Control <br />
            <span className="font-serif-italic font-normal text-slate-700 dark:text-slate-300">
              Frappe Environments
            </span> On One Platform!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
            Operate multi-version Frappe benches, provision ERPNext sites, run real-time migrations, and monitor WSL system metrics with instantaneous control.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab("benches")}
              className="pill-btn-coral text-xs"
            >
              <Plus className="w-4 h-4" />
              Initialize Bench
            </button>
            
            <button
              onClick={() => setActiveTab("sites")}
              className="pill-btn-black text-xs"
            >
              <Globe className="w-4 h-4" />
              Provision Site
            </button>

            <button
              onClick={() => setActiveTab("processes")}
              className="pill-btn-outlined text-xs"
            >
              View Terminal Drawer
            </button>
          </div>
        </div>

        {/* Highlight Quick Card */}
        <div className="lg:col-span-5 bento-card-dark relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span style={{ color: '#cbd5e1' }} className="text-[10px] font-mono font-semibold uppercase tracking-wider">Environment Status</span>
              <h3 style={{ color: '#ffffff' }} className="text-2xl font-extrabold">
                WSL <span style={{ color: '#e06d61' }} className="font-serif-italic font-normal">Ubuntu Stack</span>
              </h3>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/15 pt-4 mt-6">
            <div>
              <p style={{ color: '#cbd5e1' }} className="text-[10px] uppercase font-mono">Active Benches</p>
              <p style={{ color: '#ffffff' }} className="text-2xl font-extrabold font-mono mt-0.5">{runningBenches.length} / {benches.length}</p>
            </div>
            <div>
              <p style={{ color: '#cbd5e1' }} className="text-[10px] uppercase font-mono">Hosted Sites</p>
              <p style={{ color: '#34d399' }} className="text-2xl font-extrabold font-mono mt-0.5">{totalSitesCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards — compact KPI row matching other pages */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-900/10 dark:border-white/10">
          <h3 className="text-base font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-coral" />
            Workspace Overview
          </h3>
          <span className="text-xs font-mono font-bold bg-coral/10 text-coral px-2.5 py-1 rounded-full">
            Live
          </span>
        </div>

        <div className="kpi-row">
          <div className="kpi-card flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kpi-label">Total Benches</p>
                <h3 className="kpi-value">{benches.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Server className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900/5 dark:border-white/5 flex items-center justify-between kpi-meta">
              <span>Active: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{runningBenches.length}</strong></span>
              <span>Stopped: <strong className="text-slate-400 font-mono">{stoppedBenches.length}</strong></span>
            </div>
          </div>

          <div className="kpi-card flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kpi-label">Active Sites</p>
                <h3 className="kpi-value">{totalSitesCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Globe className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900/5 dark:border-white/5 kpi-meta">
              Discovered from local paths
            </div>
          </div>

          <div className="kpi-card flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kpi-label">WSL CPU Load</p>
                <h3 className="kpi-value">
                  {systemStats.cpu !== undefined ? `${systemStats.cpu}%` : "---"}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Cpu className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900/5 dark:border-white/5">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getProgressColor(systemStats.cpu)}`}
                  style={{ width: `${systemStats.cpu || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="kpi-card flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kpi-label">WSL Memory</p>
                <h3 className="kpi-value">
                  {systemStats.ram ? `${systemStats.ram.percent}%` : "---"}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Database className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900/5 dark:border-white/5 space-y-2">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getProgressColor(systemStats.ram?.percent)}`}
                  style={{ width: `${systemStats.ram?.percent || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between kpi-meta font-mono">
                <span>{formatBytes(systemStats.ram?.used)}</span>
                <span>{formatBytes(systemStats.ram?.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services and Storage Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WSL Services Status */}
        <div className="bento-card lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-slate-950 dark:text-white text-base tracking-tight mb-5 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Frappe Service Stack <span className="font-serif-italic font-normal text-slate-600 dark:text-slate-400">(WSL Integration)</span>
            </h4>

            <div className="space-y-3">
              {/* MariaDB */}
              <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 dark:bg-[#1e1f2e] border border-slate-900/5 dark:border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center font-mono">
                    DB
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">MariaDB Server</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Primary Database for Frappe Sites</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${systemStats.services?.mariadb === "active" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-emerald-700 dark:text-emerald-400">
                    {systemStats.services?.mariadb || "inactive"}
                  </span>
                </div>
              </div>

              {/* Redis */}
              <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 dark:bg-[#1e1f2e] border border-slate-900/5 dark:border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center font-mono">
                    RD
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Redis Cache & Queue</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Caching, Sockets, and Task Queue</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${systemStats.services?.redis === "active" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-emerald-700 dark:text-emerald-400">
                    {systemStats.services?.redis || "inactive"}
                  </span>
                </div>
              </div>

              {/* Nginx */}
              <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 dark:bg-[#1e1f2e] border border-slate-900/5 dark:border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center font-mono">
                    NG
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Nginx Web Server</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Reverse Proxy for Sites & Web Portals</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${systemStats.services?.nginx === "active" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-emerald-700 dark:text-emerald-400">
                    {systemStats.services?.nginx || "inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Disk Storage Gauge */}
        <div className="bento-card flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-slate-950 dark:text-white text-base tracking-tight mb-4 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-500" />
              WSL Storage Gauge
            </h4>

            <div className="flex items-center justify-center py-4">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200 dark:text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-slate-950 dark:text-white transition-all duration-1000"
                    strokeWidth="3.5"
                    strokeDasharray={`${systemStats.disk?.percent || 0}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="text-2xl font-extrabold font-mono text-slate-950 dark:text-white">{systemStats.disk?.percent || 0}%</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Used</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-600 dark:text-slate-400 border-t border-slate-900/5 dark:border-white/5 pt-4 mt-2">
            <div className="flex justify-between">
              <span>Total Volume:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatBytes(systemStats.disk?.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Used Volume:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatBytes(systemStats.disk?.used)}</span>
            </div>
            <div className="flex justify-between">
              <span>Available space:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatBytes(systemStats.disk?.free)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Bento Cards (Style of Reference Image 2 - Taupe & Pitch-Black Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Taupe Card (Reference Image 2 Style) */}
        <div className="lg:col-span-7 bento-card-taupe relative overflow-hidden flex flex-col justify-between min-h-[280px]">
          <div className="flex items-start justify-between">
            <button
              onClick={() => setActiveTab("benches")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold transition-colors"
            >
              Manage Benches
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Active Processes <span className="font-serif-italic font-normal text-sky-200">And Running Benches</span> ({runningBenches.length})
            </h3>
            <p className="text-xs text-slate-200 font-medium max-w-lg leading-relaxed">
              Monitored honcho & gunicorn background workers running across your local Frappe benches.
            </p>

            {runningBenches.length > 0 ? (
              <div className="space-y-2 pt-1">
                {runningBenches.map((bench) => (
                  <div key={bench.path} className="bench-row p-3.5 rounded-2xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h5 className="text-sm font-bold text-white">{bench.name}</h5>
                      <p className="text-[11px] text-slate-200 font-mono mt-0.5 truncate">{bench.path}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-mono font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                        Sites: {bench.sites?.length || 0}
                      </span>
                      <button
                        onClick={() => {
                          onRunTask(
                            fetch(`${API_HOST}/api/processes/stop`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ bench_path: bench.path })
                            })
                          );
                        }}
                        className="px-3 py-1 rounded-full bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 transition-colors shadow-sm flex items-center gap-1"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        Stop Bench
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/10 border border-white/15 text-xs text-slate-200 font-medium italic text-center">
                No benches currently active. Click "Manage Benches" to start a bench.
              </div>
            )}
          </div>
        </div>

        {/* Pitch Black Card (Reference Image 2 Style) */}
        <div className="lg:col-span-5 bento-card-dark relative overflow-hidden flex flex-col justify-between min-h-[300px]">
          <div className="flex items-start justify-between">
            <span style={{ color: '#ffffff' }} className="px-3.5 py-1.5 rounded-full bg-white/10 text-xs font-bold border border-white/15">
              Launchpad
            </span>

            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h3 style={{ color: '#ffffff' }} className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Fast-Track <span style={{ color: '#e06d61' }} className="font-serif-italic font-normal">Command Actions</span>
            </h3>
            <p style={{ color: '#cbd5e1' }} className="text-xs font-medium max-w-sm leading-relaxed">
              Instant shortcuts to initialize benches, provision multi-tenant sites, and inspect background terminal outputs.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setActiveTab("benches")}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/20 border border-white/20 text-xs font-bold transition-all group"
              >
                <span style={{ color: '#ffffff' }} className="font-bold">Initialize New Bench</span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => setActiveTab("sites")}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/20 border border-white/20 text-xs font-bold transition-all group"
              >
                <span style={{ color: '#ffffff' }} className="font-bold">Provision Site & Domain</span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => setActiveTab("apps")}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/20 border border-white/20 text-xs font-bold transition-all group"
              >
                <span style={{ color: '#ffffff' }} className="font-bold">Browse Frappe Applications</span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
