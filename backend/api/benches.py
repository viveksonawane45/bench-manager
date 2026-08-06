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
    
    # Check if we need to patch version-16 due to Python 3.12 compatibility
    if req.version == "version-16":
        import pathlib
        import subprocess
        import re
        import shutil
        
        temp_repo_path = f"/tmp/frappe-v16-{int(time.time())}"
        try:
            # 1. Clone
            subprocess.run(
                ["git", "clone", "--depth", "1", "--branch", "version-16", 
                 "https://github.com/frappe/frappe.git", temp_repo_path],
                check=True,
                capture_output=True
            )
            
            # 2. Patch pyproject.toml
            pyproject_path = pathlib.Path(temp_repo_path) / "pyproject.toml"
            if pyproject_path.exists():
                content = pyproject_path.read_text(encoding="utf-8")
                content = re.sub(r'requires-python\s*=\s*".*"', 'requires-python = ">=3.10"', content)
                pyproject_path.write_text(content, encoding="utf-8")
                
            # 3. Patch python files for annotations
            for p in pathlib.Path(temp_repo_path).rglob("*.py"):
                try:
                    content = p.read_text(encoding="utf-8")
                    if '" | ' in content or "' | " in content:
                        if "from __future__ import annotations" not in content:
                            p.write_text("from __future__ import annotations\n" + content, encoding="utf-8")
                except Exception:
                    pass
                    
            # 4. Patch frappe/__init__.py for uuid7 fallback
            init_path = pathlib.Path(temp_repo_path) / "frappe" / "__init__.py"
            if init_path.exists():
                content = init_path.read_text(encoding="utf-8")
                if "def fallback_uuid7" not in content:
                    patch = """
# Monkeypatch uuid.uuid7 for Python < 3.14
import uuid
if not hasattr(uuid, 'uuid7'):
    import os
    import time
    def fallback_uuid7() -> uuid.UUID:
        timestamp_ms = int(time.time() * 1000)
        rand_a = os.urandom(2)
        rand_a_val = (int.from_bytes(rand_a, byteorder="big") & 0x0FFF) | 0x7000
        rand_b = os.urandom(8)
        rand_b_val = (int.from_bytes(rand_b, byteorder="big") & 0x3FFFFFFFFFFFFFFF) | 0x8000000000000000
        uuid_int = (timestamp_ms << 80) | (rand_a_val << 64) | rand_b_val
        return uuid.UUID(int=uuid_int)
    uuid.uuid7 = fallback_uuid7
"""
                    pos = content.find("from __future__ import annotations")
                    if pos != -1:
                        end_line = content.find("\n", pos) + 1
                        new_content = content[:end_line] + patch + content[end_line:]
                    else:
                        new_content = patch + content
                    init_path.write_text(new_content, encoding="utf-8")
                    
            # 5. Git Commit
            subprocess.run(["git", "-C", temp_repo_path, "config", "user.email", "installer@bench.manager"], check=True, capture_output=True)
            subprocess.run(["git", "-C", temp_repo_path, "config", "user.name", "Bench Manager"], check=True, capture_output=True)
            subprocess.run(["git", "-C", temp_repo_path, "commit", "-am", "Patch python version requirements, postponed annotations, and uuid7 fallback"], check=True, capture_output=True)
            
        except Exception as e:
            if os.path.exists(temp_repo_path):
                shutil.rmtree(temp_repo_path, ignore_errors=True)
            raise HTTPException(status_code=500, detail=f"Failed to clone and patch Frappe v16: {str(e)}")
            
        # Build command utilizing the local patched repository
        cmd_parts = [
            'export PATH="/home/frappe/.local/bin:$PATH"',
            ";",
            f"bench init --frappe-path {temp_repo_path} --frappe-branch version-16",
            req.name
        ]
        if req.python:
            cmd_parts.extend(["--python", req.python])
            
        cmd = " ".join(cmd_parts) + f" ; rm -rf {temp_repo_path}"
    else:
        # Standard build command
        cmd_parts = ["export PATH=$PATH:/home/frappe/.local/bin", ";", "bench init", req.name]
        if req.version:
            cmd_parts.extend(["--frappe-branch", req.version])
        if req.python:
            cmd_parts.extend(["--python", req.python])
            
        cmd = " ".join(cmd_parts)
    
    def on_bench_created():
        try:
            BenchService.ensure_bench_ports(bench_path, base_dir=base_dir)
        except Exception:
            pass
        BenchService.open_ide(bench_path)

    # Run async command from base directory with on_success callback to configure ports & open IDE
    BenchService.run_async_command(
        task_id, 
        cmd, 
        base_dir, 
        on_success=on_bench_created
    )
    
    return {"status": "creating", "task_id": task_id, "bench_path": bench_path}

class BenchActionRequest(BaseModel):
    bench_path: str

class BatchActionRequest(BaseModel):
    bench_paths: List[str]
    action: str  # start, stop, migrate, clear-cache, update, build, doctor

@router.post("/update")
async def update_bench(req: UpdateBenchRequest):
    """
    Runs 'bench update' asynchronously for the specified bench.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    task_id = f"bench_update_{int(time.time())}"
    cmd = "bench update"
    
    BenchService.run_async_command(task_id, cmd, req.bench_path)
    return {"status": "updating", "task_id": task_id}

@router.post("/clear-cache")
async def clear_cache_bench(req: BenchActionRequest):
    """
    Runs 'bench clear-cache' asynchronously for the specified bench.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    task_id = BenchService.clear_cache_bench(req.bench_path)
    return {"status": "clearing_cache", "task_id": task_id}

@router.post("/migrate")
async def migrate_bench(req: BenchActionRequest):
    """
    Runs 'bench migrate' asynchronously across sites in the specified bench.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    task_id = BenchService.migrate_bench(req.bench_path)
    return {"status": "migrating", "task_id": task_id}

@router.post("/build")
async def build_bench(req: BenchActionRequest):
    """
    Runs 'bench build' asynchronously to compile frontend asset bundles.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    task_id = BenchService.build_bench(req.bench_path)
    return {"status": "building", "task_id": task_id}

@router.post("/restart")
async def restart_bench(req: BenchActionRequest):
    """
    Restarts background bench workers and services.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    task_id = BenchService.restart_bench(req.bench_path)
    return {"status": "restarting", "task_id": task_id}

@router.post("/doctor")
async def doctor_bench(req: BenchActionRequest):
    """
    Runs 'bench doctor' to check environment health.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    task_id = BenchService.doctor_bench(req.bench_path)
    return {"status": "running_doctor", "task_id": task_id}

@router.post("/batch-action")
async def batch_action(req: BatchActionRequest):
    """
    Executes a batch command (start, stop, migrate, clear-cache, update, build) across multiple benches.
    """
    if not req.bench_paths:
        raise HTTPException(status_code=400, detail="No benches provided for batch action")
        
    task_id = BenchService.run_batch_command(req.bench_paths, req.action)
    return {"status": "running_batch", "task_id": task_id}

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

