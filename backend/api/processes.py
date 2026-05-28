import time
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.bench_service import BenchService, process_registry

router = APIRouter(prefix="/processes", tags=["Processes"])

class BenchStateRequest(BaseModel):
    bench_path: str

@router.post("/start")
async def start_bench(req: BenchStateRequest):
    """
    Starts the bench using 'bench start' in the background.
    """
    try:
        task_id = BenchService.start_bench(req.bench_path)
        # Automatically launch Antigravity IDE in a new remote window when started
        BenchService.open_ide(req.bench_path, reuse_window=False)
        return {"status": "starting", "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
async def stop_bench(req: BenchStateRequest):
    """
    Stops all processes running in the bench directory.
    """
    try:
        stopped = BenchService.stop_bench(req.bench_path)
        return {"status": "stopped" if stopped else "not_running"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks")
async def list_tasks():
    """
    Lists all background tasks.
    """
    return process_registry.get_all()

@router.get("/tasks/{task_id}")
async def get_task_details(task_id: str):
    """
    Retrieves full details including stdout logs for a specific background task.
    """
    task = process_registry.get_process(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/tasks/{task_id}/kill")
async def kill_task(task_id: str):
    """
    Cancels a running background task.
    """
    killed = process_registry.kill_process(task_id)
    if not killed:
        raise HTTPException(status_code=400, detail="Task is not running or could not be terminated")
    return {"status": "killed"}
