# Bench Manager Dashboard

A modern dashboard for managing local Frappe/ERPNext benches and sites running inside Windows Subsystem for Linux (WSL2).

---

## 🚀 Getting Started

To run the application, you need to start both the **Backend** (running in WSL) and the **Frontend** (running on the Windows host or WSL).

### 1. Backend Server (FastAPI)

The backend interacts directly with WSL to manage Frappe benches, so it must be executed within your WSL environment.

#### **Option A: Start from Windows Terminal (via WSL command)**
Open PowerShell or Command Prompt on Windows and run:
```bash
wsl -d Ubuntu -- bash -c "cd /mnt/c/Users/sonaw/.gemini/antigravity-ide/scratch/bench-manager/backend && ./venv/bin/python -m uvicorn main:app --port 8005 --host 0.0.0.0"
```

#### **Option B: Start from inside WSL**
Open your WSL terminal and run:
```bash
cd /mnt/c/Users/sonaw/.gemini/antigravity-ide/scratch/bench-manager/backend
./venv/bin/python -m uvicorn main:app --port 8005 --host 0.0.0.0
```

*The backend API will be available at **`http://localhost:8005`**.*

---

### 2. Frontend Development Server (React + Vite)

The frontend can be run directly on your Windows host.

Open a new terminal window on Windows, navigate to the `frontend` folder, and start the development server:
```bash
cd frontend
npm run dev
```

*The frontend dashboard will be available at **`http://localhost:5173`**.*

---

## 📁 Project Structure

* **`backend/`**: FastAPI python server containing WSL integration APIs for managing process registry, Frappe benches, and site proxies.
* **`frontend/`**: React, Vite, and Tailwind CSS app providing a modern UI dashboard to view and control benches, sites, and logs.

---

## 🛠️ Prerequisites

* Windows 10/11 with **WSL2** (Ubuntu distro)
* **Python 3.10+** (installed inside WSL)
* **Node.js v18+** (installed on the Windows host or WSL)