from fastapi import APIRouter, HTTPException
from services.system_service import SystemService

router = APIRouter(prefix="/system", tags=["System"])

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
