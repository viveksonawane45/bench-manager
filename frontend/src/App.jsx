import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import { API_HOST } from "./config";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import BenchManager from "./pages/BenchManager";
import SiteManager from "./pages/SiteManager";
import AppManager from "./pages/AppManager";
import ProcessManager from "./pages/ProcessManager";
import SystemMonitor from "./pages/SystemMonitor";
import TerminalDrawer from "./components/TerminalDrawer";
import { ServerCrash, Loader2 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({});
  const [benches, setBenches] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // Sync theme class with HTML document root
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Check connection to backend
  const checkConnection = () => {
    fetch(API_HOST)
      .then((res) => {
        if (res.ok) {
          setIsBackendOnline(true);
        } else {
          setIsBackendOnline(false);
        }
      })
      .catch(() => {
        setIsBackendOnline(false);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Run initial heartbeat check
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 4000);
    return () => clearInterval(interval);
  }, []);

  // Poll system statistics
  useEffect(() => {
    if (!isBackendOnline) return;

    const fetchStats = () => {
      fetch(`${API_HOST}/api/system/stats`)
        .then((res) => res.json())
        .then((data) => setSystemStats(data))
        .catch((err) => console.error("Error fetching system stats:", err));
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [isBackendOnline]);

  // Poll benches list
  const fetchBenches = () => {
    if (!isBackendOnline) return;
    fetch(`${API_HOST}/api/benches`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBenches(data);
        }
      })
      .catch((err) => console.error("Error fetching benches:", err));
  };

  useEffect(() => {
    fetchBenches();
    const interval = setInterval(fetchBenches, 5000);
    return () => clearInterval(interval);
  }, [isBackendOnline]);

  // Function to execute an API and handle the task stream
  const handleRunTask = (apiPromise) => {
    apiPromise
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.detail || "Request failed");
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.task_id) {
          setActiveTaskId(data.task_id);
        }
        // Immediately fetch benches after initiating a task
        fetchBenches();
      })
      .catch((err) => {
        alert(`Task Error: ${err.message}`);
      });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard 
            systemStats={systemStats} 
            benches={benches} 
            onRunTask={handleRunTask}
            setActiveTab={setActiveTab}
          />
        );
      case "benches":
        return (
          <BenchManager 
            benches={benches} 
            onRunTask={handleRunTask} 
            refreshBenches={fetchBenches}
          />
        );
      case "sites":
        return (
          <SiteManager 
            benches={benches} 
            onRunTask={handleRunTask}
          />
        );
      case "apps":
        return (
          <AppManager 
            benches={benches} 
            onRunTask={handleRunTask}
          />
        );
      case "processes":
        return (
          <ProcessManager 
            onRunTask={handleRunTask}
          />
        );
      case "system":
        return (
          <SystemMonitor 
            systemStats={systemStats} 
            checkConnection={checkConnection}
          />
        );
      default:
        return <div className="text-white text-xs">Tab Not Found</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-darkBg text-white gap-4 font-sans">
        <Loader2 className="w-8 h-8 text-darkAccent animate-spin" />
        <p className="text-xs text-darkTextMuted font-medium">Connecting to WSL API Environment...</p>
      </div>
    );
  }

  return (
    <div className="flex bg-darkBg text-darkText min-h-screen font-sans">
      
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* Top Header */}
        <Navbar 
          activeTab={activeTab} 
          isBackendOnline={isBackendOnline} 
          checkConnection={checkConnection} 
          theme={theme}
          setTheme={setTheme}
        />

        {/* Content View */}
        <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto w-full">
          
          {/* Offline warning banner */}
          {!isBackendOnline && (
            <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-3 font-semibold pulse-soft">
              <ServerCrash className="w-5 h-5 shrink-0" />
              <span>
                Backend offline. Run the FastAPI backend in WSL under the `frappe` user to enable bench operations: 
                <code className="bg-slate-900 px-1.5 py-0.5 rounded ml-2 text-slate-200">
                  python3 -m uvicorn main:app --host 0.0.0.0 --port 8005
                </code>
              </span>
            </div>
          )}

          {renderContent()}
        </main>
      </div>

      {/* Live Logs Console overlay */}
      {activeTaskId && (
        <TerminalDrawer 
          taskId={activeTaskId} 
          onClose={() => {
            setActiveTaskId(null);
            fetchBenches(); // Refresh list when terminal is closed
          }} 
        />
      )}
    </div>
  );
}
