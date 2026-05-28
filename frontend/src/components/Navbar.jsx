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

  const formatTitle = (tab) => {
    if (tab === "dashboard") return "Dashboard Workspace";
    return tab.charAt(0).toUpperCase() + tab.slice(1).replace("_", " ");
  };

  return (
    <header className="h-16 border-b border-darkBorder bg-darkCard/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-darkText tracking-tight">{formatTitle(activeTab)}</h2>
      </div>

      {/* Utilities / Indicators */}
      <div className="flex items-center gap-6">
        {/* Connection status */}
        <div className="flex items-center gap-2">
          {isBackendOnline ? (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold">
              <Server className="w-3.5 h-3.5" />
              WSL API Online
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/10 text-danger text-xs font-semibold pulse-soft">
              <ServerCrash className="w-3.5 h-3.5" />
              WSL API Offline
            </span>
          )}
        </div>

        {/* Local time tracker */}
        <div className="flex items-center gap-2 text-darkTextMuted text-xs font-mono">
          <Clock className="w-4 h-4 text-slate-500" />
          {time.toLocaleTimeString()}
        </div>

        {/* Refresh button */}
        <button
          onClick={checkConnection}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-darkTextMuted hover:text-darkText transition-colors"
          title="Refresh connection status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Theme Toggle button */}
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-darkTextMuted hover:text-darkText transition-colors"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
