import os
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.bench_service import BenchService

router = APIRouter(prefix="/apps", tags=["Apps"])

class GetAppRequest(BaseModel):
    bench_path: str
    app_name_or_url: str  # e.g., 'erpnext' or 'https://github.com/frappe/erpnext'
    branch: Optional[str] = None

class RemoveAppRequest(BaseModel):
    bench_path: str
    app_name: str

@router.get("")
async def get_apps(bench_path: str):
    """
    Returns list of installed apps and details inside the bench.
    """
    if not os.path.exists(bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
    return BenchService.get_apps(bench_path)

@router.post("/get")
async def get_app(req: GetAppRequest):
    """
    Clones/Downloads a Frappe app using 'bench get-app' asynchronously.
    Includes a self-healing fallback that handles:
    - requires-python >= 3.14 constraint (patched to >= 3.10)
    - Missing flit_core build backend
    - Broken apps.txt (missing newlines)
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")

    task_id = f"app_get_{int(time.time())}"
    
    # Extract app folder name from URL or shorthand
    app_name = req.app_name_or_url.split("/")[-1].replace(".git", "").strip()
    
    # Determine the git clone URL
    if req.app_name_or_url.startswith("http") or req.app_name_or_url.startswith("git@"):
        git_url = req.app_name_or_url
    else:
        git_url = f"https://github.com/frappe/{app_name}.git"
    
    branch_flag = f"--branch {req.branch}" if req.branch else ""
    
    # Build a robust shell script that tries bench get-app first,
    # then falls back to manual clone + patch + pip install
    recovery_script = f"""
export PATH="$PATH:/home/frappe/.local/bin"
cd {req.bench_path}

echo "=== Attempting bench get-app ==="
bench get-app {req.app_name_or_url} {branch_flag} && echo "SUCCESS" && exit 0

echo ""
echo "=== bench get-app failed, starting self-healing recovery ==="

# Step 1: Clone the app if not already present
APP_DIR="./apps/{app_name}"
if [ ! -d "$APP_DIR" ]; then
    echo "Cloning {app_name}..."
    git clone {git_url} {branch_flag} --depth 1 --origin upstream "$APP_DIR"
fi

# Step 2: Patch pyproject.toml to relax Python version constraint
PYPROJECT="$APP_DIR/pyproject.toml"
if [ -f "$PYPROJECT" ]; then
    echo "Patching pyproject.toml (requires-python)..."
    sed -i 's/requires-python = ">=3.14"/requires-python = ">=3.10"/' "$PYPROJECT"
    sed -i 's/requires-python = ">=3.13"/requires-python = ">=3.10"/' "$PYPROJECT"
    grep "requires-python" "$PYPROJECT"
fi

# Step 3: Install flit_core build backend if missing
echo "Ensuring flit_core is installed..."
./env/bin/pip install flit_core --quiet 2>/dev/null

# Step 4: Fix apps.txt — ensure each app is on its own line
APPS_TXT="./sites/apps.txt"
if [ -f "$APPS_TXT" ]; then
    # Ensure file ends with a newline before appending
    [ -n "$(tail -c 1 "$APPS_TXT")" ] && echo "" >> "$APPS_TXT"
fi
if ! grep -qx "{app_name}" "$APPS_TXT" 2>/dev/null; then
    echo "{app_name}" >> "$APPS_TXT"
    echo "Added {app_name} to apps.txt"
fi

# Step 5: Install with pip
echo "Installing {app_name} with pip..."
./env/bin/pip install -e "$APP_DIR" --quiet

echo ""
echo "=== Recovery complete ==="
./env/bin/pip show {app_name}
"""
    
    BenchService.run_async_command(task_id, recovery_script, req.bench_path)
    
    return {"status": "fetching", "task_id": task_id}

@router.post("/remove")
async def remove_app(req: RemoveAppRequest):
    """
    Removes a Frappe app from the bench.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")

    task_id = f"app_remove_{int(time.time())}"
    cmd = f"export PATH=$PATH:/home/frappe/.local/bin; bench remove-app {req.app_name} --force"
    
    BenchService.run_async_command(task_id, cmd, req.bench_path)
    return {"status": "removing", "task_id": task_id}
