import React, { useState } from "react";
import { API_HOST } from "../config";
import { 
  Server, 
  Play, 
  Square, 
  Trash2, 
  RefreshCw, 
  Plus, 
  Code,
  FolderOpen,
  X,
  AlertTriangle,
  Info,
  Database,
  Eraser,
  Wrench,
  Hammer,
  CheckSquare,
  Square as CheckboxIcon,
  Layers,
  Sparkles,
  Stethoscope,
  ExternalLink,
  Globe,
  AppWindow,
  ChevronDown,
  ChevronRight
} from "lucide-react";

function resolveSiteApps(bench, site) {
  const installed = site?.installed_apps || [];
  if (installed.length > 0) {
    return installed.map((app) => ({
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

export default function BenchManager({ benches, onRunTask, refreshBenches }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // name of bench to delete
  const [newBenchName, setNewBenchName] = useState("");
  const [newBenchVersion, setNewBenchVersion] = useState("version-15");
  const [customPython, setCustomPython] = useState("");
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active, stopped

  // Multi-bench Selection State
  const [selectedBenches, setSelectedBenches] = useState([]);
  const [sitesOpen, setSitesOpen] = useState({}); // benchPath -> bool
  const [siteDetailOpen, setSiteDetailOpen] = useState({}); // benchPath::siteName -> bool

  const activeBenchesCount = benches.filter(b => b.is_running).length;
  const stoppedBenchesCount = benches.filter(b => !b.is_running).length;
  const totalSites = benches.reduce((acc, b) => acc + (b.sites?.length || 0), 0);

  const filteredBenches = benches
    .filter((bench) => {
      const matchesSearch = bench.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            bench.path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" ? true : 
                            statusFilter === "active" ? bench.is_running : 
                            !bench.is_running;
      return matchesSearch && matchesStatus;
    })
    .slice()
    .sort((a, b) => {
      // Active benches always first
      if (a.is_running !== b.is_running) return a.is_running ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const toggleSelectBench = (benchPath) => {
    setSelectedBenches((prev) => 
      prev.includes(benchPath)
        ? prev.filter((p) => p !== benchPath)
        : [...prev, benchPath]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBenches.length === benches.length) {
      setSelectedBenches([]);
    } else {
      setSelectedBenches(benches.map((b) => b.path));
    }
  };

  const handleBatchAction = (action) => {
    if (selectedBenches.length === 0) return;

    onRunTask(
      fetch(`${API_HOST}/api/benches/batch-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench_paths: selectedBenches,
          action: action
        })
      })
    );
  };

  const handleCreateBench = (e) => {
    e.preventDefault();
    if (!newBenchName.trim()) return;

    const payload = {
      name: newBenchName.trim(),
      version: newBenchVersion,
    };
    if (customPython.trim()) {
      payload.python = customPython.trim();
    }

    onRunTask(
      fetch(`${API_HOST}/api/benches/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    );

    setNewBenchName("");
    setNewBenchVersion("version-15");
    setCustomPython("");
    setShowCreateModal(false);
  };

  const handleDeleteBench = (name) => {
    onRunTask(
      fetch(`${API_HOST}/api/benches/${name}`, {
        method: "DELETE"
      })
    );
    setShowDeleteConfirm(null);
  };

  const handleSingleBenchAction = (benchPath, action) => {
    const endpointMap = {
      "start": "/api/processes/start",
      "stop": "/api/processes/stop",
      "clear-cache": "/api/benches/clear-cache",
      "migrate": "/api/benches/migrate",
      "build": "/api/benches/build",
      "update": "/api/benches/update",
      "restart": "/api/benches/restart",
      "doctor": "/api/benches/doctor"
    };

    const endpoint = endpointMap[action];
    if (!endpoint) return;

    onRunTask(
      fetch(`${API_HOST}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bench_path: benchPath })
      })
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      
      {/* TOP: Compact KPI row */}
      <div>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-900/10 dark:border-white/10">
          <h3 className="text-base font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-coral" />
            Bench Fleet Metrics
          </h3>
          <span className="text-xs font-mono font-bold bg-coral/10 text-coral px-2.5 py-1 rounded-full">
            {benches.length} Total
          </span>
        </div>

        <div className="kpi-row kpi-row-3">
          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Total Benches</p>
              <h3 className="kpi-value">{benches.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
          </div>

          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Active Benches</p>
              <h3 className="kpi-value text-emerald-600 dark:text-emerald-400">{activeBenchesCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Play className="w-6 h-6" />
            </div>
          </div>

          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Provisioned Sites</p>
              <h3 className="kpi-value">{totalSites}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Full-width bench management */}
      <div className="space-y-4">

      {/* Header Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white dark:bg-[#161722] p-3 sm:p-4 rounded-2xl border border-slate-900/10 dark:border-white/10 shadow-sm">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search bench name or path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-4 py-2 bg-slate-100 dark:bg-charcoal text-xs font-semibold text-slate-900 dark:text-white rounded-full border border-slate-900/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-charcoal p-1 rounded-full border border-slate-900/5 dark:border-white/10">
            {["all", "active", "stopped"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all ${
                  statusFilter === st 
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-sm" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                {st} ({st === "all" ? benches.length : st === "active" ? activeBenchesCount : stoppedBenchesCount})
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {benches.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-charcoal text-slate-800 dark:text-slate-200 text-xs font-bold rounded-full border border-slate-900/10 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
            >
              {selectedBenches.length === benches.length ? (
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <CheckboxIcon className="w-4 h-4 text-slate-400" />
              )}
              {selectedBenches.length === benches.length ? "Deselect All" : "Select All"}
            </button>
          )}

          <button
            onClick={refreshBenches}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-charcoal border border-slate-900/10 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all"
            title="Refresh benches"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="pill-btn-coral text-xs"
          >
            <Plus className="w-4 h-4" />
            Initialize Bench
          </button>
        </div>
      </div>

      {/* Multi-bench Batch Action Bar */}
      {selectedBenches.length > 0 && (
        <div className="bento-card bg-blue-500/10 border-blue-500/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {selectedBenches.length} {selectedBenches.length === 1 ? "Bench" : "Benches"} Selected:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBatchAction("start")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-full transition-all shadow-sm hover:bg-emerald-700"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Selected
            </button>

            <button
              onClick={() => handleBatchAction("stop")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-full transition-all shadow-sm hover:bg-rose-700"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Selected
            </button>

            <button
              onClick={() => handleBatchAction("migrate")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-full transition-all shadow-sm hover:bg-indigo-700"
            >
              <Database className="w-3.5 h-3.5" />
              Migrate Selected
            </button>

            <button
              onClick={() => handleBatchAction("clear-cache")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 text-white text-xs font-bold rounded-full transition-all shadow-sm hover:bg-cyan-700"
            >
              <Eraser className="w-3.5 h-3.5" />
              Clear Cache
            </button>

            <button
              onClick={() => handleBatchAction("build")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-full transition-all shadow-sm hover:bg-amber-700"
            >
              <Hammer className="w-3.5 h-3.5" />
              Build Selected
            </button>

            <button
              onClick={() => setSelectedBenches([])}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-darkTextMuted dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors ml-2"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Benches List (full-width stacked, dense) */}
      {filteredBenches.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filteredBenches.map((bench) => {
            const isSelected = selectedBenches.includes(bench.path);
            const sitesExpanded = !!sitesOpen[bench.path];
            const siteCount = bench.sites?.length || 0;
            const appCount = bench.apps?.length || 0;
            return (
              <div
                key={bench.path}
                className={`bento-card-dense w-full space-y-3 ${
                  isSelected ? "border-coral ring-2 ring-coral/20 bg-coral/5" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleSelectBench(bench.path)}
                    className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    title={isSelected ? "Deselect bench" : "Select bench for batch action"}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-darkAccent" />
                    ) : (
                      <CheckboxIcon className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                    )}
                  </button>

                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
                    bench.is_running
                      ? "bg-emerald-50 dark:bg-success/10 border-emerald-200 dark:border-success/20 text-emerald-600 dark:text-success"
                      : "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-darkBorder/40 text-slate-500"
                  }`}>
                    <Server className="w-4.5 h-4.5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">{bench.name}</h3>
                      {bench.is_running ? (
                        <span className="text-[10px] bg-emerald-50 dark:bg-success/15 text-emerald-700 dark:text-success font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-success/20">Running</span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-darkBorder/40 text-slate-600 font-bold px-2 py-0.5 rounded-full">Stopped</span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 truncate max-w-[220px] sm:max-w-xs" title={bench.path}>{bench.path}</p>
                  </div>

                  {/* Features + primary actions share header row (fills whitespace) */}
                  <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                    <button onClick={() => handleSingleBenchAction(bench.path, "clear-cache")} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-cyan-700 dark:text-cyan-400 text-xs font-semibold rounded-lg hover:bg-white dark:hover:bg-slate-800" title="Clear Cache">
                      <Eraser className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Clear Cache</span>
                    </button>
                    <button onClick={() => handleSingleBenchAction(bench.path, "migrate")} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-indigo-700 dark:text-indigo-400 text-xs font-semibold rounded-lg hover:bg-white dark:hover:bg-slate-800" title="Migrate">
                      <Database className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Migrate</span>
                    </button>
                    <button onClick={() => handleSingleBenchAction(bench.path, "build")} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-lg hover:bg-white dark:hover:bg-slate-800" title="Build">
                      <Hammer className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Build</span>
                    </button>
                    <button onClick={() => handleSingleBenchAction(bench.path, "update")} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-white dark:hover:bg-slate-800" title="Update">
                      <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Update</span>
                    </button>
                    <button onClick={() => handleSingleBenchAction(bench.path, "doctor")} className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-slate-500 rounded-lg hover:text-emerald-600" title="Bench Doctor">
                      <Stethoscope className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(bench.name)} className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-slate-400 hover:text-rose-600 rounded-lg" title="Delete Bench">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-0.5 hidden sm:block" />
                    {bench.is_running ? (
                      <button
                        onClick={() => handleSingleBenchAction(bench.path, "stop")}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-danger/10 border border-rose-200 dark:border-danger/20 text-rose-700 dark:text-danger text-xs font-bold"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSingleBenchAction(bench.path, "start")}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-success/10 border border-emerald-200 dark:border-success/20 text-emerald-700 dark:text-success text-xs font-bold"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Start
                      </button>
                    )}
                    <button
                      onClick={() => {
                        fetch(`${API_HOST}/api/benches/open-ide`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ bench_path: bench.path })
                        }).catch((err) => console.error("Error opening IDE:", err));
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-darkBorder/40 text-slate-600 dark:text-darkTextMuted"
                      title="Open in Antigravity IDE"
                    >
                      <Code className="w-4 h-4 text-darkAccent" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-lg bg-slate-50 dark:bg-charcoal/60 border border-slate-200/80 dark:border-white/5 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Python</p>
                    <p className="text-sm font-extrabold font-mono mt-0.5 text-slate-900 dark:text-white">{bench.python_version || "Unknown"}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-charcoal/60 border border-slate-200/80 dark:border-white/5 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Node.js</p>
                    <p className="text-sm font-extrabold font-mono mt-0.5 text-slate-900 dark:text-white">{bench.node_version || "Unknown"}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-charcoal/60 border border-slate-200/80 dark:border-white/5 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Frappe Core</p>
                    <p className="text-sm font-extrabold font-mono mt-0.5 text-emerald-600 dark:text-success">v{bench.frappe_version || "Unknown"}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-charcoal/60 border border-slate-200/80 dark:border-white/5 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bench Apps</p>
                    <p className="text-sm font-extrabold font-mono mt-0.5 text-slate-900 dark:text-white">{appCount}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-darkBorder/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSitesOpen((prev) => ({ ...prev, [bench.path]: !prev[bench.path] }))}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-50 dark:bg-charcoal/50 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {sitesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <Globe className="w-3.5 h-3.5 text-emerald-500" />
                      Sites & Installed Apps
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">({siteCount})</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-500">{sitesExpanded ? "Hide" : "Show"}</span>
                  </button>

                  {sitesExpanded && (
                    <div className="divide-y divide-slate-200 dark:divide-white/5 bg-white dark:bg-[#161722]">
                      {siteCount === 0 ? (
                        <p className="px-3 py-4 text-sm text-slate-400 italic">No sites provisioned yet.</p>
                      ) : (
                        (bench.sites || []).map((site) => {
                          const siteKey = `${bench.path}::${site.name}`;
                          const detailOpen = !!siteDetailOpen[siteKey];
                          const apps = resolveSiteApps(bench, site);
                          return (
                            <div key={site.name}>
                              <button
                                type="button"
                                onClick={() => setSiteDetailOpen((prev) => ({ ...prev, [siteKey]: !prev[siteKey] }))}
                                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 text-left"
                              >
                                {detailOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${bench.is_running ? "bg-emerald-500" : "bg-slate-400"}`} />
                                <span className="text-sm font-bold font-mono text-slate-900 dark:text-white truncate">{site.name}</span>
                                {site.port ? <span className="text-xs font-mono text-slate-500">:{site.port}</span> : null}
                                {bench.is_running && site.port ? (
                                  <a
                                    href={`http://localhost:${site.port}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                ) : null}
                                <span className="ml-auto text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                  {apps.length} {apps.length === 1 ? "app" : "apps"}
                                </span>
                              </button>

                              {detailOpen && (
                                <div className="px-3 pb-3 pl-9 flex flex-wrap gap-1.5">
                                  {apps.length > 0 ? apps.map((app) => (
                                    <span
                                      key={`${siteKey}::${app.name}`}
                                      className="inline-flex items-center gap-1 text-xs font-mono font-semibold px-2 py-1 rounded-md bg-slate-50 dark:bg-charcoal border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
                                      title={app.inferred ? "From bench apps list" : "Installed on site"}
                                    >
                                      <AppWindow className="w-3 h-3 text-indigo-500" />
                                      {app.name}
                                      <span className="text-slate-400">v{app.version}</span>
                                      {app.inferred && <span className="text-[9px] uppercase font-bold text-amber-600">bench</span>}
                                    </span>
                                  )) : (
                                    <p className="text-xs text-slate-400 italic">No apps detected for this site.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-14 border-2 border-dashed border-darkBorder/30 rounded-2xl bg-slate-900/10">
          <Server className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-white">No Frappe Benches Discovered</h3>
          <p className="text-xs text-darkTextMuted mt-1 max-w-sm mx-auto">
            We couldn't scan any benches under `/home/frappe` in WSL. Initialize a new bench to get started.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-darkAccent text-white text-xs font-bold rounded-xl hover:bg-darkAccent/90 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Initialize First Bench
          </button>
        </div>
      )}

      {/* Initialize Bench Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-darkBorder rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Server className="w-5 h-5 text-darkAccent" />
                Initialize New Bench
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-darkTextMuted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBench} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Bench Directory Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. dev-bench"
                  value={newBenchName}
                  onChange={(e) => setNewBenchName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                />
                <p className="text-[10px] text-darkTextMuted mt-1">This folder will be created inside `/home/frappe/`</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Frappe Branch / Version</label>
                <select
                  value={newBenchVersion}
                  onChange={(e) => setNewBenchVersion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                >
                  <option value="version-16">Version 16</option>
                  <option value="version-15">Version 15 (Recommended / Stable)</option>
                  <option value="version-14">Version 14</option>
                  <option value="develop">Develop (Unstable)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Custom Python Binary Path (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. /usr/bin/python3"
                  value={customPython}
                  onChange={(e) => setCustomPython(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2.5 mt-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-300 leading-normal">
                  Bench initialization involves cloning the framework and creating a virtual env. This takes a few minutes. Progress will open in the console drawer.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-darkBorder/40">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-darkAccent hover:bg-darkAccent/90 text-white font-bold rounded-xl transition-colors shadow-lg shadow-darkAccent/20"
                >
                  Start Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-darkBorder rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5 mb-4 text-xs">
              <div className="w-10 h-10 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger shrink-0">
                <AlertTriangle className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Delete Bench Directory?</h3>
                <p className="text-darkTextMuted mt-1 leading-normal">
                  Are you absolutely sure you want to delete the bench <strong className="text-white">"{showDeleteConfirm}"</strong>? This will permanently erase the directory, including all virtual environments and apps!
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-darkBorder/40 text-xs">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBench(showDeleteConfirm)}
                className="px-3.5 py-2 bg-danger hover:bg-danger/80 text-white font-bold rounded-xl transition-colors shadow-lg shadow-danger/20"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      </div> {/* End full-width content */}
    </div>
  );
}
