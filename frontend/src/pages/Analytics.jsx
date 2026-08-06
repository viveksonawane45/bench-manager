import React, { useMemo, useState } from "react";
import {
  BarChart3,
  Server,
  Globe,
  AppWindow,
  Database,
  Cpu,
} from "lucide-react";
import HierarchyOrgChart from "../components/HierarchyOrgChart";

function resolveSiteApps(bench, site) {
  if (site?.installed_apps?.length) {
    return site.installed_apps.map((app) => ({
      name: typeof app === "string" ? app : app.name,
      version: typeof app === "string" ? "Unknown" : (app.version || "Unknown"),
      inferred: typeof app === "string" ? false : !!app.inferred,
    })).filter((a) => a.name);
  }
  return (bench?.apps || []).map((app) => ({
    name: typeof app === "string" ? app : app.name,
    version: typeof app === "string" ? "Unknown" : (app.version || "Unknown"),
    inferred: true,
  })).filter((a) => a.name);
}

export default function Analytics({ benches, systemStats }) {
  const [timeRange, setTimeRange] = useState("all");

  const totalBenches = benches.length;
  const runningBenches = benches.filter((b) => b.is_running).length;
  const totalSites = benches.reduce((acc, b) => acc + (b.sites?.length || 0), 0);

  const appInventory = useMemo(() => {
    const map = {};

    benches.forEach((bench) => {
      (bench.sites || []).forEach((site) => {
        resolveSiteApps(bench, site).forEach((app) => {
          if (!map[app.name]) {
            map[app.name] = { name: app.name, versions: new Set(), sites: [] };
          }
          map[app.name].versions.add(app.version);
          map[app.name].sites.push({
            siteName: site.name,
            sitePort: site.port,
            benchName: bench.name,
            benchPath: bench.path,
            frappeVersion: bench.frappe_version || "Unknown",
            pythonVersion: bench.python_version || "Unknown",
            nodeVersion: bench.node_version || "Unknown",
            appVersion: app.version,
            isRunning: !!bench.is_running,
            inferred: !!app.inferred,
          });
        });
      });
    });

    return Object.values(map)
      .map((entry) => ({
        ...entry,
        versions: Array.from(entry.versions),
        siteCount: entry.sites.length,
        benchCount: new Set(entry.sites.map((s) => s.benchPath)).size,
      }))
      .sort((a, b) => b.siteCount - a.siteCount || a.name.localeCompare(b.name));
  }, [benches]);

  const uniqueAppCount = appInventory.length;
  const totalInstalls = appInventory.reduce((a, x) => a + x.siteCount, 0);

  const formatBytes = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      <div>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-900/10 dark:border-white/10">
          <h3 className="text-base font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-coral" />
            Analytics Overview
          </h3>
          <span className="text-xs font-mono font-bold bg-coral/10 text-coral px-2.5 py-1 rounded-full">
            Live Stream
          </span>
        </div>

        <div className="kpi-row">
          <div className="kpi-card flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kpi-label">Bench Fleet Ratio</p>
                <h3 className="kpi-value">
                  {runningBenches} <span className="text-slate-400 text-2xl font-normal">/ {totalBenches}</span>
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Server className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900/5 dark:border-white/5 flex items-center justify-between kpi-meta">
              <span>Active: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{runningBenches}</strong></span>
              <span>Stopped: <strong className="text-slate-400 font-mono">{totalBenches - runningBenches}</strong></span>
            </div>
          </div>

          <div className="kpi-card flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kpi-label">Provisioned Sites</p>
                <h3 className="kpi-value text-emerald-600 dark:text-emerald-400">{totalSites}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6" />
              </div>
            </div>
            <p className="kpi-meta mt-4 pt-3 border-t border-slate-900/5 dark:border-white/5">
              Avg <strong className="text-slate-900 dark:text-white font-mono">{(totalSites / (totalBenches || 1)).toFixed(1)}</strong> / bench
            </p>
          </div>

          <div className="kpi-card flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kpi-label">Installed App Store</p>
                <h3 className="kpi-value text-indigo-600 dark:text-indigo-400">{uniqueAppCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <AppWindow className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900/5 dark:border-white/5 kpi-meta flex justify-between">
              <span>Across sites</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">{totalInstalls} installs</span>
            </div>
          </div>

          <div className="kpi-card flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="kpi-label">WSL Memory Load</p>
                <h3 className="kpi-value">
                  {systemStats.ram?.percent !== undefined ? `${systemStats.ram.percent}%` : "---"}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Cpu className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900/5 dark:border-white/5 kpi-meta font-mono flex justify-between">
              <span>{formatBytes(systemStats.ram?.used)}</span>
              <span>{formatBytes(systemStats.ram?.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#161722] p-4 rounded-2xl border border-slate-900/10 dark:border-white/10 shadow-sm">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white tracking-tight">
              Fleet Insights
              <span className="font-serif-italic font-normal text-slate-500"> — density & install load</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Bar insights for site density per bench and app install footprint across the fleet
            </p>
          </div>

          <div className="flex items-center gap-2">
            {["all", "7d", "30d"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold uppercase transition-all ${
                  timeRange === range
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                    : "bg-slate-100 dark:bg-charcoal text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <HierarchyOrgChart mode="bench" benches={benches} appInventory={appInventory} />
        <HierarchyOrgChart mode="app" benches={benches} appInventory={appInventory} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bento-card space-y-4">
            <h3 className="text-lg font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-coral" />
              Site Provisioning Distribution
            </h3>
            <div className="space-y-3 pt-2">
              {benches.map((bench) => {
                const siteCount = bench.sites?.length || 0;
                const pct = totalSites > 0 ? Math.round((siteCount / totalSites) * 100) : 0;
                return (
                  <div key={bench.path} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-slate-900 dark:text-white font-mono flex items-center gap-2">
                        {bench.name}
                        {bench.is_running && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                      </span>
                      <span className="text-slate-500 font-mono">{siteCount} Sites ({pct}%)</span>
                    </div>
                    <div className="w-full h-3.5 bg-slate-100 dark:bg-charcoal rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-coral to-amber-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(pct, siteCount > 0 ? 5 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bento-card space-y-4">
            <h3 className="text-lg font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" />
              MariaDB & Python Runtime Health
            </h3>
            <div className="space-y-3 pt-2 text-sm font-mono text-slate-600 dark:text-slate-400">
              <div className="flex justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-charcoal border border-slate-900/5 dark:border-white/5">
                <span>Database Engine:</span>
                <strong className="text-slate-900 dark:text-white">MariaDB 10.11 Server</strong>
              </div>
              <div className="flex justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-charcoal border border-slate-900/5 dark:border-white/5">
                <span>Default Port:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">3306 (TCP)</strong>
              </div>
              <div className="flex justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-charcoal border border-slate-900/5 dark:border-white/5">
                <span>WSL Storage Disk:</span>
                <strong className="text-slate-900 dark:text-white">{formatBytes(systemStats.disk?.used)} / {formatBytes(systemStats.disk?.total)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
