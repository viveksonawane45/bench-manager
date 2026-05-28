import React, { useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon, X, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { API_HOST, WS_HOST } from "../config";

export default function TerminalDrawer({ taskId, onClose }) {
  const [logs, setLogs] = useState("");
  const [status, setStatus] = useState("running");
  const [command, setCommand] = useState("");
  const logEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom on log change
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    if (!taskId) return;

    // Fetch initial task details (command info)
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

    // Connect to WebSocket
    const wsUrl = `${WS_HOST}/ws/logs/${taskId}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      setLogs((prev) => prev + event.data);
      
      // Update status if finished
      if (event.data.includes("[Process finished")) {
        // Fetch final status
        fetch(`${API_HOST}/api/processes/tasks/${taskId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data) setStatus(data.status);
          });
      }
    };

    ws.onerror = (err) => {
      setLogs((prev) => prev + "\n[WebSocket Connection Error]");
      setStatus("failed");
    };

    ws.onclose = () => {
      // Check final status
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

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-end">
      <div className="w-[600px] md:w-[750px] h-screen bg-slate-900 border-l border-darkBorder flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 terminal-dark">
        
        {/* Header */}
        <div className="p-4 border-b border-darkBorder flex items-center justify-between bg-slate-900/60 terminal-dark">
          <div className="flex items-center gap-3">
            <TerminalIcon className="w-5 h-5 text-darkAccent" />
            <div>
              <h3 className="font-semibold text-white text-sm">Console Terminal</h3>
              <p className="text-[10px] text-darkTextMuted font-mono select-all">Task ID: {taskId}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            {status === "running" && (
              <span className="flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                Executing
              </span>
            )}
            {status === "success" && (
              <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full font-medium">
                <CheckCircle className="w-3 h-3" />
                Success
              </span>
            )}
            {status === "failed" && (
              <span className="flex items-center gap-1 text-xs text-danger bg-danger/10 px-2 py-0.5 rounded-full font-medium">
                <AlertTriangle className="w-3 h-3" />
                Failed
              </span>
            )}
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-darkTextMuted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Command info banner */}
        {command && (
          <div className="px-6 py-2.5 bg-slate-950 border-b border-darkBorder/40 terminal-dark">
            <p className="text-xs text-darkTextMuted font-semibold">Running Command:</p>
            <p className="text-xs text-slate-300 font-mono mt-0.5 overflow-x-auto whitespace-nowrap bg-slate-900/40 p-1.5 rounded border border-darkBorder/20">
              $ {command}
            </p>
          </div>
        )}

        {/* Logs viewport */}
        <div className="flex-1 bg-slate-950 p-6 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text terminal-dark">
          {logs ? (
            logs
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-darkAccent" />
              Initializing WSL stream...
            </div>
          )}
          <div ref={logEndRef} />
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-darkBorder bg-slate-900/60 flex items-center justify-between text-xs terminal-dark">
          <span className="text-darkTextMuted">Logs automatically update.</span>
          {status === "running" && (
            <button
              onClick={() => {
                fetch(`${API_HOST}/api/processes/tasks/${taskId}/kill`, { method: "POST" })
                  .then((res) => {
                    if (res.ok) setLogs((prev) => prev + "\n[Task terminated by user]\n");
                  });
              }}
              className="px-3 py-1.5 bg-danger text-white font-medium rounded-lg hover:bg-danger/80 transition-colors"
            >
              Kill Command
            </button>
          )}
          {status !== "running" && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-darkBorder text-white font-medium rounded-lg transition-colors"
            >
              Close Console
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
