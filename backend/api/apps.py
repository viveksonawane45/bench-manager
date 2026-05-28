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
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")

    task_id = f"app_get_{int(time.time())}"
    
    # Construct command
    cmd_parts = ["export PATH=$PATH:/home/frappe/.local/bin", ";", "bench get-app", req.app_name_or_url]
    if req.branch:
        cmd_parts.extend(["--branch", req.branch])
        
    cmd = " ".join(cmd_parts)
    BenchService.run_async_command(task_id, cmd, req.bench_path)
    
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
