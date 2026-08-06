import React, { useEffect, useState } from "react";
import TopBar from "./components/TopBar";
import { API_HOST } from "./config";
import Dashboard from "./pages/Dashboard";
import BenchManager from "./pages/BenchManager";
import SiteManager from "./pages/SiteManager";
import AppManager from "./pages/AppManager";
import ProcessManager from "./pages/ProcessManager";
import Analytics from "./pages/Analytics";
import TerminalDrawer from "./components/TerminalDrawer";
import SetupWizard from "./pages/SetupWizard";
import { ServerCrash, Loader2 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({});
  const [benches, setBenches] = useState([]);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [initialBenchesLoaded, setInitialBenchesLoaded] = useState(false);

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
        setInitialBenchesLoaded(true);
      })
      .catch((err) => {
        console.error("Error fetching benches:", err);
        setInitialBenchesLoaded(true);
      });
  };

  useEffect(() => {
    fetchBenches();
    const interval = setInterval(fetchBenches, 5000);
    return () => clearInterval(interval);
  }, [isBackendOnline]);

  // Auto-redirect to setup wizard if conditions met
  useEffect(() => {
    if (!isBackendOnline || !initialBenchesLoaded) return;

    const checkSetupRequired = async () => {
      const skipped = localStorage.getItem("setup_skipped") === "true";
      const completed = localStorage.getItem("setup_completed") === "true";
      
      if (skipped || completed) {
        setShowSetupWizard(false);
        return;
      }

      try {
        const depRes = await fetch(`${API_HOST}/api/system/check`);
        if (depRes.ok) {
          const deps = await depRes.json();
          const missingDeps = Object.values(deps).some(d => !d.installed);
          
          if (benches.length === 0 || missingDeps) {
            setShowSetupWizard(true);
          }
        }
      } catch (err) {
        console.error("Error checking setup requirement:", err);
      }
    };

    checkSetupRequired();
  }, [isBackendOnline, initialBenchesLoaded, benches]);

  // Handle manual setup wizard trigger via navigation tab
  useEffect(() => {
    if (activeTab === "setup") {
      // Clear flags to allow starting the wizard
      localStorage.removeItem("setup_skipped");
      localStorage.removeItem("setup_completed");
      // Reset step index to step 0
      localStorage.setItem("setup_step", "0");
      setShowSetupWizard(true);
      setActiveTab("dashboard");
    }
  }, [activeTab]);



  // Function to execute an API and handle the task stream
  const handleRunTask = (apiPromise) => {
    Promise.resolve(apiPromise)
      .then(async (res) => {
        if (!res) return;
        if (res.task_id) {
          setActiveTaskId(res.task_id);
          fetchBenches();
          return;
        }
        if (typeof res.json === "function") {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: "Request failed" }));
            throw new Error(err.detail || "Request failed");
          }
          const data = await res.json();
          if (data && data.task_id) {
            setActiveTaskId(data.task_id);
          }
          fetchBenches();
        }
      })
      .catch((err) => {
        console.error("Task execution error:", err);
        alert(`Task Error: ${err.message || err}`);
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
      case "analytics":
        return (
          <Analytics 
            benches={benches}
            systemStats={systemStats}
          />
        );
      default:
        return <div className="text-white text-xs">Tab Not Found</div>;
    }
  };

  if (showSetupWizard) {
    return (
      <SetupWizard 
        onComplete={() => {
          localStorage.setItem("setup_completed", "true");
          setShowSetupWizard(false);
          fetchBenches();
        }}
        onSkip={() => {
          localStorage.setItem("setup_skipped", "true");
          setShowSetupWizard(false);
        }}
      />
    );
  }

  if (loading) {

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-darkBg text-white gap-4 font-sans">
        <Loader2 className="w-8 h-8 text-darkAccent animate-spin" />
        <p className="text-xs text-darkTextMuted font-medium">Connecting to WSL API Environment...</p>
      </div>
    );
  }

  return (
    <div className="bg-darkBg text-darkText min-h-screen font-sans flex flex-col">
      
      {/* Top Header Navigation Bar (Reference Image 3 Style) */}
      <TopBar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isBackendOnline={isBackendOnline} 
        checkConnection={checkConnection} 
        theme={theme}
        setTheme={setTheme}
      />

      {/* Main Body */}
      <main className="flex-1 px-3 sm:px-5 lg:px-6 py-5 sm:py-6 max-w-[1600px] mx-auto w-full">
        
        {/* Offline warning banner */}
        {!isBackendOnline && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-3 font-semibold pulse-soft">
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
