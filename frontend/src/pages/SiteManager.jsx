import React, { useEffect, useState } from "react";
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
  ChevronDown
} from "lucide-react";

export default function SiteManager({ benches, onRunTask }) {
  const [selectedBenchPath, setSelectedBenchPath] = useState("");
  const [sites, setSites] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(null); // site name
  const [showBackupsModal, setShowBackupsModal] = useState(null); // site name
  const [showDropConfirm, setShowDropConfirm] = useState(null); // site name

  // Form Fields
  const [newSiteName, setNewSiteName] = useState("");
  const [adminPassword, setAdminPassword] = useState("admin");
  const [dbRootPassword, setDbRootPassword] = useState("");
  const [selectedApp, setSelectedApp] = useState("");
  const [backups, setBackups] = useState([]);

  // Sync bench selection
  useEffect(() => {
    if (benches.length > 0 && !selectedBenchPath) {
      setSelectedBenchPath(benches[0].path);
    }
  }, [benches]);

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

    // Reset and close
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Bench Selector & Actions */}
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
          
          {selectedBench && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${selectedBench.is_running ? "bg-success/10 text-success" : "bg-slate-800 text-darkTextMuted"}`}>
              {selectedBench.is_running ? "Active" : "Stopped"}
            </span>
          )}
        </div>

        {selectedBenchPath && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-darkAccent text-white text-xs font-bold rounded-lg hover:bg-darkAccent/90 transition-colors shadow-lg shadow-darkAccent/20"
          >
            <Plus className="w-4 h-4" />
            Provision Site
          </button>
        )}
      </div>

      {/* Table view of sites */}
      {selectedBenchPath ? (
        <div className="glass-panel rounded-2xl overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-darkTextMuted text-xs">
              Loading sites in {selectedBench?.name || "bench"}...
            </div>
          ) : sites.length > 0 ? (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-darkBorder/40 bg-slate-900/40 text-darkTextMuted font-bold tracking-wider uppercase text-[10px]">
                  <th className="p-4">Site Domain / URL</th>
                  <th className="p-4">External Portal</th>
                  <th className="p-4">Database Port</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkBorder/30">
                {sites.map((site) => (
                  <tr key={site.name} className="hover:bg-slate-800/10 transition-colors">
                    <td className="p-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-darkAccent" />
                        {site.name}
                      </div>
                    </td>
                    <td className="p-4">
                      {selectedBench?.is_running ? (
                        <a
                          href={`http://localhost:${site.port}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-darkAccent font-semibold hover:underline"
                        >
                          Visit App
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-darkTextMuted italic">Bench stopped</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-darkTextMuted">3306</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setShowInstallModal(site.name)}
                          className="flex items-center gap-1 bg-slate-900/60 hover:bg-slate-800 border border-darkBorder px-2.5 py-1.5 rounded-lg text-slate-200 hover:text-white transition-colors"
                          title="Install App"
                        >
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Install App
                        </button>
                        <button
                          onClick={() => handleBackupSite(site.name)}
                          className="flex items-center gap-1 bg-slate-900/60 hover:bg-slate-800 border border-darkBorder px-2.5 py-1.5 rounded-lg text-slate-200 hover:text-white transition-colors"
                          title="Backup database"
                        >
                          <Database className="w-3.5 h-3.5 text-success" />
                          Backup
                        </button>
                        <button
                          onClick={() => openBackups(site.name)}
                          className="flex items-center gap-1 bg-slate-900/60 hover:bg-slate-800 border border-darkBorder px-2.5 py-1.5 rounded-lg text-slate-200 hover:text-white transition-colors"
                          title="View Backups"
                        >
                          <Download className="w-3.5 h-3.5 text-yellow-400" />
                          Backups
                        </button>
                        <button
                          onClick={() => setShowDropConfirm(site.name)}
                          className="p-1.5 rounded-lg hover:bg-danger/10 text-darkTextMuted hover:text-danger transition-colors"
                          title="Drop Site"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16">
              <Globe className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-base font-bold text-white">No Sites Created</h3>
              <p className="text-xs text-darkTextMuted mt-1 max-w-xs mx-auto">
                There are no sites provisioned in this bench directory. Create a site to begin hosting Frappe portals.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-darkBorder/30 rounded-2xl">
          <p className="text-xs text-darkTextMuted">Please initialize or scan a bench first to manage sites.</p>
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

    </div>
  );
}
