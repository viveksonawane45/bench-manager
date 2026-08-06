import React, { useEffect, useMemo, useState } from "react";
import { Server, Globe, AppWindow, BarChart3, PieChart } from "lucide-react";
import PillSelect from "./PillSelect";

function InsightBar({ label, value, max, color = "from-coral to-amber-500", meta }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
        <span className="text-slate-900 dark:text-white font-mono truncate">{label}</span>
        <span className="text-slate-500 font-mono shrink-0">{meta || value}</span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 dark:bg-charcoal rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Impact-focused hierarchy insights (replaces dense org-card trees).
 * mode "bench" | "app"
 */
export default function HierarchyOrgChart({
  mode = "bench",
  benches = [],
  appInventory = [],
}) {
  const sortedBenches = useMemo(
    () => [...benches].sort((a, b) => (a.is_running === b.is_running ? a.name.localeCompare(b.name) : a.is_running ? -1 : 1)),
    [benches]
  );

  const [selectedBenchPath, setSelectedBenchPath] = useState("");
  const [selectedAppName, setSelectedAppName] = useState("");

  useEffect(() => {
    if (sortedBenches.length > 0 && !selectedBenchPath) {
      setSelectedBenchPath(sortedBenches[0].path);
    }
  }, [sortedBenches, selectedBenchPath]);

  useEffect(() => {
    if (appInventory.length > 0 && !selectedAppName) {
      setSelectedAppName(appInventory[0].name);
    }
  }, [appInventory, selectedAppName]);

  const selectedBench = sortedBenches.find((b) => b.path === selectedBenchPath) || sortedBenches[0];
  const selectedApp = appInventory.find((a) => a.name === selectedAppName) || appInventory[0];

  const siteRows = useMemo(() => {
    if (!selectedBench) return [];
    return (selectedBench.sites || []).map((site) => {
      const apps = site.installed_apps?.length
        ? site.installed_apps
        : (selectedBench.apps || []);
      return {
        name: site.name,
        port: site.port,
        appCount: apps.length,
        apps: apps.map((a) => (typeof a === "string" ? a : a.name)).filter(Boolean),
      };
    }).sort((a, b) => b.appCount - a.appCount);
  }, [selectedBench]);

  const maxSiteApps = Math.max(1, ...siteRows.map((s) => s.appCount));

  const topAppsFleet = useMemo(() => {
    return appInventory.slice(0, 8);
  }, [appInventory]);

  const maxAppSites = Math.max(1, ...topAppsFleet.map((a) => a.siteCount || 0));

  const appBenchBreakdown = useMemo(() => {
    if (!selectedApp) return [];
    const map = {};
    (selectedApp.sites || []).forEach((row) => {
      if (!map[row.benchName]) {
        map[row.benchName] = {
          name: row.benchName,
          count: 0,
          frappe: row.frappeVersion,
          sites: [],
        };
      }
      map[row.benchName].count += 1;
      map[row.benchName].sites.push({
        name: row.siteName,
        port: row.sitePort,
        appVersion: row.appVersion,
        isRunning: row.isRunning,
      });
    });
    return Object.values(map)
      .map((row) => ({
        ...row,
        sites: row.sites.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => b.count - a.count);
  }, [selectedApp]);

  const appSiteList = useMemo(() => {
    if (!selectedApp) return [];
    return [...(selectedApp.sites || [])].sort((a, b) =>
      a.siteName.localeCompare(b.siteName)
    );
  }, [selectedApp]);

  const maxAppBench = Math.max(1, ...appBenchBreakdown.map((b) => b.count));

  const title = mode === "bench" ? "Bench Insights" : "App Insights";
  const subtitle =
    mode === "bench"
      ? "Sites density and installed-app load per bench"
      : "Where each app is installed across sites and benches";

  return (
    <div className="bento-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {mode === "bench" ? (
            <BarChart3 className="w-5 h-5 text-coral shrink-0 mt-0.5" />
          ) : (
            <PieChart className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="text-lg font-extrabold text-slate-950 dark:text-white tracking-tight">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>

        {mode === "bench" ? (
          <PillSelect
            className="w-full sm:w-56"
            prefix="Bench: "
            value={selectedBench?.path || ""}
            onChange={setSelectedBenchPath}
            options={sortedBenches.map((b) => ({ value: b.path, label: b.name }))}
          />
        ) : (
          <PillSelect
            className="w-full sm:w-56"
            prefix="App: "
            value={selectedApp?.name || ""}
            onChange={setSelectedAppName}
            options={appInventory.map((a) => ({ value: a.name, label: a.name }))}
          />
        )}
      </div>

      {mode === "bench" ? (
        !selectedBench ? (
          <p className="text-sm text-slate-400 text-center py-10">No benches discovered</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Snapshot */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-charcoal/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-coral" />
                <span className="font-extrabold text-slate-950 dark:text-white font-mono">{selectedBench.name}</span>
                {selectedBench.is_running ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Running</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">Stopped</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white dark:bg-[#161722] border border-slate-200/80 dark:border-white/5 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sites</p>
                  <p className="text-2xl font-extrabold font-mono text-slate-950 dark:text-white mt-1">{siteRows.length}</p>
                </div>
                <div className="rounded-xl bg-white dark:bg-[#161722] border border-slate-200/80 dark:border-white/5 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bench Apps</p>
                  <p className="text-2xl font-extrabold font-mono text-indigo-600 mt-1">{selectedBench.apps?.length || 0}</p>
                </div>
                <div className="rounded-xl bg-white dark:bg-[#161722] border border-slate-200/80 dark:border-white/5 p-3 col-span-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Frappe</p>
                  <p className="text-lg font-extrabold font-mono text-emerald-600 mt-1">v{selectedBench.frappe_version || "?"}</p>
                </div>
              </div>
            </div>

            {/* Sites by app count */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161722] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  Apps installed per site
                </h4>
                <span className="text-xs font-mono text-slate-500">{siteRows.length} sites</span>
              </div>
              {siteRows.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-6 text-center">No sites on this bench</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-auto pr-1">
                  {siteRows.map((site) => (
                    <div key={site.name}>
                      <InsightBar
                        label={site.port ? `${site.name} :${site.port}` : site.name}
                        value={site.appCount}
                        max={maxSiteApps}
                        meta={`${site.appCount} apps`}
                        color="from-emerald-500 to-teal-400"
                      />
                      {site.apps.length > 0 && (
                        <p className="text-[11px] text-slate-400 font-mono mt-1 truncate">
                          {site.apps.slice(0, 6).join(" · ")}
                          {site.apps.length > 6 ? ` · +${site.apps.length - 6}` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        !selectedApp ? (
          <p className="text-sm text-slate-400 text-center py-10">No apps discovered</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-charcoal/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AppWindow className="w-4 h-4 text-indigo-500" />
                <span className="font-extrabold text-slate-950 dark:text-white font-mono">{selectedApp.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white dark:bg-[#161722] border border-slate-200/80 dark:border-white/5 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-950 dark:text-slate-300 tracking-wider">Sites</p>
                  <p className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">{selectedApp.siteCount}</p>
                </div>
                <div className="rounded-xl bg-white dark:bg-[#161722] border border-slate-200/80 dark:border-white/5 p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-950 dark:text-slate-300 tracking-wider">Benches</p>
                  <p className="text-2xl font-extrabold font-mono text-coral mt-1">{selectedApp.benchCount}</p>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-950 dark:text-white font-mono">
                versions: {(selectedApp.versions || []).map((v) => `v${v}`).join(", ") || "—"}
              </p>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161722] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  Sites with this app
                </h4>
                <span className="text-xs font-mono font-bold text-slate-950 dark:text-white">
                  {appSiteList.length}
                </span>
              </div>

              {appSiteList.length === 0 ? (
                <p className="text-sm font-semibold text-slate-950 dark:text-white italic py-6 text-center">
                  No site installs found
                </p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-auto pr-1">
                  {appBenchBreakdown.map((benchRow) => (
                    <div key={benchRow.name} className="space-y-2">
                      <InsightBar
                        label={benchRow.name}
                        value={benchRow.count}
                        max={maxAppBench}
                        meta={`${benchRow.count} sites · Frappe v${benchRow.frappe || "?"}`}
                        color="from-coral to-amber-500"
                      />
                      <div className="pl-1 flex flex-wrap gap-1.5">
                        {benchRow.sites.map((site) => (
                          <span
                            key={`${benchRow.name}-${site.name}`}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono px-2 py-1 rounded-full bg-emerald-50 dark:bg-success/10 text-slate-950 dark:text-white border border-emerald-200 dark:border-success/20"
                            title={site.port ? `Port ${site.port}` : undefined}
                          >
                            <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                            {site.name}
                            {site.port ? (
                              <span className="opacity-70">:{site.port}</span>
                            ) : null}
                            {site.appVersion ? (
                              <span className="opacity-70">v{site.appVersion}</span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161722] p-4 space-y-3">
              <h4 className="text-sm font-extrabold text-slate-950 dark:text-white">Fleet top apps</h4>
              <div className="space-y-3 max-h-72 overflow-auto">
                {topAppsFleet.map((app) => (
                  <InsightBar
                    key={app.name}
                    label={app.name}
                    value={app.siteCount}
                    max={maxAppSites}
                    meta={`${app.siteCount} sites`}
                    color="from-indigo-500 to-violet-400"
                  />
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
