import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Terminal as TerminalIcon,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Search,
  Copy,
  Download,
  Minimize2,
  Maximize2,
  Trash2,
  ArrowDownCircle,
  Square,
  ChevronDown,
} from "lucide-react";
import { API_HOST, WS_HOST } from "../config";

const MIN_HEIGHT = 140;
const DEFAULT_HEIGHT = 280;
const TITLEBAR_HEIGHT = 36;

export default function TerminalDrawer({ taskId, onClose }) {
  const [logs, setLogs] = useState("");
  const [status, setStatus] = useState("running");
  const [command, setCommand] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [prevHeight, setPrevHeight] = useState(DEFAULT_HEIGHT);

  const logEndRef = useRef(null);
  const logViewportRef = useRef(null);
  const socketRef = useRef(null);
  const dragRef = useRef({ active: false, startY: 0, startH: DEFAULT_HEIGHT });

  const cleanAnsi = (text) => {
    if (!text) return "";
    return text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
  };

  const maxAllowed = () => Math.floor(window.innerHeight * 0.85);

  useEffect(() => {
    if (autoScroll && !isMinimized) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, isMinimized, height, isMaximized]);

  useEffect(() => {
    if (!taskId) return;

    fetch(`${API_HOST}/api/processes/tasks/${taskId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.command) {
          setCommand(data.command);
          setLogs(data.logs || "");
          setStatus(data.status);
        }
      })
      .catch((err) => console.error("Error fetching task info:", err));

    const wsUrl = `${WS_HOST}/ws/logs/${taskId}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      setLogs((prev) => prev + event.data);

      if (event.data.includes("[Process finished")) {
        fetch(`${API_HOST}/api/processes/tasks/${taskId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data) setStatus(data.status);
          });
      }
    };

    ws.onerror = () => {
      setLogs((prev) => prev + "\n[WebSocket Connection Error]");
      setStatus("failed");
    };

    ws.onclose = () => {
      fetch(`${API_HOST}/api/processes/tasks/${taskId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data) setStatus(data.status);
        })
        .catch(() => setStatus("finished"));
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [taskId]);

  const onResizeMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const delta = dragRef.current.startY - e.clientY;
    const next = Math.min(
      Math.max(dragRef.current.startH + delta, MIN_HEIGHT),
      maxAllowed()
    );
    setHeight(next);
    setIsMaximized(false);
    setIsMinimized(false);
  }, []);

  const onResizeUp = useCallback(() => {
    dragRef.current.active = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeUp);
  }, [onResizeMove]);

  const onResizeDown = (e) => {
    e.preventDefault();
    dragRef.current = {
      active: true,
      startY: e.clientY,
      startH: isMinimized ? TITLEBAR_HEIGHT : isMaximized ? maxAllowed() : height,
    };
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup", onResizeUp);
    };
  }, [onResizeMove, onResizeUp]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(cleanAnsi(logs));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const element = document.createElement("a");
    const file = new Blob([cleanAnsi(logs)], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `task_${taskId}_logs.log`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleKillTask = () => {
    fetch(`${API_HOST}/api/processes/tasks/${taskId}/kill`, { method: "POST" }).then(
      (res) => {
        if (res.ok) {
          setLogs((prev) => prev + "\n[Task terminated by user]\n");
          setStatus("failed");
        }
      }
    );
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setIsMinimized(false);
      setHeight(prevHeight || DEFAULT_HEIGHT);
    } else {
      setPrevHeight(height);
      setIsMaximized(true);
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setPrevHeight(height);
      setIsMinimized(true);
      setIsMaximized(false);
    }
  };

  const cleanedLogs = cleanAnsi(logs);
  const filteredLogs = filterQuery.trim()
    ? cleanedLogs
        .split("\n")
        .filter((line) => line.toLowerCase().includes(filterQuery.toLowerCase()))
        .join("\n")
    : cleanedLogs;

  const panelHeight = isMinimized
    ? TITLEBAR_HEIGHT
    : isMaximized
      ? maxAllowed()
      : height;

  return (
    <div
      className="terminal-panel fixed inset-x-0 bottom-0 z-50 flex flex-col border-t border-[#333] shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
      style={{ height: panelHeight, backgroundColor: "#000000" }}
    >
      {/* Drag handle — resize like VS Code */}
      <div
        onMouseDown={onResizeDown}
        className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize z-10 group flex items-center justify-center"
        title="Drag to resize terminal"
      >
        <div className="w-10 h-1 rounded-full bg-[#555] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Title bar */}
      <div
        className="terminal-panel-bar shrink-0 flex items-center justify-between gap-2 px-3 border-b border-[#222]"
        style={{ height: TITLEBAR_HEIGHT, backgroundColor: "#000000" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <TerminalIcon className="w-3.5 h-3.5 text-[#ccc] shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#ccc]">
            Terminal
          </span>
          <span className="text-[10px] font-mono text-[#888] truncate max-w-[160px] sm:max-w-xs">
            {taskId}
          </span>
          {status === "running" && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running
            </span>
          )}
          {status === "success" && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              Success
            </span>
          )}
          {status === "failed" && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-400">
              <AlertTriangle className="w-3 h-3" />
              Failed
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {status === "running" && (
            <button
              onClick={handleKillTask}
              className="p-1.5 rounded hover:bg-[#222] text-[#ccc] hover:text-rose-400"
              title="Kill process"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          )}
          <button
            onClick={toggleMinimize}
            className="p-1.5 rounded hover:bg-[#222] text-[#ccc]"
            title={isMinimized ? "Restore" : "Minimize"}
          >
            {isMinimized ? (
              <ChevronDown className="w-3.5 h-3.5 rotate-180" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={toggleMaximize}
            className="p-1.5 rounded hover:bg-[#222] text-[#ccc]"
            title={isMaximized ? "Restore size" : "Maximize"}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#222] text-[#ccc] hover:text-white"
            title="Close terminal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Toolbar */}
          <div
            className="terminal-panel-bar shrink-0 px-3 py-1.5 border-b border-[#222] flex flex-col gap-1.5"
            style={{ backgroundColor: "#000000" }}
          >
            {command && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-[#888] uppercase shrink-0">
                  Cmd
                </span>
                <code className="flex-1 text-[11px] text-[#4ade80] font-mono truncate bg-[#0a0a0a] border border-[#222] px-2 py-0.5 rounded">
                  $ {command}
                </code>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-[#666] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 bg-[#0a0a0a] border border-[#333] rounded text-[11px] text-[#e5e5e5] placeholder:text-[#666] focus:outline-none focus:border-[#555]"
                />
              </div>

              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                  autoScroll
                    ? "border-[#3b82f6] text-[#60a5fa] bg-[#0a0a0a]"
                    : "border-[#333] text-[#888] bg-[#0a0a0a]"
                }`}
                title="Toggle auto-scroll"
              >
                <ArrowDownCircle className="w-3 h-3" />
                {autoScroll ? "Auto" : "Manual"}
              </button>
              <button
                onClick={handleCopyLogs}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border border-[#333] text-[#ccc] bg-[#0a0a0a] hover:border-[#555]"
              >
                <Copy className="w-3 h-3" />
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownloadLogs}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border border-[#333] text-[#ccc] bg-[#0a0a0a] hover:border-[#555]"
              >
                <Download className="w-3 h-3" />
                Save
              </button>
              <button
                onClick={() => setLogs("")}
                className="p-1 rounded border border-[#333] text-[#888] hover:text-rose-400 bg-[#0a0a0a]"
                title="Clear"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Log viewport — pure black */}
          <div
            ref={logViewportRef}
            className="terminal-panel-logs flex-1 min-h-0 overflow-y-auto px-3 py-2 font-mono text-[12px] text-[#cccccc] leading-relaxed whitespace-pre-wrap select-text"
            style={{ backgroundColor: "#000000" }}
          >
            {filteredLogs ? (
              filteredLogs
            ) : (
              <div className="flex items-center justify-center h-full text-[#666] gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#3b82f6]" />
                {filterQuery ? "No matching lines..." : "Streaming output from WSL..."}
              </div>
            )}
            <div ref={logEndRef} />
          </div>

          {/* Status bar */}
          <div
            className="terminal-panel-bar shrink-0 px-3 py-1 border-t border-[#222] flex items-center justify-between text-[10px] font-mono text-[#888]"
            style={{ backgroundColor: "#000000" }}
          >
            <span>
              {cleanedLogs ? cleanedLogs.split("\n").length : 0} lines
              {filterQuery ? " (filtered)" : ""}
            </span>
            <span>Drag top edge to resize · {Math.round(panelHeight)}px</span>
          </div>
        </>
      )}
    </div>
  );
}
