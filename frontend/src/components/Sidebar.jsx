import React from "react";
import { 
  LayoutDashboard, 
  Server, 
  Globe, 
  AppWindow, 
  Terminal, 
  Activity, 
  Cpu,
  Rocket
} from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: "dashboard", name: "Workspace", icon: LayoutDashboard },
    { id: "benches", name: "Benches", icon: Server },
    { id: "sites", name: "Sites", icon: Globe },
    { id: "apps", name: "Apps", icon: AppWindow },
    { id: "processes", name: "Process Manager", icon: Terminal },
    { id: "system", name: "System Monitor", icon: Activity },
    { id: "setup", name: "Setup Wizard", icon: Rocket }
  ];

  return (
    <aside className="w-64 bg-white/80 dark:bg-charcoal/90 backdrop-blur-md border-r border-slate-900/10 dark:border-white/10 flex flex-col h-screen sticky top-0 z-20">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-900/5 dark:border-white/5">
        <div className="w-10 h-10 rounded-2xl bg-charcoal dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-sm">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-base tracking-tight text-slate-950 dark:text-white leading-none">
            Frappe <span className="font-serif-italic text-coral font-normal">Manager</span>
          </h1>
          <span className="text-[10px] text-slate-400 dark:text-darkTextMuted font-mono mt-1 block">v1.0.0 (Beta)</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-xs transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 scale-[1.02]"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400 dark:text-slate-500"}`} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* Bottom User/System Section */}
      <div className="p-4 border-t border-slate-900/5 dark:border-white/5 bg-slate-50/50 dark:bg-charcoal-card/40">
        <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-white dark:bg-charcoal border border-slate-900/5 dark:border-white/10 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
            W
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">WSL environment</p>
            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Connected</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
