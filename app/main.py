import time
import psutil
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, Response, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from config import settings
from database import init_db, check_db_health, record_visit, get_recent_visits
from metrics import (
    HTTP_REQUESTS_TOTAL,
    HTTP_REQUEST_DURATION_SECONDS,
    DB_CONNECTED,
    DB_QUERY_DURATION_SECONDS,
    SIMULATED_LOAD_ACTIVE,
    SIMULATED_LOAD_TOTAL,
    render_metrics
)

START_TIME = time.time()
STRESS_STOP_FLAG = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Try initializing database schema
    await init_db()
    # Check initial DB health
    healthy, latency, _ = await check_db_health()
    DB_CONNECTED.set(1 if healthy else 0)
    DB_QUERY_DURATION_SECONDS.set(latency / 1000.0)
    yield
    # Shutdown logic (if any)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Middleware for metrics and timing
@app.middleware("http")
async def prometheus_metrics_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    endpoint = request.url.path
    # Group static or metric paths to avoid cardinality explosion
    if endpoint.startswith("/static"):
        endpoint_label = "/static/*"
    elif endpoint == "/metrics":
        endpoint_label = "/metrics"
    else:
        endpoint_label = endpoint

    try:
        response = await call_next(request)
        status_code = str(response.status_code)
    except Exception:
        status_code = "500"
        raise
    finally:
        duration = time.perf_counter() - start_time
        HTTP_REQUESTS_TOTAL.labels(
            method=request.method,
            endpoint=endpoint_label,
            status_code=status_code
        ).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(
            method=request.method,
            endpoint=endpoint_label
        ).observe(duration)

    return response

# Helper function to gather real-time status
async def get_system_telemetry() -> dict:
    uptime_seconds = int(time.time() - START_TIME)
    db_healthy, db_latency_ms, db_msg = await check_db_health()
    DB_CONNECTED.set(1 if db_healthy else 0)
    DB_QUERY_DURATION_SECONDS.set(db_latency_ms / 1000.0)
    
    cpu_percent = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()

    recent = await get_recent_visits(5)

    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "uptime_seconds": uptime_seconds,
        "uptime_formatted": f"{uptime_seconds // 3600}h {(uptime_seconds % 3600) // 60}m {uptime_seconds % 60}s",
        "pod": {
            "name": settings.POD_NAME,
            "ip": settings.POD_IP,
            "node": settings.NODE_NAME,
            "namespace": settings.NAMESPACE
        },
        "database": {
            "healthy": db_healthy,
            "latency_ms": db_latency_ms,
            "status_message": db_msg,
            "host": settings.DB_HOST,
            "name": settings.DB_NAME,
            "recent_visits": recent
        },
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": mem.percent,
            "memory_used_mb": round(mem.used / (1024 * 1024), 1),
            "memory_total_mb": round(mem.total / (1024 * 1024), 1)
        }
    }

@app.api_route("/", methods=["GET", "HEAD"], response_class=HTMLResponse)
async def dashboard(request: Request):
    telemetry = await get_system_telemetry()
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"data": telemetry}
    )

@app.api_route("/health", methods=["GET", "HEAD"])
@app.api_route("/healthz", methods=["GET", "HEAD"])
async def healthz():
    """Kubernetes liveness and readiness probe"""
    db_healthy, db_latency_ms, db_msg = await check_db_health()
    DB_CONNECTED.set(1 if db_healthy else 0)
    DB_QUERY_DURATION_SECONDS.set(db_latency_ms / 1000.0)
    status = "healthy" if db_healthy else "degraded"
    status_code = 200  # Return 200 so pod stays alive even during DB warmup/maintenance
    return JSONResponse(
        status_code=status_code,
        content={
            "status": status,
            "pod": settings.POD_NAME,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": {
                "connected": db_healthy,
                "latency_ms": db_latency_ms,
                "message": db_msg
            }
        }
    )

@app.get("/api/status")
async def api_status():
    """Live JSON telemetry endpoint for frontend polling"""
    telemetry = await get_system_telemetry()
    return telemetry

@app.get("/api/db-records")
async def api_db_records(limit: int = 5):
    """Fetches recent database visit records"""
    records = await get_recent_visits(limit)
    return {"records": records}

@app.post("/api/db-query")
async def api_db_query(request: Request):
    """Executes real read/write transaction on PostgreSQL to demonstrate DB integration"""
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "unknown")
    result = await record_visit(client_ip=client_ip, user_agent=user_agent)
    return result

# Background load simulator for testing CPU/RAM alerts (> 80%)
def run_cpu_ram_stress(duration_seconds: int = 45):
    global STRESS_STOP_FLAG
    STRESS_STOP_FLAG = False
    SIMULATED_LOAD_ACTIVE.set(1)
    SIMULATED_LOAD_TOTAL.inc()
    try:
        end_time = time.time() + duration_seconds
        mem_buffer = bytearray(220 * 1024 * 1024)
        while time.time() < end_time and not STRESS_STOP_FLAG:
            _ = [x ** 2 for x in range(200000)]
        del mem_buffer
    finally:
        SIMULATED_LOAD_ACTIVE.set(0)

class LoadRequest(BaseModel):
    duration_seconds: int = 45

@app.post("/api/simulate-load")
async def simulate_load(payload: LoadRequest, background_tasks: BackgroundTasks):
    """Simulates CPU & Memory usage spike to test Prometheus > 80% alerting rules"""
    duration = min(max(payload.duration_seconds, 10), 120)
    background_tasks.add_task(run_cpu_ram_stress, duration)
    return {
        "success": True,
        "message": f"Simulated CPU & RAM load initiated for {duration} seconds. Watch Prometheus & Grafana react!",
        "duration_seconds": duration
    }

@app.post("/api/stop-load")
async def stop_load():
    """Emergency halt for simulated load testing"""
    global STRESS_STOP_FLAG
    STRESS_STOP_FLAG = True
    SIMULATED_LOAD_ACTIVE.set(0)
    return {
        "success": True,
        "message": "Simulated load testing halted immediately."
    }

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint scraped by kube-prometheus-stack"""
    data, content_type = render_metrics()
    return Response(content=data, media_type=content_type)
