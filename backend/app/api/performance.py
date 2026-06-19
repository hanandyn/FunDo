"""Performance monitoring API endpoint."""

import time
import os
import psutil
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1/health", tags=["health"])


class RequestTimingMiddleware:
    """ASGI middleware to log slow requests (>500ms). Injected at app level."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.monotonic()

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                elapsed_ms = round((time.monotonic() - start) * 1000, 2)
                if elapsed_ms > 500:
                    path = scope.get("path", "?")
                    method = scope.get("method", "?")
                    print(f"⚠️  SLOW REQUEST: {method} {path} — {elapsed_ms}ms", flush=True)
                # Attach timing header
                message.setdefault("headers", []).append(
                    (b"x-response-time-ms", str(elapsed_ms).encode())
                )
            await send(message)

        await self.app(scope, receive, send_wrapper)


@router.get("/performance")
async def performance_metrics():
    """Returns performance metrics: response times, DB stats, memory usage."""

    # Memory usage
    try:
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        memory_mb = round(mem_info.rss / (1024 * 1024), 2)
        cpu_percent = round(process.cpu_percent(interval=0.1), 2)
    except Exception:
        memory_mb = None
        cpu_percent = None

    # Python version
    import sys
    py_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

    return {
        "server": {
            "python_version": py_version,
            "pid": os.getpid(),
            "uptime_seconds": round(time.monotonic()),
        },
        "resources": {
            "memory_rss_mb": memory_mb,
            "cpu_percent": cpu_percent,
        },
        "endpoints": {
            "health": "/api/v1/health",
            "detailed_health": "/api/v1/health/detailed",
            "performance": "/api/v1/health/performance",
        },
        "settings": {
            "slow_request_threshold_ms": 500,
        },
    }
