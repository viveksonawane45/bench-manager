import os
import time
import asyncio
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from services.bench_service import BenchService
from services.proxy_service import proxy_manager

router = APIRouter(prefix="/sites", tags=["Sites"])

class CreateSiteRequest(BaseModel):
    bench_path: str
    site_name: str
    admin_password: str
    mariadb_root_password: Optional[str] = ""
    port: Optional[int] = None  # optional port for proxy

class DropSiteRequest(BaseModel):
    bench_path: str
    site_name: str

class InstallAppRequest(BaseModel):
    bench_path: str
    site_name: str
    app_name: str

class UninstallAppRequest(BaseModel):
    bench_path: str
    site_name: str
    app_name: str

class BackupSiteRequest(BaseModel):
    bench_path: str
    site_name: str

class RestoreSiteRequest(BaseModel):
    bench_path: str
    site_name: str
    backup_file: str  # just the filename in the private/backups directory

@router.get("")
async def get_sites(bench_path: str):
    """
    Returns list of sites inside the bench.
    """
    if not os.path.exists(bench_path):
        raise HTTPException(status_code=404, detail="Bench not found")
    return BenchService.get_sites(bench_path)

@router.post("/create")
async def create_site(req: CreateSiteRequest):
    """
    Creates a new site using 'bench new-site' asynchronously.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")

    task_id = f"site_create_{int(time.time())}"
    
    # Construct CLI command
    cmd_parts = [
        "export PATH=$PATH:/home/frappe/.local/bin",
        ";",
        "bench new-site",
        req.site_name,
        f"--admin-password '{req.admin_password}'",
    ]
    if req.mariadb_root_password:
        cmd_parts.append(f"--db-root-password '{req.mariadb_root_password}'")
    else:
        cmd_parts.append("--db-root-password 'root'") # fallback default root db pw if empty

    cmd_parts.append("--mariadb-user-host-login-scope='%'")
    cmd_parts.append("--force")  # allow re-creating existing sites
    
    cmd = " ".join(cmd_parts)
    BenchService.run_async_command(task_id, cmd, req.bench_path)
    
    # If a specific port is requested, start the proxy for this site
    if req.port:
        # Start proxy in background; does not wait for bench command to finish
        asyncio.create_task(proxy_manager.start_proxy_for_site(req.port, req.site_name))
    
    return {"status": "creating", "task_id": task_id}

@router.post("/drop")
async def drop_site(req: DropSiteRequest):
    """
    Drops/Deletes a site using 'bench drop-site' asynchronously.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    task_id = f"site_drop_{int(time.time())}"
    
    pwd_flag = f"--root-password '{req.mariadb_root_password}'" if req.mariadb_root_password else "--root-password 'root'"
    # Force drop site with non-interactive root password
    cmd = f"export PATH=$PATH:/home/frappe/.local/bin; bench drop-site {req.site_name} --force {pwd_flag}"
    
    BenchService.run_async_command(task_id, cmd, req.bench_path)
    return {"status": "dropping", "task_id": task_id}

@router.post("/install-app")
async def install_app(req: InstallAppRequest):
    """
    Installs a frappe app to a site.
    Uses --force to handle re-installation and partial install recovery.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    task_id = f"site_install_app_{int(time.time())}"
    cmd = f"export PATH=$PATH:/home/frappe/.local/bin; bench --site {req.site_name} install-app {req.app_name} --force"
    
    BenchService.clear_site_apps_cache(req.bench_path, req.site_name)
    BenchService.run_async_command(
        task_id,
        cmd,
        req.bench_path,
        on_success=lambda: BenchService.clear_site_apps_cache(req.bench_path, req.site_name)
    )
    return {"status": "installing", "task_id": task_id}

@router.post("/uninstall-app")
async def uninstall_app(req: UninstallAppRequest):
    """
    Uninstalls a frappe app from a site.
    Uses --yes to bypass confirmation prompt.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    task_id = f"site_uninstall_app_{int(time.time())}"
    cmd = f"export PATH=$PATH:/home/frappe/.local/bin; bench --site {req.site_name} uninstall-app {req.app_name} --yes"
    
    BenchService.clear_site_apps_cache(req.bench_path, req.site_name)
    BenchService.run_async_command(
        task_id,
        cmd,
        req.bench_path,
        on_success=lambda: BenchService.clear_site_apps_cache(req.bench_path, req.site_name)
    )
    return {"status": "uninstalling", "task_id": task_id}

@router.post("/backup")
async def backup_site(req: BackupSiteRequest):
    """
    Backs up a site.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    task_id = f"site_backup_{int(time.time())}"
    cmd = f"export PATH=$PATH:/home/frappe/.local/bin; bench --site {req.site_name} backup"
    
    BenchService.run_async_command(task_id, cmd, req.bench_path)
    return {"status": "backing_up", "task_id": task_id}

@router.get("/backups")
async def list_backups(bench_path: str, site_name: str):
    """
    Lists backup files for a specific site.
    """
    backups_dir = os.path.join(bench_path, "sites", site_name, "private", "backups")
    backups = []
    
    if not os.path.exists(backups_dir):
        return backups

    try:
        for file in os.listdir(backups_dir):
            file_path = os.path.join(backups_dir, file)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                backups.append({
                    "filename": file,
                    "size": stat.st_size,
                    "created_at": stat.st_mtime
                })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # Sort by created_at desc
    backups.sort(key=lambda x: x["created_at"], reverse=True)
    return backups

@router.post("/restore")
async def restore_site(req: RestoreSiteRequest):
    """
    Restores site database from backup file.
    """
    if not os.path.exists(req.bench_path):
        raise HTTPException(status_code=404, detail="Bench path not found")
        
    backup_full_path = os.path.join(req.bench_path, "sites", req.site_name, "private", "backups", req.backup_file)
    if not os.path.exists(backup_full_path):
        raise HTTPException(status_code=400, detail="Backup file not found")

    task_id = f"site_restore_{int(time.time())}"
    cmd = f"export PATH=$PATH:/home/frappe/.local/bin; bench --site {req.site_name} restore {backup_full_path} --force"
    
    BenchService.run_async_command(task_id, cmd, req.bench_path)
    return {"status": "restoring", "task_id": task_id}
