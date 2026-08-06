import React, { useEffect, useState } from "react";
import { 
  ServerCrash,
  Server,
  RefreshCw,
  Clock,
  Sun,
  Moon
} from "lucide-react";

export default function Navbar({ activeTab, isBackendOnline, checkConnection, theme, setTheme }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const renderTitle = (tab) => {
    if (tab === "dashboard") {
      return (
        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">
          Dashboard <span className="font-serif-italic text-slate-700 dark:text-slate-300 font-normal">Workspace</span>
        </h2>
      );
    }
    const formatted = tab.charAt(0).toUpperCase() + tab.slice(1).replace("_", " ");
    return (
      <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">
        {formatted}
      </h2>
    );
  };

  return (
    <header className="h-20 border-b border-slate-900/5 dark:border-white/5 bg-white/60 dark:bg-charcoal/60 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Title */}
      <div>
        {renderTitle(activeTab)}
      </div>

      {/* Utilities / Indicators */}
      <div className="flex items-center gap-4">
        {/* Connection status pill */}
        <div>
          {isBackendOnline ? (
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              WSL API Online
            </span>
          ) : (
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold pulse-soft">
              <ServerCrash className="w-3.5 h-3.5" />
              WSL API Offline
            </span>
          )}
        </div>

        {/* Local time tracker pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-charcoal-card border border-slate-900/10 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {time.toLocaleTimeString()}
        </div>

        {/* Refresh button */}
        <button
          onClick={checkConnection}
          className="p-2.5 rounded-full bg-white dark:bg-charcoal-card border border-slate-900/10 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-all shadow-sm"
          title="Refresh connection status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Theme Toggle button */}
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="p-2.5 rounded-full bg-white dark:bg-charcoal-card border border-slate-900/10 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-all shadow-sm"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
