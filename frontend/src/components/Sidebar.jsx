import React from "react";
import { 
  LayoutDashboard, 
  Server, 
  Globe, 
  AppWindow, 
  Terminal, 
  Activity, 
  Database,
  Cpu
} from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: "dashboard", name: "Workspace", icon: LayoutDashboard },
    { id: "benches", name: "Benches", icon: Server },
    { id: "sites", name: "Sites", icon: Globe },
    { id: "apps", name: "Apps", icon: AppWindow },
    { id: "processes", name: "Process Manager", icon: Terminal },
    { id: "system", name: "System Monitor", icon: Activity }
  ];

  return (
    <div className="w-64 glass-panel border-r border-darkBorder flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-darkBorder flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-darkAccent to-success flex items-center justify-center shadow-lg">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold font-sans text-lg tracking-tight erpnext-logo-gradient">Frappe Manager</h1>
          <span className="text-[10px] text-darkTextMuted font-mono">v1.0.0 (Beta)</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? "bg-darkAccent text-white shadow-lg shadow-darkAccent/20"
                  : "text-darkTextMuted hover:bg-slate-200 dark:hover:bg-slate-800/50 hover:text-darkText"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-darkTextMuted group-hover:text-white"}`} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* Bottom User/System Section */}
      <div className="p-4 border-t border-darkBorder bg-darkCard/40">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-400 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
            W
          </div>
          <div>
            <p className="text-xs font-semibold text-darkText">WSL environment</p>
            <p className="text-[10px] text-success">Connected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
