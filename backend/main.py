import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from api.system import router as system_router
from api.processes import router as processes_router
from api.benches import router as benches_router
from api.sites import router as sites_router
from api.apps import router as apps_router
from services.bench_service import process_registry

app = FastAPI(
    title="Bench Manager Dashboard API",
    description="API for managing local Frappe/ERPNext benches in WSL",
    version="1.0.0"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local ease, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(system_router, prefix="/api")
app.include_router(processes_router, prefix="/api")
app.include_router(benches_router, prefix="/api")
app.include_router(sites_router, prefix="/api")
app.include_router(apps_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    # Pre-start all site proxies on startup
    try:
        from services.bench_service import BenchService
        benches = BenchService.discover_benches("/home/frappe")
        for b in benches:
            BenchService.get_sites(b["path"])
    except Exception as e:
        print(f"Error pre-starting proxies on startup: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    # Stop all site proxies on shutdown
    try:
        from services.proxy_service import proxy_manager
        await proxy_manager.stop_all()
    except Exception as e:
        print(f"Error stopping proxies on shutdown: {e}")

@app.get("/")
async def root():
    return {
        "message": "Bench Manager Dashboard API is running",
        "system": "WSL Integration"
    }

@app.websocket("/ws/logs/{task_id}")
async def websocket_logs_endpoint(websocket: WebSocket, task_id: str):
    """
    WebSocket endpoint for real-time streaming of task logs.
    """
    await websocket.accept()
    last_len = 0
    try:
        while True:
            task = process_registry.get_process(task_id)
            if not task:
                await websocket.send_text("Error: Task not found")
                break
            
            logs = task["logs"]
            if len(logs) > last_len:
                new_logs = logs[last_len:]
                await websocket.send_text(new_logs)
                last_len = len(logs)
                
            if task["status"] != "running":
                # Ensure we push any final changes
                task_latest = process_registry.get_process(task_id)
                logs_latest = task_latest["logs"]
                if len(logs_latest) > last_len:
                    await websocket.send_text(logs_latest[last_len:])
                
                # Send closing signal message
                await websocket.send_text(
                    f"\n\r[Process finished with exit code {task_latest['exit_code']} and status: {task_latest['status'].upper()}]"
                )
                break
                
            await asyncio.sleep(0.15)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(f"\nConnection Error: {str(e)}")
        except Exception:
            pass
