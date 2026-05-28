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
  Info
} from "lucide-react";

export default function BenchManager({ benches, onRunTask, refreshBenches }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // name of bench to delete
  const [newBenchName, setNewBenchName] = useState("");
  const [newBenchVersion, setNewBenchVersion] = useState("version-15");
  const [customPython, setCustomPython] = useState("");

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

    // Reset and close
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-darkTextMuted">Manage your local Frappe installations inside WSL</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshBenches}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 border border-darkBorder text-xs font-semibold text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Scan Benches
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-darkAccent text-white text-xs font-bold rounded-lg hover:bg-darkAccent/90 transition-colors shadow-lg shadow-darkAccent/20"
          >
            <Plus className="w-4 h-4" />
            Initialize Bench
          </button>
        </div>
      </div>

      {/* Benches Grid */}
      {benches.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {benches.map((bench) => (
            <div key={bench.path} className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-6">
              
              {/* Header: Status and Name */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                    bench.is_running 
                      ? "bg-success/10 border-success/20 text-success" 
                      : "bg-slate-800/40 border-darkBorder/40 text-darkTextMuted"
                  }`}>
                    <Server className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      {bench.name}
                      {bench.is_running ? (
                        <span className="text-[10px] bg-success/15 text-success font-semibold px-2 py-0.5 rounded-full pulse-soft">
                          Running
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-800 text-darkTextMuted font-semibold px-2 py-0.5 rounded-full">
                          Stopped
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-darkTextMuted font-mono flex items-center gap-1 mt-0.5">
                      <FolderOpen className="w-3 h-3 text-slate-500" />
                      {bench.path}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {bench.is_running ? (
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
                      className="p-2 rounded-lg hover:bg-danger/10 text-darkTextMuted hover:text-danger transition-colors"
                      title="Stop Bench Process"
                    >
                      <Square className="w-4.5 h-4.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onRunTask(
                          fetch(`${API_HOST}/api/processes/start`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ bench_path: bench.path })
                          })
                        );
                      }}
                      className="p-2 rounded-lg hover:bg-success/10 text-darkTextMuted hover:text-success transition-colors"
                      title="Start Bench Process"
                    >
                      <Play className="w-4.5 h-4.5 fill-current" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      fetch(`${API_HOST}/api/benches/open-ide`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ bench_path: bench.path })
                      })
                      .then((res) => {
                        if (!res.ok) {
                          alert("Failed to open Antigravity IDE");
                        }
                      })
                      .catch((err) => console.error("Error opening IDE:", err));
                    }}
                    className="p-2 rounded-lg hover:bg-slate-800/80 text-darkTextMuted hover:text-white transition-colors"
                    title="Open in Antigravity IDE"
                  >
                    <Code className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => {
                      onRunTask(
                        fetch(`${API_HOST}/api/benches/update`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ bench_path: bench.path })
                        })
                      );
                    }}
                    className="p-2 rounded-lg hover:bg-slate-800 text-darkTextMuted hover:text-white transition-colors"
                    title="Update Bench (bench update)"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(bench.name)}
                    className="p-2 rounded-lg hover:bg-danger/10 text-darkTextMuted hover:text-danger transition-colors"
                    title="Delete Bench Folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bench Stats Row */}
              <div className="grid grid-cols-3 gap-4 border-t border-b border-darkBorder/30 py-4 font-mono text-xs text-darkTextMuted">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Python</p>
                  <p className="text-slate-200 mt-1">{bench.python_version || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Node.js</p>
                  <p className="text-slate-200 mt-1">{bench.node_version || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Frappe Core</p>
                  <p className="text-success font-semibold mt-1">v{bench.frappe_version || "Unknown"}</p>
                </div>
              </div>

              {/* Sites Discovered */}
              <div>
                <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-2">
                  Sites ({bench.sites?.length || 0})
                </h4>
                {bench.sites && bench.sites.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {bench.sites.map((site) => (
                      <span 
                        key={site.name} 
                        className="text-[11px] font-mono font-semibold px-2.5 py-1 bg-slate-900 border border-darkBorder/40 rounded-lg text-slate-300"
                      >
                        {site.name} {site.port ? `(${site.port})` : ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-darkTextMuted italic">No sites provisioned yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-darkBorder/30 rounded-2xl bg-slate-900/10">
          <Server className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-white">No Frappe Benches Discovered</h3>
          <p className="text-xs text-darkTextMuted mt-1 max-w-sm mx-auto">
            We couldn't scan any benches under `/home/frappe` in WSL. Initialize a new bench to get started.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-darkAccent text-white text-xs font-bold rounded-lg hover:bg-darkAccent/90 transition-colors inline-flex items-center gap-2"
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
                  className="w-full px-3.5 py-2.5 rounded-lg border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                />
                <p className="text-[10px] text-darkTextMuted mt-1">This folder will be created inside `/home/frappe/`</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Frappe Branch / Version</label>
                <select
                  value={newBenchVersion}
                  onChange={(e) => setNewBenchVersion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                >
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
                  className="w-full px-3.5 py-2.5 rounded-lg border border-darkBorder bg-slate-950 text-white font-medium focus:border-darkAccent focus:outline-none"
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2.5 mt-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-300 leading-normal">
                  Bench initialization involves cloning the framework and creating a virtual env. This takes a few minutes. You can track progress in the logs terminal.
                </p>
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
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBench(showDeleteConfirm)}
                className="px-3.5 py-2 bg-danger hover:bg-danger/80 text-white font-bold rounded-lg transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
