# Bench Manager Dashboard

A modern, high-performance web dashboard for managing local Frappe/ERPNext benches, sites, custom apps, and background processes running inside Windows Subsystem for Linux (WSL2).

---

## 🚀 Quick Start Guide

To run the application, start both the **Backend API** (in WSL) and the **Frontend Dashboard** (on Windows).

---

### 1️⃣ Backend Server (FastAPI / Python)

> [!IMPORTANT]
> Because you are running PowerShell on Windows (`PS C:\Users\...`), you MUST use the `wsl` command prefix. Do NOT run Linux `cd /mnt/c/...` commands directly in PowerShell!

#### 🪟 **If you are in Windows PowerShell or CMD (RECOMMENDED)**
Copy and paste this **single 1-line command** directly into your PowerShell terminal:

```powershell
wsl -d Ubuntu -- bash -c "fuser -k 8005/tcp 2>/dev/null; cd /mnt/c/Users/sonaw/.gemini/antigravity-ide/scratch/bench-manager/backend && ./venv/bin/python -m uvicorn main:app --port 8005 --host 0.0.0.0"
```

---

#### 🐧 **If you are inside WSL Ubuntu Terminal** *(Only if you ran `wsl` first)*
If you first opened an Ubuntu/WSL terminal prompt (`frappe@WSL:~$`), run:

```bash
fuser -k 8005/tcp 2>/dev/null
cd /mnt/c/Users/sonaw/.gemini/antigravity-ide/scratch/bench-manager/backend
./venv/bin/python -m uvicorn main:app --port 8005 --host 0.0.0.0
```

*Backend API will be live at: **`http://localhost:8005`***

---

### 2️⃣ Frontend Server (React + Vite)

#### 🪟 **From Windows PowerShell**
Open a new PowerShell window and run:

```powershell
cd c:\Users\sonaw\.gemini\antigravity-ide\scratch\bench-manager\frontend
npm run dev
```

*Frontend Dashboard will be live at: **`http://localhost:5173`***

---

## ✨ Key Features

- ⚡ **Multi-Bench Operations**: Concurrent selection & batch commands (`Start`, `Stop`, `Migrate`, `Clear Cache`, `Build`, `Update`).
- 🛠️ **Direct Bench Actions**: Per-bench trigger buttons for `bench clear-cache`, `bench migrate`, `bench build`, `bench restart`, and `bench doctor`.
- 💻 **Dockable Terminal Drawer**: Right-side drawer with minimize/dock pill widget, real-time keyword search, log copy, export file, and auto-scroll.
- 🎨 **Light & Dark Theme**: Glassmorphism UI with light slate background, card styling, and font hierarchy (`Inter`, `Outfit`, `Fira Code`).

---

## 📁 Directory Structure

```text
bench-manager/
├── backend/                  # FastAPI Python backend (WSL integration & proxies)
│   ├── main.py               # Application entry point & WebSocket log handler
│   ├── services/             # Bench service, process manager, and proxy service
│   └── api/                  # REST API routes (/benches, /sites, /apps, /processes)
├── frontend/                 # React + Vite + Tailwind CSS frontend
│   ├── src/pages/            # Dashboard, BenchManager, SiteManager, AppManager
│   └── src/components/       # Dockable TerminalDrawer, Navbar, Sidebar
└── README.md                 # Setup guide and instructions
```

---

## 🛠️ System Prerequisites

* **Windows 10/11** with **WSL2** (Ubuntu distribution)
* **Python 3.10+** (installed inside WSL virtual environment `backend/venv`)
* **Node.js v18+** & **npm** (installed on Windows host or WSL)
* **Frappe Bench CLI** installed at `/home/frappe/.local/bin/bench`