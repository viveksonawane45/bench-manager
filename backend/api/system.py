from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.system_service import SystemService

router = APIRouter(prefix="/system", tags=["System"])

class InstallRequest(BaseModel):
    dependency: str

@router.get("/stats")
async def get_system_stats():
    """
    Returns live system resource utilization and service statuses.
    """
    try:
        stats = SystemService.get_system_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check")
async def check_system_dependencies():
    """
    Checks status of all dependent tools and services.
    """
    try:
        checks = SystemService.check_dependencies()
        return checks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check/wsl")
async def check_wsl():
    try:
        checks = SystemService.check_dependencies()
        return checks.get("wsl", {"installed": False, "version": None})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check/ubuntu")
async def check_ubuntu():
    try:
        checks = SystemService.check_dependencies()
        return checks.get("ubuntu", {"installed": False, "version": None})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check/python")
async def check_python():
    try:
        checks = SystemService.check_dependencies()
        return checks.get("python", {"installed": False, "version": None})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/install")
async def install_dependency(req: InstallRequest):
    """
    Launches async installer task for a missing dependency.
    """
    try:
        task_id = SystemService.install_dependency(req.dependency)
        return {"status": "installing", "task_id": task_id}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

