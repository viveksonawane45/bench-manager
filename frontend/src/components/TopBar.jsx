import React, { useEffect, useState } from "react";
import { 
  Cpu, 
  ServerCrash,
  Clock,
  Sun,
  Moon,
  RefreshCw
} from "lucide-react";

export default function TopBar({ 
  activeTab, 
  setActiveTab, 
  isBackendOnline, 
  checkConnection, 
  theme, 
  setTheme 
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: "dashboard", label: "Workspace" },
    { id: "benches", label: "Benches" },
    { id: "sites", label: "Sites" },
    { id: "apps", label: "Apps" },
    { id: "processes", label: "Process Manager" },
    { id: "analytics", label: "Analytics" },
    { id: "setup", label: "Setup Wizard" }
  ];

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-[#0c0d12]/90 backdrop-blur-xl border-b border-slate-900/10 dark:border-white/10 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Brand Logo */}
        <div 
          onClick={() => setActiveTab("dashboard")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-coral to-amber-500 text-white flex items-center justify-center shadow-md shadow-coral/20 group-hover:scale-105 transition-transform">
            <Cpu className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-slate-950 dark:text-white leading-none">
              Frappe <span className="font-serif-italic font-normal text-coral">Manager</span>
            </h1>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 block">v1.0.0 (Beta)</span>
          </div>
        </div>

        {/* Center: Reference Image 3 Style Floating Pill Navigation Bar */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 dark:bg-[#161722]/80 p-1.5 rounded-full border border-slate-900/5 dark:border-white/10 shadow-inner">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-md scale-[1.02]"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Status Pill, Clock & Theme Toggle */}
        <div className="flex items-center gap-3">
          {/* WSL Connection status pill */}
          <div>
            {isBackendOnline ? (
              <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">WSL API</span> Online
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold pulse-soft">
                <ServerCrash className="w-3.5 h-3.5" />
                Offline
              </span>
            )}
          </div>

          {/* Clock Pill */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-[#161722] border border-slate-900/10 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {time.toLocaleTimeString()}
          </div>

          {/* Refresh Connection Button */}
          <button
            onClick={checkConnection}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-[#161722] border border-slate-900/10 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all shadow-sm"
            title="Refresh API Connection"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-[#161722] border border-slate-900/10 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all shadow-sm"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown/Pills */}
      <div className="flex lg:hidden overflow-x-auto gap-1.5 pt-3 pb-1 border-t border-slate-900/5 dark:border-white/5 mt-3 scrollbar-none">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                isActive
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "bg-slate-100 dark:bg-[#161722] text-slate-600 dark:text-slate-300"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
