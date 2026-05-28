import os
import time
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from services.bench_service import BenchService

router = APIRouter(prefix="/benches", tags=["Benches"])

class CreateBenchRequest(BaseModel):
    name: str
    version: Optional[str] = "version-15" # e.g. version-15, version-14, develop
    python: Optional[str] = None # custom python path

class UpdateBenchRequest(BaseModel):
    bench_path: str

@router.get("")
async def list_benches(base_dir: str = "/home/frappe"):
    """
    Scans base_dir and returns detailed metadata for all discovered benches.
    """
    try:
        benches = BenchService.discover_benches(base_dir)
        return benches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create")
async def create_bench(req: CreateBenchRequest, base_dir: str = "/home/frappe"):
    """
    Initializes a new Frappe bench asynchronously using 'bench init'.
    """
    if not req.name.isalnum() and "_" not in req.name and "-" not in req.name:
        raise HTTPException(status_code=400, detail="Bench name must be alphanumeric, dashes, or underscores.")
    
    bench_path = os.path.join(base_dir, req.name)
    if os.path.exists(bench_path):
        raise HTTPException(status_code=400, detail="A directory with this name already exists.")

    task_id = f"bench_init_{int(time.time())}"
    
    # Construct CLI command
    cmd_parts = ["export PATH=$PATH:/home/frappe/.local/bin", ";", "bench init", req.name]
    if req.version:
        cmd_parts.extend(["--frappe-branch", req.version])
    if req.python:
        cmd_parts.extend(["--python", req.python])
        
    cmd = " ".join(cmd_parts)
    
    # Run async command from base directory with on_success callback to open IDE
    BenchService.run_async_command(
        task_id, 
        cmd, 
        base_dir, 
        on_success=lambda: BenchService.open_ide(bench_path)
    )
    
    return {"status": "creating", "task_id": task_id, "bench_path": bench_path}

@router.post("/update")
async def update_bench(req: UpdateBenchRequest):
    """
    Runs 'bench update' asynchronously for the specified bench.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    task_id = f"bench_update_{int(time.time())}"
    cmd = "export PATH=$PATH:/home/frappe/.local/bin; bench update"
    
    BenchService.run_async_command(task_id, cmd, req.bench_path)
    return {"status": "updating", "task_id": task_id}

@router.delete("/{name}")
async def delete_bench(name: str, base_dir: str = "/home/frappe"):
    """
    Deletes the bench directory. Asynchronous command for safety.
    """
    bench_path = os.path.join(base_dir, name)
    if not os.path.exists(bench_path) or not BenchService.is_bench_directory(bench_path):
        raise HTTPException(status_code=404, detail="Bench not found or is invalid")

    # Double check if running
    if BenchService.is_bench_running(bench_path):
        raise HTTPException(status_code=400, detail="Cannot delete a running bench. Please stop it first.")

    task_id = f"bench_delete_{int(time.time())}"
    # Secure clean deletion
    cmd = f"rm -rf {bench_path}"
    
    BenchService.run_async_command(task_id, cmd, base_dir)
    return {"status": "deleting", "task_id": task_id}

class OpenIdeRequest(BaseModel):
    bench_path: str

@router.post("/open-ide")
async def open_ide(req: OpenIdeRequest):
    """
    Opens the specified bench directory in the Antigravity IDE platform.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    success = BenchService.open_ide(req.bench_path, reuse_window=True)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to open Antigravity IDE")
    return {"status": "success"}
