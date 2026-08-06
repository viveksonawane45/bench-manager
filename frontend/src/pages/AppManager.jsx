import React, { useEffect, useMemo, useState } from "react";
import { API_HOST } from "../config";
import { 
  AppWindow, 
  Plus, 
  Trash2, 
  Download, 
  RefreshCw, 
  X, 
  GitBranch, 
  ExternalLink,
  ChevronDown,
  Info,
  Layers
} from "lucide-react";
import PillSelect from "../components/PillSelect";

export default function AppManager({ benches, onRunTask }) {
  const [selectedBenchPath, setSelectedBenchPath] = useState("");
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGetModal, setShowGetModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(null); // app object
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedVersions, setSelectedVersions] = useState({}); // appName -> branch string

  // Form Fields
  const [appUrlOrName, setAppUrlOrName] = useState("");
  const [appBranch, setAppBranch] = useState("");

  const marketplaceApps = [
    { name: "erpnext", label: "ERPNext", desc: "Open-source ERP for retail, manufacturing, services, and distribution.", url: "https://github.com/frappe/erpnext" },
    { name: "hrms", label: "HRMS", desc: "Human resource management, leaves, payroll, and attendance system.", url: "https://github.com/frappe/hrms" },
    { name: "payments", label: "Payments", desc: "Integration gateway for Stripe, PayPal, Razorpay, and more.", url: "https://github.com/frappe/payments" },
    { name: "wiki", label: "Frappe Wiki", desc: "Sleek, markdown-supported documentation portal for teams.", url: "https://github.com/frappe/wiki" },
    { name: "builder", label: "Frappe Builder", desc: "No-code drag and drop website builder app.", url: "https://github.com/frappe/builder" }
  ];

  const sortedBenches = useMemo(
    () => [...benches].sort((a, b) => (a.is_running === b.is_running ? a.name.localeCompare(b.name) : a.is_running ? -1 : 1)),
    [benches]
  );

  // Sync bench selection — prefer active bench first
  useEffect(() => {
    if (sortedBenches.length > 0 && !selectedBenchPath) {
      setSelectedBenchPath(sortedBenches[0].path);
    }
  }, [sortedBenches, selectedBenchPath]);

  useEffect(() => {
    if (!selectedBenchPath) return;
    fetchApps();
  }, [selectedBenchPath]);

  const fetchApps = () => {
    setLoading(true);
    fetch(`${API_HOST}/api/apps?bench_path=${encodeURIComponent(selectedBenchPath)}`)
      .then((res) => res.json())
      .then((data) => setApps(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching apps:", err))
      .finally(() => setLoading(false));
  };

  const handleGetApp = (e) => {
    if (e) e.preventDefault();
    if (!appUrlOrName.trim()) return;

    const payload = {
      bench_path: selectedBenchPath,
      app_name_or_url: appUrlOrName.trim()
    };
    if (appBranch.trim()) {
      payload.branch = appBranch.trim();
    }

    onRunTask(
      fetch(`${API_HOST}/api/apps/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    );

    setAppUrlOrName("");
    setAppBranch("");
    setShowGetModal(false);
  };

  const handleInstallMarketplaceApp = (appName, branch) => {
    onRunTask(
      fetch(`${API_HOST}/api/apps/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench_path: selectedBenchPath,
          app_name_or_url: appName,
          branch: branch
        })
      })
    );
  };

  const handleInstallAppToSite = (e) => {
    if (e) e.preventDefault();
    if (!showInstallModal || !selectedSite) return;

    onRunTask(
      fetch(`${API_HOST}/api/sites/install-app`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench_path: selectedBenchPath,
          site_name: selectedSite,
          app_name: showInstallModal.name
        })
      })
    );

    setShowInstallModal(null);
    setSelectedSite("");
  };

  const handleRemoveApp = (appName) => {
    onRunTask(
      fetch(`${API_HOST}/api/apps/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench_path: selectedBenchPath,
          app_name: appName
        })
      })
    );
  };

  const selectedBench = benches.find(b => b.path === selectedBenchPath);

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      
      {/* TOP: Compact KPI row */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-900/10 dark:border-white/10">
          <h3 className="text-sm font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <AppWindow className="w-4 h-4 text-coral" />
            App Telemetry
          </h3>
          <span className="text-[10px] font-mono font-bold bg-coral/10 text-coral px-2.5 py-0.5 rounded-full">
            {apps.length} Apps Installed
          </span>
        </div>

        <div className="kpi-row kpi-row-3">
          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Total Installed Apps</p>
              <h3 className="kpi-value">{apps.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <AppWindow className="w-6 h-6" />
            </div>
          </div>

          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Frappe Core</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                v{selectedBench?.frappe_version || "?"}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <GitBranch className="w-6 h-6" />
            </div>
          </div>

          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Marketplace Catalog</p>
              <h3 className="kpi-value">{marketplaceApps.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Full-width content */}
      <div className="space-y-6">

      {/* Bench Selector & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#161722] p-4 rounded-3xl border border-slate-900/10 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3">
          <PillSelect
            className="w-72"
            prefix="Bench: "
            value={selectedBenchPath}
            onChange={setSelectedBenchPath}
            options={sortedBenches.map((b) => ({ value: b.path, label: b.name }))}
          />
          
          <button
            onClick={fetchApps}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-charcoal border border-slate-900/10 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all"
            title="Refresh App list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {selectedBenchPath && (
          <button
            onClick={() => setShowGetModal(true)}
            className="pill-btn-coral text-xs"
          >
            <Plus className="w-4 h-4" />
            Clone Custom App
          </button>
        )}
      </div>

      {/* Installed apps — full-width dense list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <AppWindow className="w-5 h-5 text-coral" />
            Installed Applications
            <span className="font-mono text-sm">({apps.length})</span>
          </h3>
        </div>

        {selectedBenchPath ? (
          <div className="bento-card-dense !p-0 overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-xs font-bold text-slate-950 dark:text-white">
                Loading installed apps...
              </div>
            ) : apps.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {apps.map((app) => (
                  <div
                    key={app.name}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <AppWindow className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-slate-950 dark:text-white font-mono truncate">
                            {app.name}
                          </h4>
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-950 dark:text-white border border-slate-200 dark:border-white/10">
                            v{app.version}
                          </span>
                          {app.name === "frappe" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-success/15 text-emerald-700 dark:text-success border border-emerald-200 dark:border-success/20">
                              Core
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-950 dark:text-white">
                            <GitBranch className="w-3 h-3" />
                            {app.branch || "—"}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-slate-950 dark:text-white truncate max-w-[280px] sm:max-w-md" title={app.path}>
                            {app.path}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 sm:justify-end">
                      {app.name !== "frappe" && (
                        <button
                          onClick={() => {
                            setShowInstallModal(app);
                            if (selectedBench?.sites?.length > 0) {
                              setSelectedSite(selectedBench.sites[0].name);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors"
                          title="Install App on Site"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          Install to Site
                        </button>
                      )}
                      {app.name !== "frappe" && (
                        <button
                          onClick={() => handleRemoveApp(app.name)}
                          className="p-1.5 rounded-full border border-slate-900/10 dark:border-white/10 text-slate-950 dark:text-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-danger/10 transition-colors"
                          title="Uninstall App"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <p className="text-xs font-bold text-slate-950 dark:text-white">
                  No apps found. The directory structure is missing Frappe core.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-white/15 rounded-2xl">
            <p className="text-xs font-bold text-slate-950 dark:text-white">
              Select or scan a bench to view installed apps.
            </p>
          </div>
        )}
      </div>

      {/* Marketplace — full-width compact grid under installed list */}
      <div className="space-y-3">
        <h3 className="text-base font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-600" />
          App Marketplace
          <span className="font-mono text-sm">({marketplaceApps.length})</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {marketplaceApps.map((app) => {
            const isInstalled = apps.some((a) => a.name === app.name);
            const defaultBranch = selectedBench?.frappe_version?.startsWith("16") ? "version-16" : "version-15";
            const currentBranch = selectedVersions[app.name] || defaultBranch;
            return (
              <div
                key={app.name}
                className="bento-card-dense flex flex-col justify-between gap-3 min-h-[148px]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-1.5">
                      {app.label}
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-950 dark:text-white hover:text-coral"
                        title="Open repository"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </h4>
                    {isInstalled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-success/15 text-emerald-700 dark:text-success border border-emerald-200 dark:border-success/20 shrink-0">
                        Installed
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-950 dark:text-white mt-1.5 leading-snug line-clamp-3">
                    {app.desc}
                  </p>
                </div>

                {!isInstalled && selectedBenchPath ? (
                  <div className="space-y-2">
                    <PillSelect
                      className="w-full"
                      prefix="Branch: "
                      value={currentBranch}
                      onChange={(val) =>
                        setSelectedVersions({
                          ...selectedVersions,
                          [app.name]: val,
                        })
                      }
                      options={[
                        { value: "version-16", label: "v16" },
                        { value: "version-15", label: "v15" },
                        { value: "version-14", label: "v14" },
                        { value: "develop", label: "develop" },
                      ]}
                    />
                    <button
                      onClick={() => handleInstallMarketplaceApp(app.name, currentBranch)}
                      className="w-full py-1.5 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-[11px] font-bold hover:opacity-90 transition-opacity"
                    >
                      Get {app.label}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      </div>
      {/* Get Custom App Modal */}
      {showGetModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-darkBorder rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5 text-xs">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <AppWindow className="w-5 h-5 text-darkAccent" />
                Clone Custom App
              </h3>
              <button
                onClick={() => setShowGetModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-darkTextMuted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGetApp} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">App Name or GitHub Repository URL</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://github.com/frappe/payments"
                  value={appUrlOrName}
                  onChange={(e) => setAppUrlOrName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Git Branch (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. version-15"
                  value={appBranch}
                  onChange={(e) => setAppBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-300 leading-normal">
                  Downloading apps requires Git clone access. Bench CLI will clone the code into the bench `apps` folder and install Python dependencies.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-darkBorder/40">
                <button
                  type="button"
                  onClick={() => setShowGetModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-darkAccent hover:bg-darkAccent/90 text-white font-bold rounded-lg transition-colors shadow-lg shadow-darkAccent/20"
                >
                  Start Download
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Install App to Site Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-darkBorder rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5 text-xs">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Install App on Site
              </h3>
              <button
                onClick={() => {
                  setShowInstallModal(null);
                  setSelectedSite("");
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-darkTextMuted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <p className="text-slate-300 font-semibold mb-2">
                  App: <span className="text-white font-bold">{showInstallModal.name}</span>
                </p>
                <label className="block font-semibold text-slate-300 mb-1.5">Select Site</label>
                {selectedBench?.sites && selectedBench.sites.length > 0 ? (
                  <div className="relative">
                    <select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      className="w-full appearance-none pl-3.5 pr-10 py-2.5 rounded-lg border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none cursor-pointer"
                    >
                      {selectedBench.sites.map((site) => (
                        <option key={site.name} value={site.name}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-darkTextMuted absolute right-3 top-3.5 pointer-events-none" />
                  </div>
                ) : (
                  <p className="text-danger font-medium">No sites created in this bench. Create a site first.</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-darkBorder/40">
                <button
                  type="button"
                  onClick={() => {
                    setShowInstallModal(null);
                    setSelectedSite("");
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInstallAppToSite}
                  disabled={!selectedSite}
                  className="px-4 py-2 bg-darkAccent hover:bg-darkAccent/90 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-darkAccent/20"
                >
                  Install App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
