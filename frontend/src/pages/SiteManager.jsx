import React, { useEffect, useMemo, useState } from "react";
import { API_HOST, BENCH_DEFAULT_PORT } from "../config";
import { 
  Globe, 
  Plus, 
  Trash2, 
  Database, 
  Download, 
  Upload, 
  ShieldAlert, 
  X, 
  Layers,
  Search,
  ExternalLink,
} from "lucide-react";
import PillSelect from "../components/PillSelect";

export default function SiteManager({ benches, onRunTask }) {
  const [selectedBenchPath, setSelectedBenchPath] = useState("");
  const [sites, setSites] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(null);
  const [showBackupsModal, setShowBackupsModal] = useState(null);
  const [showDropConfirm, setShowDropConfirm] = useState(null);

  // Form Fields
  const [newSiteName, setNewSiteName] = useState("");
  const [adminPassword, setAdminPassword] = useState("admin");
  const [dbRootPassword, setDbRootPassword] = useState("");
  const [selectedApp, setSelectedApp] = useState("");
  const [backups, setBackups] = useState([]);

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

  // Fetch sites and apps when selected bench changes
  useEffect(() => {
    if (!selectedBenchPath) return;
    fetchSitesAndApps();
  }, [selectedBenchPath]);

  const fetchSitesAndApps = () => {
    setLoading(true);
    // Fetch Sites
    const sitesPromise = fetch(`${API_HOST}/api/sites?bench_path=${encodeURIComponent(selectedBenchPath)}`)
      .then((res) => res.json())
      .then((data) => setSites(Array.isArray(data) ? data : []));

    // Fetch Apps
    const appsPromise = fetch(`${API_HOST}/api/apps?bench_path=${encodeURIComponent(selectedBenchPath)}`)
      .then((res) => res.json())
      .then((data) => setApps(Array.isArray(data) ? data : []));

    Promise.all([sitesPromise, appsPromise])
      .catch((err) => console.error("Error fetching bench data:", err))
      .finally(() => setLoading(false));
  };

  const handleCreateSite = (e) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    onRunTask(
      fetch(`${API_HOST}/api/sites/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench_path: selectedBenchPath,
          site_name: newSiteName.trim(),
          admin_password: adminPassword,
          mariadb_root_password: dbRootPassword
        })
      })
    );

    setNewSiteName("");
    setAdminPassword("admin");
    setDbRootPassword("");
    setShowCreateModal(false);
  };

  const handleDropSite = (siteName) => {
    onRunTask(
      fetch(`${API_HOST}/api/sites/drop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench_path: selectedBenchPath,
          site_name: siteName
        })
      })
    );
    setShowDropConfirm(null);
  };

  const handleInstallApp = (siteName) => {
    if (!selectedApp) return;

    onRunTask(
      fetch(`${API_HOST}/api/sites/install-app`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench_path: selectedBenchPath,
          site_name: siteName,
          app_name: selectedApp
        })
      })
    );
    setShowInstallModal(null);
    setSelectedApp("");
  };

  const handleBackupSite = (siteName) => {
    onRunTask(
      fetch(`${API_HOST}/api/sites/backup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench_path: selectedBenchPath,
          site_name: siteName
        })
      })
    );
  };

  const openBackups = (siteName) => {
    setShowBackupsModal(siteName);
    fetch(`${API_HOST}/api/sites/backups?bench_path=${encodeURIComponent(selectedBenchPath)}&site_name=${encodeURIComponent(siteName)}`)
      .then((res) => res.json())
      .then((data) => setBackups(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching backups:", err));
  };

  const handleRestoreBackup = (siteName, filename) => {
    onRunTask(
      fetch(`${API_HOST}/api/sites/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bench_path: selectedBenchPath,
          site_name: siteName,
          backup_file: filename
        })
      })
    );
    setShowBackupsModal(null);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const selectedBench = benches.find(b => b.path === selectedBenchPath);
  const filteredSites = sites.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      
      {/* TOP: Compact KPI row */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-900/10 dark:border-white/10">
          <h3 className="text-sm font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Globe className="w-4 h-4 text-coral" />
            Site Telemetry
          </h3>
          <span className="text-[10px] font-mono font-bold bg-coral/10 text-coral px-2.5 py-0.5 rounded-full">
            {sites.length} Sites
          </span>
        </div>

        <div className="kpi-row kpi-row-3">
          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Total Sites in Bench</p>
              <h3 className="kpi-value">{sites.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
          </div>

          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Bench Status</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white mt-2">
                {selectedBench?.is_running ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                  </span>
                ) : (
                  <span className="text-slate-400">Stopped</span>
                )}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="kpi-card items-center justify-between">
            <div>
              <p className="kpi-label">Database Engine</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white mt-2 font-mono">MariaDB :3306</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Full-width content */}
      <div className="space-y-6">

      {/* Bench Selector & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-[#161722] p-4 rounded-3xl border border-slate-900/10 dark:border-white/10 shadow-sm">
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
          <PillSelect
            className="w-full sm:w-72"
            prefix="Bench: "
            value={selectedBenchPath}
            onChange={setSelectedBenchPath}
            options={sortedBenches.map((b) => ({ value: b.path, label: b.name }))}
          />

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search domain name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-4 py-2 bg-slate-100 dark:bg-charcoal text-xs font-semibold text-slate-900 dark:text-white rounded-full border border-slate-900/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
        </div>

        {selectedBenchPath && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="pill-btn-coral text-xs"
          >
            <Plus className="w-4 h-4" />
            Provision Site
          </button>
        )}
      </div>

      {/* Dense site list (stacked rows — no sparse table columns) */}
      {selectedBenchPath ? (
        <div className="bento-card-dense !p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-xs font-bold text-slate-950 dark:text-white">
              Loading sites in {selectedBench?.name || "bench"}...
            </div>
          ) : filteredSites.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-charcoal/80 flex items-center justify-between gap-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-950 dark:text-white">
                  Sites <span className="font-mono">({filteredSites.length})</span>
                </p>
                <p className="text-[11px] font-bold text-slate-950 dark:text-white font-mono">
                  MariaDB :3306
                </p>
              </div>

              {filteredSites.map((site) => {
                const accessUrl = site.port ? `http://localhost:${site.port}` : null;
                return (
                <div
                  key={site.name}
                  className="px-3 py-2.5 grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] items-center gap-2 md:gap-3 hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-success/10 border border-emerald-200 dark:border-success/20 text-emerald-600 dark:text-success flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-extrabold text-slate-950 dark:text-white font-mono truncate">
                          {site.name}
                        </h4>
                        {selectedBench?.is_running ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-success/15 text-emerald-700 dark:text-success border border-emerald-200 dark:border-success/20">
                            Live
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-950 dark:text-white border border-slate-200 dark:border-white/10">
                            Stopped
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 md:px-1">
                    {selectedBench?.is_running && accessUrl ? (
                      <a
                        href={accessUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 max-w-full text-[12px] font-bold font-mono text-blue-600 dark:text-blue-400 hover:underline"
                        title={accessUrl}
                      >
                        <span className="truncate">{accessUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <p className="text-[11px] font-semibold text-slate-950 dark:text-white truncate">
                        {site.port ? `http://localhost:${site.port} · start bench to open` : "No access URL"}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-wrap md:justify-end shrink-0">
                    <button
                      onClick={() => setShowInstallModal(site.name)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-[#161722] border border-slate-900/15 dark:border-white/15 text-[11px] font-bold text-slate-950 dark:text-white hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                      title="Install App"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      Install
                    </button>
                    <button
                      onClick={() => handleBackupSite(site.name)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-[#161722] border border-slate-900/15 dark:border-white/15 text-[11px] font-bold text-slate-950 dark:text-white hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                      title="Backup database"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-500" />
                      Backup
                    </button>
                    <button
                      onClick={() => openBackups(site.name)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-[#161722] border border-slate-900/15 dark:border-white/15 text-[11px] font-bold text-slate-950 dark:text-white hover:border-amber-400 hover:text-amber-600 transition-colors"
                      title="View Backups"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-500" />
                      Backups
                    </button>
                    <button
                      onClick={() => setShowDropConfirm(site.name)}
                      className="p-1 rounded-full border border-slate-900/10 dark:border-white/10 text-slate-950 dark:text-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-danger/10 transition-colors"
                      title="Drop Site"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-14 px-4">
              <Globe className="w-10 h-10 text-slate-950 dark:text-white mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-extrabold text-slate-950 dark:text-white">No Sites Created</h3>
              <p className="text-xs font-semibold text-slate-950 dark:text-white mt-1 max-w-xs mx-auto opacity-80">
                There are no sites provisioned in this bench. Create a site to begin hosting Frappe portals.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-14 border-2 border-dashed border-slate-300 dark:border-white/15 rounded-2xl">
          <p className="text-xs font-bold text-slate-950 dark:text-white">
            Please initialize or scan a bench first to manage sites.
          </p>
        </div>
      )}

      {/* Create Site Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-darkBorder rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Globe className="w-5 h-5 text-darkAccent" />
                Provision New Site
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-darkTextMuted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSite} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Site Domain / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. dev.localhost"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                />
                <p className="text-[10px] text-darkTextMuted mt-1">
                  Using `.localhost` handles local loopback routing natively in modern browsers.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Frappe Administrator Password</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">MariaDB Root Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Defaults to 'root'"
                  value={dbRootPassword}
                  onChange={(e) => setDbRootPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-darkBorder/40">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-darkAccent hover:bg-darkAccent/90 text-white font-bold rounded-lg transition-colors shadow-lg shadow-darkAccent/20"
                >
                  Create Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Install App Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-darkBorder rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5 text-xs">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-indigo-400" />
                Install App on: {showInstallModal}
              </h3>
              <button
                onClick={() => {
                  setShowInstallModal(null);
                  setSelectedApp("");
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-darkTextMuted hover:text-white transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Select App to Install</label>
                {apps.length > 0 ? (
                  <select
                    value={selectedApp}
                    onChange={(e) => setSelectedApp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                  >
                    <option value="">-- Choose an App --</option>
                    {apps.map((app) => (
                      <option key={app.name} value={app.name}>
                        {app.name} (v{app.version})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-danger">No apps downloaded in this bench. Go to Apps to clone apps.</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-darkBorder/40">
                <button
                  type="button"
                  onClick={() => {
                    setShowInstallModal(null);
                    setSelectedApp("");
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleInstallApp(showInstallModal)}
                  disabled={!selectedApp}
                  className="px-4 py-2 bg-darkAccent hover:bg-darkAccent/90 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Install App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backups List Modal */}
      {showBackupsModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-darkBorder rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-yellow-400" />
                Backups for: {showBackupsModal}
              </h3>
              <button
                onClick={() => setShowBackupsModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-darkTextMuted hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto divide-y divide-darkBorder/30 pr-1 text-xs">
              {backups.length > 0 ? (
                backups.map((backup) => (
                  <div key={backup.filename} className="py-3 flex items-center justify-between">
                    <div className="overflow-hidden pr-4">
                      <p className="font-mono text-xs text-white truncate" title={backup.filename}>
                        {backup.filename}
                      </p>
                      <p className="text-[10px] text-darkTextMuted mt-1">
                        Size: {formatSize(backup.size)} | Created: {new Date(backup.created_at * 1000).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestoreBackup(showBackupsModal, backup.filename)}
                        className="flex items-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500 border border-yellow-500/10 hover:border-yellow-500 text-yellow-400 hover:text-slate-950 px-2.5 py-1.5 rounded-lg transition-all font-semibold"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-darkTextMuted">
                  No database backup logs found. Run Backup above to generate one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drop Site Confirmation Modal */}
      {showDropConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-darkBorder rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5 mb-4 text-xs">
              <div className="w-10 h-10 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger shrink-0">
                <ShieldAlert className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Drop Site Site?</h3>
                <p className="text-darkTextMuted mt-1 leading-normal">
                  Are you absolutely sure you want to drop the site <strong className="text-white">"{showDropConfirm}"</strong>? This will permanently delete the database and erase the site files directory!
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-darkBorder/40 text-xs">
              <button
                type="button"
                onClick={() => setShowDropConfirm(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDropSite(showDropConfirm)}
                className="px-3.5 py-2 bg-danger hover:bg-danger/80 text-white font-bold rounded-lg transition-colors"
              >
                Yes, Drop Site
              </button>
            </div>
          </div>
        </div>
      )}

      </div> {/* End full-width content */}
    </div>
  );
}
