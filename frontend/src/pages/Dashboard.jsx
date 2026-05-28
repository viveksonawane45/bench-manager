import React, { useEffect, useState } from "react";
import { 
  Server, 
  Globe, 
  Cpu, 
  Database, 
  Zap, 
  AlertTriangle, 
  Play, 
  Square,
  HardDrive,
  Compass,
  ArrowRight
} from "lucide-react";
import { API_HOST } from "../config";

export default function Dashboard({ systemStats, benches, onRunTask, setActiveTab }) {
  const runningBenches = benches.filter(b => b.is_running);
  const stoppedBenches = benches.filter(b => !b.is_running);

  const formatBytes = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getUsageColor = (pct) => {
    if (pct > 85) return "text-danger bg-danger/10 border-danger/20";
    if (pct > 65) return "text-warning bg-warning/10 border-warning/20";
    return "text-success bg-success/10 border-success/20";
  };

  const getProgressColor = (pct) => {
    if (pct > 85) return "bg-danger";
    if (pct > 65) return "bg-warning";
    return "bg-darkAccent";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Benches Card */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-darkTextMuted font-medium uppercase tracking-wider">Total Benches</p>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">{benches.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-darkAccent/10 border border-darkAccent/20 flex items-center justify-center">
              <Server className="w-6 h-6 text-darkAccent" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-darkBorder/40 flex items-center justify-between text-xs">
            <span className="text-darkTextMuted">Active: <strong className="text-success">{runningBenches.length}</strong></span>
            <span className="text-darkTextMuted">Stopped: <strong className="text-slate-400">{stoppedBenches.length}</strong></span>
          </div>
        </div>

        {/* Total Sites Card */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-darkTextMuted font-medium uppercase tracking-wider">Active Sites</p>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">
                {benches.reduce((acc, b) => acc + (b.sites?.length || 0), 0)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center">
              <Globe className="w-6 h-6 text-success" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-darkBorder/40 flex items-center justify-between text-xs">
            <span className="text-darkTextMuted">Discovered from local paths</span>
          </div>
        </div>

        {/* CPU Load Card */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-darkTextMuted font-medium uppercase tracking-wider">WSL CPU load</p>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">
                {systemStats.cpu !== undefined ? `${systemStats.cpu}%` : "---"}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-warning" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-darkBorder/40 flex flex-col gap-2">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getProgressColor(systemStats.cpu)}`}
                style={{ width: `${systemStats.cpu || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* RAM Usage Card */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-darkTextMuted font-medium uppercase tracking-wider">WSL Memory</p>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">
                {systemStats.ram ? `${systemStats.ram.percent}%` : "---"}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Database className="w-6 h-6 text-success" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-darkBorder/40 flex flex-col gap-2">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getProgressColor(systemStats.ram?.percent)}`}
                style={{ width: `${systemStats.ram?.percent || 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-darkTextMuted font-mono">
              <span>Used: {formatBytes(systemStats.ram?.used)}</span>
              <span>Total: {formatBytes(systemStats.ram?.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Services and Storage Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* WSL Dependent Services Status */}
        <div className="glass-card p-6 rounded-2xl col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white text-sm tracking-tight mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              Frappe Service Stack (WSL)
            </h4>
            <div className="space-y-4">
              {/* MariaDB */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-darkBorder/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">
                    DB
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">MariaDB Server</h5>
                    <p className="text-[10px] text-darkTextMuted">Primary Database for Frappe Sites</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${systemStats.services?.mariadb === "active" ? "bg-success pulse-soft" : "bg-danger"}`} />
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-350">
                    {systemStats.services?.mariadb || "inactive"}
                  </span>
                </div>
              </div>

              {/* Redis-server */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-darkBorder/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-xs">
                    RD
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">Redis Cache & Queue</h5>
                    <p className="text-[10px] text-darkTextMuted">Caching, Sockets, and Task Queue</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${systemStats.services?.redis === "active" ? "bg-success pulse-soft" : "bg-danger"}`} />
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-350">
                    {systemStats.services?.redis || "inactive"}
                  </span>
                </div>
              </div>

              {/* Nginx */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-darkBorder/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 font-bold text-xs">
                    NG
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">Nginx Web Server</h5>
                    <p className="text-[10px] text-darkTextMuted">Reverse Proxy for Sites & Web Portals</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${systemStats.services?.nginx === "active" ? "bg-success pulse-soft" : "bg-danger"}`} />
                  <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-350">
                    {systemStats.services?.nginx || "inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Storage usage */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white text-sm tracking-tight mb-4 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              WSL Disk Storage
            </h4>
            <div className="flex items-center justify-center py-4">
              {/* Large responsive gauge */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-success transition-all duration-1000"
                    strokeWidth="3"
                    strokeDasharray={`${systemStats.disk?.percent || 0}, 100`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="text-xl font-bold font-mono text-white">{systemStats.disk?.percent || 0}%</p>
                  <p className="text-[8px] text-darkTextMuted font-semibold uppercase">Used</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-1.5 text-xs font-mono text-darkTextMuted border-t border-darkBorder/40 pt-4 mt-2">
            <div className="flex justify-between">
              <span>Total Volume:</span>
              <span className="text-white">{formatBytes(systemStats.disk?.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Used Volume:</span>
              <span className="text-white">{formatBytes(systemStats.disk?.used)}</span>
            </div>
            <div className="flex justify-between">
              <span>Available space:</span>
              <span className="text-white">{formatBytes(systemStats.disk?.free)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Running benches & Quick access list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Running benches */}
        <div className="glass-card p-6 rounded-2xl md:col-span-2">
          <h4 className="font-bold text-white text-sm tracking-tight mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-darkAccent" />
            Active Processes ({runningBenches.length})
          </h4>
          {runningBenches.length > 0 ? (
            <div className="divide-y divide-darkBorder/30">
              {runningBenches.map((bench) => (
                <div key={bench.path} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <h5 className="text-sm font-semibold text-white">{bench.name}</h5>
                    <p className="text-xs text-darkTextMuted font-mono mt-0.5">{bench.path}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-mono text-darkTextMuted bg-slate-800/60 border border-darkBorder/35 px-2 py-0.5 rounded">
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
                      className="flex items-center gap-1.5 text-xs text-danger hover:bg-danger/10 border border-danger/10 hover:border-danger/25 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      <Square className="w-3 h-3 fill-danger" />
                      Stop Bench
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-darkBorder/40 rounded-xl">
              <p className="text-xs text-darkTextMuted">No benches are currently running</p>
              <button
                onClick={() => setActiveTab("benches")}
                className="mt-3 text-xs text-darkAccent font-semibold hover:underline flex items-center gap-1 mx-auto"
              >
                Go to Benches <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Quick Launchpad */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white text-sm tracking-tight mb-4 flex items-center gap-2">
              <Compass className="w-4 h-4 text-success" />
              Command Launchpad
            </h4>
            <div className="space-y-2.5">
              <button
                onClick={() => setActiveTab("benches")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/30 hover:bg-slate-800/40 border border-darkBorder/30 hover:border-darkAccent/30 text-xs font-semibold text-slate-200 transition-colors"
              >
                Create New Bench
                <ArrowRight className="w-4 h-4 text-darkTextMuted" />
              </button>
              <button
                onClick={() => setActiveTab("sites")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/30 hover:bg-slate-800/40 border border-darkBorder/30 hover:border-darkAccent/30 text-xs font-semibold text-slate-200 transition-colors"
              >
                Provision New Site
                <ArrowRight className="w-4 h-4 text-darkTextMuted" />
              </button>
              <button
                onClick={() => setActiveTab("apps")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/30 hover:bg-slate-800/40 border border-darkBorder/30 hover:border-darkAccent/30 text-xs font-semibold text-slate-200 transition-colors"
              >
                Download Frappe Apps
                <ArrowRight className="w-4 h-4 text-darkTextMuted" />
              </button>
              <button
                onClick={() => setActiveTab("processes")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/30 hover:bg-slate-800/40 border border-darkBorder/30 hover:border-darkAccent/30 text-xs font-semibold text-slate-200 transition-colors"
              >
                Check Process Terminal
                <ArrowRight className="w-4 h-4 text-darkTextMuted" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
