import React, { useState, useEffect, useRef } from "react";
import { 
  Server, Terminal, Database, Download, CheckCircle2, AlertTriangle, 
  Rocket, Clipboard, Play, RefreshCw, BookOpen, ArrowRight, ArrowLeft,
  Settings, TerminalSquare, Info, ShieldAlert, Cpu
} from "lucide-react";
import { API_HOST, WS_HOST } from "../config";

export default function SetupWizard({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(() => {
    return parseInt(localStorage.getItem("setup_step") || "0");
  });
  
  const [dependencies, setDependencies] = useState({
    wsl: { installed: false, version: null, loading: false },
    ubuntu: { installed: false, version: null, loading: false },
    python: { installed: false, version: null, loading: false },
    node: { installed: false, version: null, loading: false },
    redis: { installed: false, version: null, loading: false },
    mariadb: { installed: false, version: null, loading: false },
    git: { installed: false, version: null, loading: false },
    bench: { installed: false, version: null, loading: false },
  });

  const [loadingChecks, setLoadingChecks] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [logs, setLogs] = useState("");
  const [taskStatus, setTaskStatus] = useState("idle");
  const [copiedText, setCopiedText] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showVerifyFeedback, setShowVerifyFeedback] = useState({});
  
  // Bench Creation Form State
  const [benchForm, setBenchForm] = useState({
    name: "frappe-bench",
    version: "version-15",
    python: "/usr/bin/python3",
    path: "/home/frappe/frappe-bench"
  });

  const logEndRef = useRef(null);
  const socketRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Persist current step
  useEffect(() => {
    localStorage.setItem("setup_step", currentStep.toString());
  }, [currentStep]);

  // Run initial dependencies scan
  const scanDependencies = async () => {
    setLoadingChecks(true);
    try {
      const res = await fetch(`${API_HOST}/api/system/check`);
      if (res.ok) {
        const data = await res.json();
        setDependencies(data);
      }
    } catch (err) {
      console.error("Error checking dependencies:", err);
    } finally {
      setLoadingChecks(false);
    }
  };

  useEffect(() => {
    scanDependencies();
  }, []);

  // Listen to WebSocket logs
  useEffect(() => {
    if (!activeTaskId) return;

    setLogs("");
    setTaskStatus("running");

    const wsUrl = `${WS_HOST}/ws/logs/${activeTaskId}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      setLogs((prev) => prev + event.data);
      if (event.data.includes("[Process finished")) {
        checkTaskStatus(activeTaskId);
      }
    };

    ws.onerror = () => {
      setLogs((prev) => prev + "\n[WebSocket Connection Error]");
      setTaskStatus("failed");
    };

    ws.onclose = () => {
      checkTaskStatus(activeTaskId);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [activeTaskId]);

  const checkTaskStatus = async (taskId) => {
    try {
      const res = await fetch(`${API_HOST}/api/processes/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTaskStatus(data.status);
        if (data.status === "success") {
          // Re-scan systems to update checked icons
          await scanDependencies();
        }
      }
    } catch (err) {
      console.error("Error fetching task status:", err);
    }
  };

  const handleInstall = async (depName) => {
    setLogs(`Starting installation process for ${depName.toUpperCase()}...\n`);
    setTaskStatus("running");
    
    // For local UI helpers
    if (depName === "wsl") {
      window.open("https://learn.microsoft.com/en-us/windows/wsl/install", "_blank");
    } else if (depName === "ubuntu") {
      window.open("ms-windows-store://pdp/?ProductId=9PDXGFCFSCMY", "_blank");
    }

    try {
      const res = await fetch(`${API_HOST}/api/system/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependency: depName })
      });
      const data = await res.json();
      if (res.ok && data.task_id) {
        setActiveTaskId(data.task_id);
      } else {
        setLogs((prev) => prev + `\nInstallation initiation failed: ${data.detail || "Unknown error"}`);
        setTaskStatus("failed");
      }
    } catch (err) {
      setLogs((prev) => prev + `\nError initiating installation: ${err.message}`);
      setTaskStatus("failed");
    }
  };

  const handleVerify = async (depName) => {
    try {
      const res = await fetch(`${API_HOST}/api/system/check`);
      if (res.ok) {
        const data = await res.json();
        setDependencies(data);
        const isOk = data[depName]?.installed;
        
        setShowVerifyFeedback(prev => ({ ...prev, [depName]: isOk ? "verified" : "missing" }));
        setTimeout(() => {
          setShowVerifyFeedback(prev => ({ ...prev, [depName]: null }));
        }, 3000);
      }
    } catch (err) {
      console.error("Error in verification:", err);
    }
  };

  const handleCreateBench = async () => {
    setLogs("Initiating Frappe Bench creation...\n");
    setTaskStatus("running");
    try {
      const res = await fetch(`${API_HOST}/api/benches/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: benchForm.name,
          version: benchForm.version,
          python: benchForm.python
        })
      });
      const data = await res.json();
      if (res.ok && data.task_id) {
        setActiveTaskId(data.task_id);
      } else {
        setLogs((prev) => prev + `\nBench creation failed: ${data.detail || "Unknown error"}`);
        setTaskStatus("failed");
      }
    } catch (err) {
      setLogs((prev) => prev + `\nError initializing bench: ${err.message}`);
      setTaskStatus("failed");
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadLogs = () => {
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTaskId || "installation"}_logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Steps Configuration
  const steps = [
    {
      id: "wsl",
      title: "Windows Subsystem for Linux (WSL2)",
      description: "Frappe Bench and ERPNext require a Linux-based environment to run properly.",
      why: "Frappe utilizes Linux system processes, Redis, and multi-threaded gunicorn servers which are not natively supported on Windows.",
      doc: "https://learn.microsoft.com/en-us/windows/wsl/install",
      checkKey: "wsl",
      instructions: "Enable WSL by running powershell as Administrator and typing: wsl --install"
    },
    {
      id: "ubuntu",
      title: "Ubuntu Linux Distribution",
      description: "Ubuntu serves as the container OS inside WSL to host Python, MariaDB, and Redis.",
      why: "Frappe Bench is officially tested and optimized for Debian/Ubuntu environments.",
      doc: "https://ubuntu.com/wsl",
      checkKey: "ubuntu",
      instructions: "Open the Microsoft Store, search for 'Ubuntu 22.04 LTS', and click Install."
    },
    {
      id: "python",
      title: "Python (Recommended: v3.11/v3.12)",
      description: "The primary programming language powering the Frappe and ERPNext server code.",
      why: "Frappe v15 requires Python 3.10, 3.11, or 3.12 to manage backend objects.",
      doc: "https://www.python.org/",
      checkKey: "python",
      instructions: "Inside WSL Ubuntu terminal, run: sudo apt update && sudo apt install -y python3 python3-pip python3-dev"
    },
    {
      id: "node",
      title: "Node.js (Recommended: v18 LTS)",
      description: "Runs frontend compilation, builds assets, and runs socket.io realtime events.",
      why: "Frappe uses tailwind/yarn compiling packages which require Node.js.",
      doc: "https://nodejs.org/",
      checkKey: "node",
      instructions: "Install Node inside WSL Ubuntu: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    },
    {
      id: "redis",
      title: "Redis Server",
      description: "An in-memory database used for queue management, caching, and WebSocket connections.",
      why: "Frappe uses Redis queues for asynchronous tasks (via RQ) and live updates.",
      doc: "https://redis.io/",
      checkKey: "redis",
      instructions: "Run inside WSL Ubuntu terminal: sudo apt install -y redis-server && sudo service redis-server start"
    },
    {
      id: "mariadb",
      title: "MariaDB Database",
      description: "The primary relational database used to store all Frappe and ERPNext records.",
      why: "Frappe utilizes custom schema structures, microsecond datetimes, and index setups optimized for MariaDB.",
      doc: "https://mariadb.org/",
      checkKey: "mariadb",
      instructions: "Run: sudo apt install -y mariadb-server mariadb-client\nThen secure: sudo mysql_secure_installation"
    },
    {
      id: "bench",
      title: "Frappe Bench CLI",
      description: "The command-line tool used to install, update, and manage sites and apps.",
      why: "Bench coordinates python virtualenvs, updates packages, starts services, and runs commands.",
      doc: "https://github.com/frappe/bench",
      checkKey: "bench",
      instructions: "Install pip package: pip3 install --user frappe-bench"
    },
    {
      id: "create",
      title: "Create Your First Bench",
      description: "Prepare and initialize your workspace folder inside WSL Ubuntu.",
      why: "A Frappe Bench directory houses all of your custom apps, configurations, databases, and sites.",
      doc: "https://frappeframework.com/docs/user/en/bench",
      checkKey: null
    }
  ];

  const totalWizardSteps = steps.length;
  const progressPercent = Math.round((currentStep / (totalWizardSteps + 1)) * 100);
  const activeStepDetails = currentStep > 0 && currentStep <= steps.length ? steps[currentStep - 1] : null;

  return (
    <div className="fixed inset-0 z-50 bg-[#f3f4f6] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 overflow-y-auto font-sans selection:bg-blue-600/30">
      
      {/* Background visual accents */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-100/30 dark:from-blue-900/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-blue-500/5 dark:bg-blue-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/5 blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative max-w-5xl mx-auto px-6 py-12 flex flex-col min-h-screen">
        
        {/* Header Bar */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent">
                Antigravity Setup Wizard
              </h2>
            </div>
          </div>

          <button 
            onClick={onSkip}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-white dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white transition-all cursor-pointer"
          >
            Skip Onboarding
          </button>
        </div>

        {/* Global Progress Tracker */}
        <div className="mb-10 w-full bg-slate-200 dark:bg-slate-800/40 rounded-full h-2 p-[2px] border border-slate-300/30 dark:border-slate-700/20 shadow-inner">
          <div 
            className="bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-md shadow-blue-500/25"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step 0: Welcome Screen */}
        {currentStep === 0 && (
          <div className="flex-1 flex flex-col justify-center items-center py-10 text-center">
            
            {/* Visual server illustration */}
            <div className="relative mb-8 p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-lg dark:shadow-2xl flex items-center justify-center w-28 h-28">
              <Server className="w-14 h-14 text-blue-600 dark:text-blue-500" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-4 border-[#f3f4f6] dark:border-[#0f172a] animate-bounce" />
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
              Create Your First Frappe Bench
            </h1>
            <p className="text-slate-655 dark:text-slate-400 max-w-xl text-base md:text-lg mb-8 leading-relaxed">
              Let's prepare your system and install everything required for ERPNext development. We'll verify your WSL dependencies and help create your first workspace.
            </p>

            {/* Micro stats banner */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-2xl w-full mb-10">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Estimated Setup</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">15-20 Mins</p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Compatibility</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">WSL2 + Ubuntu</p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md col-span-2 md:col-span-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">System Status</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">Online</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowStartModal(true)}
                className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center gap-2 cursor-pointer text-sm animate-pulse"
              >
                Start Setup
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: System Check Page */}
        {currentStep === 1 && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">System Dependency Scan</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">We checked the installed components inside your WSL2 virtual environment.</p>
            </div>

            {loadingChecks ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Scanning environment variables & packages...</p>
              </div>
            ) : (
              <>
                {/* Dependency Checklist Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(dependencies).map(([key, data]) => {
                    const isOk = data.installed;
                    return (
                      <div key={key} className={`p-4 rounded-2xl bg-white dark:bg-slate-900/30 border ${isOk ? 'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/40 dark:bg-emerald-950/5' : 'border-slate-200 dark:border-slate-800'} flex items-center justify-between shadow-sm dark:shadow-md`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl ${isOk ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-500'}`}>
                            {key === "mariadb" ? <Database className="w-5 h-5" /> : 
                             key === "redis" ? <Cpu className="w-5 h-5" /> : 
                             key === "bench" ? <Terminal className="w-5 h-5" /> :
                             <Server className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">{key === "mariadb" ? "MariaDB SQL Server" : key === "bench" ? "Frappe Bench CLI" : key}</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {isOk ? `Version detected: ${data.version || "Active"}` : "Missing dependency"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isOk ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Installed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Missing
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Info and Actions */}
                <div className="mt-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-slate-900/40 border border-blue-100 dark:border-slate-800 flex gap-4 items-start shadow-sm">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">How to proceed:</h4>
                    <p className="text-[11px] text-slate-650 dark:text-slate-400 mt-1 leading-relaxed">
                      If any components are marked as missing, we will step through each dependency to install them. Click <strong>Configure Steps</strong> to begin configuring them one-by-one, or you can run installs directly.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6">
                  <button 
                    onClick={() => setCurrentStep(0)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 flex items-center gap-2 transition-all cursor-pointer text-xs font-semibold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={scanDependencies}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all cursor-pointer text-xs font-semibold"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Rescan System
                    </button>
                    
                    <button 
                      onClick={() => setCurrentStep(2)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 transition-all flex items-center gap-2 cursor-pointer text-xs"
                    >
                      Configure Steps
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2+ Stepper Timeline (Steps 2 to 9) */}
        {currentStep >= 2 && currentStep <= 9 && activeStepDetails && (
          <div className="flex-1 flex flex-col md:flex-row gap-8">
            
            {/* Timeline sidebar panel */}
            <div className="w-full md:w-[220px] flex flex-col gap-3 shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-2 px-1">Setup Progress</h3>
              <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 scrollbar-none">
                {steps.map((st, idx) => {
                  const stepNum = idx + 2;
                  const isActive = currentStep === stepNum;
                  const isCompleted = currentStep > stepNum;
                  const isDepInstalled = st.checkKey ? dependencies[st.checkKey]?.installed : false;

                  return (
                    <button
                      key={st.id}
                      onClick={() => setCurrentStep(stepNum)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl text-left border transition-all shrink-0 select-none cursor-pointer ${
                        isActive 
                        ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold'
                        : isCompleted || isDepInstalled
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/5 border-emerald-100 dark:border-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                        : 'bg-white dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/40 text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-805 hover:text-slate-700 dark:hover:text-slate-400'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive ? 'bg-blue-500 text-white' :
                        isCompleted || isDepInstalled ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {isCompleted || isDepInstalled ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span className="text-[11px] truncate w-[130px]">{st.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Core active step content panel */}
            <div className="flex-1 flex flex-col gap-6">
              
              {/* Card headers */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md flex flex-col gap-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{activeStepDetails.title}</h2>
                    <p className="text-slate-650 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                      {activeStepDetails.description}
                    </p>
                  </div>
                  
                  {activeStepDetails.checkKey && (
                    <div>
                      {dependencies[activeStepDetails.checkKey]?.installed ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 whitespace-nowrap">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Requires Install
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-55 dark:bg-slate-955/60 border border-slate-200 dark:border-slate-800/40 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-880 dark:text-slate-200">Why this is needed:</span> {activeStepDetails.why}
                </div>

                {/* Instruction command card */}
                {activeStepDetails.instructions && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Terminal Command</p>
                    <div className="p-3 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-200 dark:border-slate-800/60 flex items-center justify-between font-mono text-[11px] text-slate-700 dark:text-slate-350 select-all">
                      <span className="truncate mr-4">$ {activeStepDetails.instructions}</span>
                      <button 
                        onClick={() => copyToClipboard(activeStepDetails.instructions, activeStepDetails.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-805 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
                        title="Copy command"
                      >
                        <Clipboard className="w-4 h-4" />
                      </button>
                    </div>
                    {copiedText === activeStepDetails.id && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold self-end">Copied command!</p>
                    )}
                  </div>
                )}

                {/* Action Buttons specific to each step */}
                <div className="flex gap-3 mt-2">
                  {/* WSL/Ubuntu downloads */}
                  {activeStepDetails.id === "wsl" && (
                    <button 
                      onClick={() => handleInstall("wsl")}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/10"
                    >
                      <Download className="w-4 h-4" />
                      Install WSL
                    </button>
                  )}
                  {activeStepDetails.id === "ubuntu" && (
                    <button 
                      onClick={() => handleInstall("ubuntu")}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/10"
                    >
                      <Download className="w-4 h-4" />
                      Open Microsoft Store
                    </button>
                  )}

                  {/* Standard server trigger installations */}
                  {activeStepDetails.checkKey && activeStepDetails.id !== "wsl" && activeStepDetails.id !== "ubuntu" && (
                    <button 
                      onClick={() => handleInstall(activeStepDetails.id)}
                      disabled={dependencies[activeStepDetails.checkKey]?.installed || taskStatus === "running"}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/10"
                    >
                      {taskStatus === "running" ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Install Automatically
                    </button>
                  )}

                  {activeStepDetails.doc && (
                    <a 
                      href={activeStepDetails.doc}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-202 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-205 dark:border-slate-700/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-bold flex items-center gap-2 transition-colors select-none"
                    >
                      <BookOpen className="w-4 h-4" />
                      Documentation
                    </a>
                  )}

                  {activeStepDetails.checkKey && (
                    <div className="flex items-center gap-3 ml-auto">
                      {/* Verify feedback toggle */}
                      {showVerifyFeedback[activeStepDetails.checkKey] === "verified" && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1.5 rounded-xl border border-emerald-250 animate-in fade-in zoom-in-95 duration-200">
                          Verified ✓
                        </span>
                      )}
                      {showVerifyFeedback[activeStepDetails.checkKey] === "missing" && (
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1.5 rounded-xl border border-rose-250 animate-in fade-in zoom-in-95 duration-200">
                          Not Detected ✗
                        </span>
                      )}
                      
                      <button
                        onClick={() => handleVerify(activeStepDetails.checkKey)}
                        className="px-4 py-2 bg-slate-105 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs text-slate-605 dark:text-slate-350 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Verify Installation
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 8 Form Panel (Create Bench) */}
              {activeStepDetails.id === "create" && (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-500" />
                    Configure Bench Directory
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-550 dark:text-slate-400">Bench Directory Name</label>
                      <input 
                        type="text"
                        value={benchForm.name}
                        onChange={(e) => setBenchForm({ ...benchForm, name: e.target.value })}
                        className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 focus:outline-none text-slate-800 dark:text-slate-100"
                        placeholder="e.g. frappe-bench"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-555 dark:text-slate-400">Frappe Framework Branch</label>
                      <select 
                        value={benchForm.version}
                        onChange={(e) => setBenchForm({ ...benchForm, version: e.target.value })}
                        className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 focus:outline-none text-slate-800 dark:text-slate-100"
                      >
                        <option value="version-15">Version 15 (LTS)</option>
                        <option value="version-14">Version 14</option>
                        <option value="develop">Develop (Nightly)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[11px] font-bold text-slate-555 dark:text-slate-400">Python Interpreter Path</label>
                      <input 
                        type="text"
                        value={benchForm.python}
                        onChange={(e) => setBenchForm({ ...benchForm, python: e.target.value })}
                        className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-blue-500 focus:outline-none font-mono text-slate-800 dark:text-slate-100"
                        placeholder="e.g. /usr/bin/python3"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleCreateBench}
                    disabled={taskStatus === "running"}
                    className="mt-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all w-full"
                  >
                    {taskStatus === "running" ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Initializing Bench...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        Initialize Frappe Bench Workspace
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Console log output window */}
              {(logs || taskStatus === "running") && (
                <div className="rounded-2xl border border-slate-800 bg-slate-955 overflow-hidden flex flex-col h-[280px] shadow-2xl terminal-drawer">
                  
                  {/* Console Header */}
                  <div className="px-4 py-2 border-b border-slate-900 bg-slate-900/80 flex justify-between items-center">
                    <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <TerminalSquare className="w-4 h-4 text-emerald-400" />
                      Active Installation Log Stream
                    </span>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={handleDownloadLogs}
                        className="px-2.5 py-1 rounded bg-slate-850 hover:bg-slate-800 text-[10px] text-slate-300 font-bold transition-all cursor-pointer select-none"
                      >
                        Download Logs
                      </button>
                    </div>
                  </div>

                  {/* Logs area */}
                  <div className="flex-1 p-5 overflow-y-auto font-mono text-[10px] text-slate-350 leading-relaxed whitespace-pre-wrap select-text selection:bg-blue-600/30">
                    {logs ? logs : "Connecting to active daemon logs...\n"}
                    <div ref={logEndRef} />
                  </div>

                  {/* Console Footer */}
                  <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>Task Status: <strong className={`uppercase ${taskStatus === 'success' ? 'text-emerald-400' : taskStatus === 'failed' ? 'text-rose-500' : 'text-blue-400'}`}>{taskStatus}</strong></span>
                    {taskStatus === "success" && <span className="text-emerald-400 font-semibold animate-pulse">✓ Complete</span>}
                  </div>
                </div>
              )}

              {/* Troubleshooting/Help panel */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-500/10 bg-amber-50/50 dark:bg-amber-500/5 text-[11px] text-amber-700 dark:text-amber-500/80 leading-relaxed flex gap-3">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="font-bold text-amber-700 dark:text-amber-550">Stuck or having issues installing?</h4>
                  <p className="mt-0.5">
                    If automatic installation fails, copy the terminal command above, open your WSL Terminal manually, paste and run it there. When you return here, click <strong>Verify Installation</strong> to re-check.
                  </p>
                </div>
              </div>

              {/* Wizard Footer controls */}
              <div className="flex justify-between items-center mt-4">
                <button 
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:bg-slate-105 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-all cursor-pointer text-xs font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous Step
                </button>

                <button 
                  onClick={() => {
                    if (currentStep === steps.length + 1) {
                      onComplete();
                    } else {
                      setCurrentStep(currentStep + 1);
                    }
                  }}
                  disabled={
                    activeStepDetails.id === "create" 
                      ? taskStatus !== "success"
                      : (activeStepDetails.checkKey && !dependencies[activeStepDetails.checkKey]?.installed)
                  }
                  className="px-5 py-2.5 bg-blue-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 transition-all flex items-center gap-2 cursor-pointer text-xs"
                >
                  {activeStepDetails.id === "create" 
                    ? "Finish & Enter Dashboard" 
                    : (currentStep === steps.length + 1 ? "Complete Setup" : "Next Step")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        )}

        {/* Step 10: Setup Success Screen */}
        {currentStep === 10 && (
          <div className="flex-1 flex flex-col justify-center items-center py-10 text-center">
            
            <div className="relative mb-8 p-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-2xl flex items-center justify-center w-28 h-28 glass-panel animate-bounce">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/10 to-teal-400/10 animate-pulse" />
              <Rocket className="w-14 h-14 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 text-slate-900 dark:text-white">
              Bench Initialized Successfully!
            </h1>
            <p className="text-slate-650 dark:text-slate-400 max-w-lg text-sm mb-8 leading-relaxed">
              Your system environment is fully configured and your first Frappe Bench has been created. You are now ready to add applications, create database sites, and start coding.
            </p>

            <button 
              onClick={onComplete}
              className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer text-sm"
            >
              Enter Bench Manager
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
          </div>
        )}

      </div>

      {/* Start Setup Modal (Pop-up Interaction for the Start Setup Button) */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-100">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 font-sans">
              <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-500" />
              Environment Summary Check
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              The setup wizard will scan and verify your local dependencies. Here are the parameters for your Frappe development environment:
            </p>
            
            {/* The stats banner cards inside the popup! */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Estimated Setup Time</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">15-20 Mins</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Compatibility Environment</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">WSL2 + Ubuntu</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">System Core Daemon</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Online</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end text-xs font-semibold">
              <button 
                onClick={() => setShowStartModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowStartModal(false);
                  setCurrentStep(1);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/10 transition-colors"
              >
                Begin Setup Scan
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
