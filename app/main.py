from fastapi import FastAPI, Request, Depends, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
import os
import time
import asyncio

from app.core.config import settings
from app.core.db import get_db
from app.core.init_db import init_db
from app.modules.sso_module.cookie_signer import verify_cookie

# Import modular routers
from app.modules.quiz.routes.api import router as quiz_api_router
from app.modules.quiz.routes.room import router as room_router
from app.modules.sso_module.routes import router as sso_api_router
from app.modules.notification.routes.api import router as notification_router
from app.modules.stats.routes.api import router as stats_router
from app.modules.auth.routes.api import router as auth_router
from app.modules.admin.routes.api import router as admin_router, ecosystem_sync
from app.modules.gamification.routes.api import router as gamification_router
from app.modules.media.routes import router as media_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on startup
    await init_db()
    
    # Start background reminder scheduler
    from app.modules.notification.services.reminder_scheduler import start_scheduler
    scheduler_task = start_scheduler()

    yield
    
    # Graceful shutdown of scheduler
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="QuizMind API",
    description="A standalone high-scale Quiz system (100% Pure Headless React SPA)",
    version="2.0.0",
    lifespan=lifespan
)

# Static & Templates
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Mount Vite dist specifically if it exists
DIST_DIR = os.path.join(BASE_DIR, "static", "dist")
if os.path.exists(DIST_DIR):
    app.mount("/static/dist", StaticFiles(directory=DIST_DIR), name="dist")
    MASCOT_DIR = os.path.join(DIST_DIR, "mascot")
    if os.path.exists(MASCOT_DIR):
        app.mount("/mascot", StaticFiles(directory=MASCOT_DIR), name="mascot")


# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def clean_user_id_cookie(request: Request, call_next):
    headers = request.scope.get("headers", [])
    cookie_idx = -1
    cookie_val = None
    for i, (k, v) in enumerate(headers):
        if k == b"cookie":
            cookie_idx = i
            cookie_val = v.decode("utf-8", errors="ignore")
            break
            
    if cookie_idx != -1 and cookie_val:
        items = cookie_val.split(";")
        new_items = []
        modified = False
        for item in items:
            parts = item.strip().split("=", 1)
            if len(parts) == 2 and parts[0] == "user_id":
                val = parts[1]
                verified_id = verify_cookie(val, settings.SECRET_KEY)
                if verified_id:
                    new_items.append(f"user_id={verified_id}")
                modified = True
                continue
            new_items.append(item.strip())
            
        if modified:
            new_cookie_str = "; ".join(new_items)
            new_headers = list(headers)
            new_headers[cookie_idx] = (b"cookie", new_cookie_str.encode("utf-8"))
            request.scope["headers"] = new_headers
            if hasattr(request, "_cookies"):
                delattr(request, "_cookies")

    return await call_next(request)


# Include Domain Routers
app.include_router(quiz_api_router, prefix=settings.API_V1_STR)
app.include_router(room_router, prefix=settings.API_V1_STR)
app.include_router(notification_router, prefix=settings.API_V1_STR)
app.include_router(stats_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(gamification_router, prefix=settings.API_V1_STR)
app.include_router(media_router)
app.include_router(sso_api_router)


# --- Ecosystem & Infrastructure Endpoints ---
@app.get("/api/health")
@app.get("/auth-center/callback/health")
async def health_check():
    return {"status": "ok", "service": "QuizMind", "timestamp": time.time()}


@app.post("/api/admin/ecosystem-sync")
async def legacy_ecosystem_sync(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """CentralAuth ecosystem sync endpoint proxy."""
    return await ecosystem_sync(request, data, db)


@app.get("/discover")
async def discover_page():
    """Redirect cleanly to React SPA home tab discover."""
    return RedirectResponse(url="/?tab=discover", status_code=307)


@app.get("/logout")
async def root_logout(request: Request, db: AsyncSession = Depends(get_db)):
    """Clear session cookie and redirect to CentralAuth or home."""
    from app.modules.sso_module.service import SSOService
    sso_config = await SSOService.get_config(db)
    local_only = request.query_params.get("local_only") == "1"
    
    if sso_config.is_enabled and not local_only:
        ca_logout_url = f"{sso_config.server_url.rstrip('/')}/api/auth/logout"
        response = RedirectResponse(url=ca_logout_url, status_code=303)
    else:
        response = RedirectResponse(url="/", status_code=303)
    
    response.delete_cookie("user_id", path="/")
    return response


@app.get("/sw.js")
async def serve_sw():
    sw_path = os.path.join(DIST_DIR, "sw.js")
    if os.path.exists(sw_path):
        return FileResponse(sw_path, media_type="application/javascript")
    return JSONResponse(status_code=404, content={"error": "Not found"})


# --- React SPA Fallback Router ---
@app.get("/")
@app.get("/login")
@app.get("/dashboard")
@app.get("/quiz/{path:path}")
@app.get("/profile")
@app.get("/stats")
@app.get("/settings")
@app.get("/manage")
@app.get("/manage/{path:path}")
@app.get("/quizzes")
@app.get("/quizzes/{path:path}")
@app.get("/library")
@app.get("/library/{path:path}")
@app.get("/room/{path:path}")
@app.get("/admin")
@app.get("/admin/{path:path}")
@app.get("/auth/callback")
async def serve_spa(request: Request, db: AsyncSession = Depends(get_db)):
    # Serve React SPA index.html unconditionally for all frontend paths
    spa_index = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(spa_index):
        return FileResponse(spa_index)
    
    return JSONResponse(
        status_code=404, 
        content={"status": "error", "message": "SPA assets not found. Please compile the Vite frontend client first."}
    )
