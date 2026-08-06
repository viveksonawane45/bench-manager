from pathlib import Path

p = Path(r"c:\Users\sonaw\.gemini\antigravity-ide\scratch\bench-manager\frontend\src\pages\BenchManager.jsx")
text = p.read_text(encoding="utf-8")
start = text.find("      {/* Benches List (full-width stacked) */}")
end = text.find("      {/* Initialize Bench Modal */}")
if start == -1 or end == -1:
    raise SystemExit(f"markers not found start={start} end={end}")

new = r'''      {/* Benches List (full-width stacked, dense) */}
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
                <div className="flex flex-wrap items-center gap-2.5">
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

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">{bench.name}</h3>
                      {bench.is_running ? (
                        <span className="text-[10px] bg-emerald-50 dark:bg-success/15 text-emerald-700 dark:text-success font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-success/20">Running</span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-darkBorder/40 text-slate-600 font-bold px-2 py-0.5 rounded-full">Stopped</span>
                      )}
                      <span className="text-[11px] font-mono text-slate-500 truncate">{bench.path}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
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

                <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-950/50 border border-slate-200/80 dark:border-darkBorder/30 p-2">
                  <button onClick={() => handleSingleBenchAction(bench.path, "clear-cache")} className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-cyan-700 dark:text-cyan-400 text-xs font-semibold rounded-lg">
                    <Eraser className="w-3.5 h-3.5" /> Clear Cache
                  </button>
                  <button onClick={() => handleSingleBenchAction(bench.path, "migrate")} className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-indigo-700 dark:text-indigo-400 text-xs font-semibold rounded-lg">
                    <Database className="w-3.5 h-3.5" /> Migrate
                  </button>
                  <button onClick={() => handleSingleBenchAction(bench.path, "build")} className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-lg">
                    <Hammer className="w-3.5 h-3.5" /> Build
                  </button>
                  <button onClick={() => handleSingleBenchAction(bench.path, "update")} className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg">
                    <RefreshCw className="w-3.5 h-3.5" /> Update
                  </button>
                  <button onClick={() => handleSingleBenchAction(bench.path, "doctor")} className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-slate-500 rounded-lg" title="Bench Doctor">
                    <Stethoscope className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setShowDeleteConfirm(bench.name)} className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-darkBorder/40 text-slate-400 hover:text-rose-600 rounded-lg" title="Delete Bench">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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

'''

p.write_text(text[:start] + new + text[end:], encoding="utf-8")
print("ok", len(new))
