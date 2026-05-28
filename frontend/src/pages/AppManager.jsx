import React, { useEffect, useState } from "react";
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
  Info
} from "lucide-react";

export default function AppManager({ benches, onRunTask }) {
  const [selectedBenchPath, setSelectedBenchPath] = useState("");
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGetModal, setShowGetModal] = useState(false);

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

  // Sync bench selection
  useEffect(() => {
    if (benches.length > 0 && !selectedBenchPath) {
      setSelectedBenchPath(benches[0].path);
    }
  }, [benches]);

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

  const handleInstallMarketplaceApp = (appName) => {
    onRunTask(
      fetch(`${API_HOST}/api/apps/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench_path: selectedBenchPath,
          app_name_or_url: appName,
          branch: "version-15" // standard version
        })
      })
    );
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
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Selector and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedBenchPath}
              onChange={(e) => setSelectedBenchPath(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-slate-900 border border-darkBorder text-xs font-semibold text-white rounded-xl focus:outline-none focus:border-darkAccent cursor-pointer"
            >
              {benches.map((b) => (
                <option key={b.path} value={b.path}>
                  Bench: {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-darkTextMuted absolute right-3 top-3 pointer-events-none" />
          </div>
          
          <button
            onClick={fetchApps}
            className="p-2 rounded-xl hover:bg-slate-800 text-darkTextMuted hover:text-white transition-colors"
            title="Refresh App list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {selectedBenchPath && (
          <button
            onClick={() => setShowGetModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-darkAccent text-white text-xs font-bold rounded-lg hover:bg-darkAccent/90 transition-colors shadow-lg shadow-darkAccent/20"
          >
            <Plus className="w-4 h-4" />
            Clone Custom App
          </button>
        )}
      </div>

      {/* Grid: Left - Installed Apps, Right - Marketplace */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Installed Apps column */}
        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <AppWindow className="w-4 h-4 text-darkAccent" />
            Installed Apps ({apps.length})
          </h3>
          
          {selectedBenchPath ? (
            <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-darkBorder/30">
              {loading ? (
                <div className="text-center py-12 text-darkTextMuted text-xs">
                  Loading installed apps...
                </div>
              ) : apps.length > 0 ? (
                apps.map((app) => (
                  <div key={app.name} className="p-5 flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {app.name}
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800/80 border border-darkBorder/40 rounded text-slate-350">
                          v{app.version}
                        </span>
                      </h4>
                      <p className="text-xs text-darkTextMuted font-mono mt-1">{app.path}</p>
                      
                      <div className="flex items-center gap-1.5 text-xs text-darkTextMuted mt-2.5">
                        <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                        Active Branch: <strong className="text-slate-200">{app.branch}</strong>
                      </div>
                    </div>

                    {app.name !== "frappe" && (
                      <button
                        onClick={() => handleRemoveApp(app.name)}
                        className="p-2 rounded-lg hover:bg-danger/10 text-darkTextMuted hover:text-danger transition-colors"
                        title="Uninstall App"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-darkTextMuted text-xs">
                  No apps found. The directory structure is missing Frappe core.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-darkBorder/40 rounded-2xl bg-slate-900/10">
              <p className="text-xs text-darkTextMuted">Select or scan a bench to view installed apps.</p>
            </div>
          )}
        </div>

        {/* Marketplace/Popular official apps column */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <Download className="w-4 h-4 text-success" />
            App Marketplace
          </h3>
          
          <div className="space-y-4">
            {marketplaceApps.map((app) => {
              const isInstalled = apps.some((a) => a.name === app.name);
              return (
                <div key={app.name} className="glass-card p-4 rounded-xl border border-darkBorder flex flex-col justify-between h-36">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        {app.label}
                        <a href={app.url} target="_blank" rel="noreferrer" className="text-darkTextMuted hover:text-white">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </h4>
                      {isInstalled && (
                        <span className="text-[9px] bg-success/15 text-success font-semibold px-2 py-0.5 rounded-full">
                          Installed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-darkTextMuted mt-1.5 leading-normal line-clamp-2">
                      {app.desc}
                    </p>
                  </div>
                  
                  {!isInstalled && selectedBenchPath && (
                    <button
                      onClick={() => handleInstallMarketplaceApp(app.name)}
                      className="w-full mt-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-darkBorder hover:border-darkAccent text-[11px] font-semibold text-slate-200 hover:text-white transition-all rounded-lg"
                    >
                      Get {app.label} App
                    </button>
                  )}
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

    </div>
  );
}
