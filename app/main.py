from fastapi import FastAPI, Request, Depends, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from app.core.config import settings
from app.modules.auth.models import User
from app.modules.auth.services.central_auth_client import CentralAuthClient
from app.core.db import get_db, engine, Base
from app.core.init_db import init_db
from app.modules.stats.services.analytics_service import AnalyticsService
from app.modules.quiz.services.quiz_service import QuizService
from app.modules.auth.services.auth_service import AuthService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, Integer
from contextlib import asynccontextmanager
import os
import httpx
import time
import asyncio

# Cache for CentralAuth health status
CA_HEALTH_CACHE = {"status": False, "last_check": 0}
CA_CHECK_INTERVAL = 60 # Check every 60 seconds

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on startup
    await init_db()
    yield

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


# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.modules.quiz.routes.api import router as quiz_api_router
from app.modules.quiz.routes.room import router as room_router
from app.modules.sso_module.routes import router as sso_api_router

app.include_router(quiz_api_router, prefix=settings.API_V1_STR)
app.include_router(room_router, prefix=settings.API_V1_STR)
app.include_router(sso_api_router)

# --- Health Checks for Ecosystem ---
@app.get("/api/health")
@app.get("/auth-center/callback/health")
async def health_check():
    return {"status": "ok", "service": "QuizMind", "timestamp": time.time()}

@app.post("/api/admin/ecosystem-sync")
async def ecosystem_sync(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    from app.modules.admin.interface import AdminInterface
    sso_config = await AdminInterface.get_sso_config(db)
    
    # CentralAuth sends client_secret as hub_secret for verification
    hub_secret = data.get("hub_secret") or data.get("client_secret")
    if not hub_secret or hub_secret != sso_config.get("client_secret"):
        from fastapi import Response
        return Response(content="Unauthorized: Invalid Secret", status_code=401)

    # Sync users
    users = data.get("users", [])
    synced_count = 0
    for u_data in users:
        email = u_data.get("email")
        username = u_data.get("username")
        if not email or not username: continue
        
        # 1. Try to find by email first
        user = await AuthService.get_user_by_email(db, email)
        
        # 2. If not found by email, try to find by username (to avoid UNIQUE constraint failure)
        if not user:
            user = await AuthService.get_user_by_username(db, username)
        
        if not user:
            # 3. Create new user if not found by either email or username
            user = User(
                email=email,
                username=username,
                full_name=u_data.get("full_name") or username,
                role="admin" if u_data.get("role") == "admin" else "user",
                hashed_password=u_data.get("password_hash")
            )
            db.add(user)
        else:
            # 4. Update existing user (found by either email or username)
            # hub is source of truth
            user.email = email 
            user.username = username
            user.full_name = u_data.get("full_name", user.full_name)
            if u_data.get("role"):
                user.role = "admin" if u_data.get("role") == "admin" else "user"
            
            if u_data.get("password_hash"):
                user.hashed_password = u_data.get("password_hash")
                
        synced_count += 1
    
    # Update CentralAuth URL if provided and changed
    server_address = data.get("server_address")
    if server_address:
        server_address = server_address.rstrip('/')
        if server_address != sso_config.get("central_auth_url"):
            sso_config["central_auth_url"] = server_address
            # Update config without requiring a real admin session (id=0)
            await AdminInterface.update_sso_config(db, sso_config, 0)

    await db.commit()
    return {"status": "success", "message": f"Synced {synced_count} users successfully."}

@app.get("/api/v1/auth/me")
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user: return {"user": None}
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }

@app.get("/")
@app.get("/login")
@app.get("/dashboard")
@app.get("/quiz/{path:path}")
@app.get("/profile")
@app.get("/stats")
@app.get("/settings")
@app.get("/manage")
@app.get("/manage/{path:path}")
@app.get("/room/{path:path}")
@app.get("/admin")
@app.get("/admin/{path:path}")
@app.get("/auth/callback")
async def serve_spa(request: Request, db: AsyncSession = Depends(get_db)):
    # Serve React SPA index.html unconditionally for all frontend paths
    spa_index = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(spa_index):
        from fastapi.responses import FileResponse
        return FileResponse(spa_index)
    
    return JSONResponse(
        status_code=404, 
        content={"status": "error", "message": "SPA assets not found. Please compile the Vite frontend client first."}
    )


@app.get("/api/v1/stats/detailed")
async def get_detailed_stats(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_user_detailed_stats(db, user.id)
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/v1/dashboard/data")
async def get_dashboard_data(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id_int = user.id
    
    # Use selectinload for quizzes and questions to avoid N+1
    all_quizzes = await QuizService.get_quizzes(db)
    
    # Get status from QuizAttempt (interacted and archived)
    from app.modules.quiz.models import QuizAttempt
    interaction_result = await db.execute(
        select(QuizAttempt.quiz_id, QuizAttempt.is_archived).where(QuizAttempt.user_id == user_id_int)
    )
    interaction_map = {r[0]: r[1] for r in interaction_result.all()}

    my_quizzes_data = []
    archived_quizzes_data = []
    discover_quizzes_data = []
    created_quizzes_data = []
    
    for q, count in all_quizzes:
        quiz_dict = {
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "cover_image": q.cover_image,
            "questions_count": count,
            "tags": [t.name for t in q.tags],
            "is_creator": q.creator_id == user_id_int
        }
        
        if q.creator_id == user_id_int:
            created_quizzes_data.append(quiz_dict)
            
        is_archived = interaction_map.get(q.id)
        if q.id in interaction_map:
            if is_archived:
                archived_quizzes_data.append(quiz_dict)
            else:
                my_quizzes_data.append(quiz_dict)
        else:
            discover_quizzes_data.append(quiz_dict)
            
    from app.modules.gamification.interface import GamificationInterface
    from app.modules.stats.interface import StatsInterface
    from app.modules.notification.interface import NotificationInterface

    # Fetch data concurrently for performance
    gamify_data, stats_summary, notifications, unread_count = await asyncio.gather(
        GamificationInterface.get_user_stats(db, user_id_int),
        StatsInterface.get_user_summary(db, user_id_int),
        NotificationInterface.get_latest(db, user_id_int),
        NotificationInterface.get_unread_count(db, user_id_int)
    )

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        },
        "my_quizzes": my_quizzes_data,
        "archived_quizzes": archived_quizzes_data,
        "discover_quizzes": discover_quizzes_data,
        "created_quizzes": created_quizzes_data,
        "gamify": gamify_data,
        "stats_summary": stats_summary,
        "notifications": notifications,
        "unread_count": unread_count
    }

@app.post("/api/v1/auth/login")
async def login_api(
    data: dict,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    from app.modules.auth.services.auth_service import AuthService
    from app.modules.sso_module.service import SSOService
    
    username = data.get("username")
    password = data.get("password")
    is_backdoor = data.get("is_backdoor", False)
    
    user = await AuthService.authenticate_user(db, username, password)
    if not user:
        return {"status": "error", "message": "Invalid username or password"}
        
    sso_config = await SSOService.get_config(db)
    if sso_config.is_enabled and not is_backdoor:
        if user.role != "admin":
            return {"status": "error", "message": "Security Alert: SSO is active. Local login bypass is strictly restricted to Administrators only."}
            
    response.set_cookie(key="user_id", value=str(user.id), httponly=True, path="/", samesite="lax")
    return {
        "status": "success",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    }

@app.get("/api/v1/admin/stats")
async def api_admin_stats(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    from app.modules.quiz.models import Quiz, UserAnswer
    from app.modules.auth.models import User as UserDB
    
    user_count_result = await db.execute(select(func.count(UserDB.id)))
    quiz_count_result = await db.execute(select(func.count(Quiz.id)))
    total_answers_result = await db.execute(select(func.count(UserAnswer.id)))
    
    from app.modules.admin.interface import AdminInterface
    sso_config = await AdminInterface.get_sso_config(db)
    
    return {
        "user_count": user_count_result.scalar(),
        "quiz_count": quiz_count_result.scalar(),
        "total_answers": total_answers_result.scalar(),
        "sso_config": {
            "central_auth_url": sso_config.get("central_auth_url") if isinstance(sso_config, dict) else getattr(sso_config, "central_auth_url", ""),
            "client_id": sso_config.get("client_id") if isinstance(sso_config, dict) else getattr(sso_config, "client_id", ""),
            "enabled": sso_config.get("enabled", False) if isinstance(sso_config, dict) else getattr(sso_config, "enabled", False)
        }
    }

@app.get("/api/v1/admin/sso")
async def api_admin_sso(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    from app.modules.admin.interface import AdminInterface
    sso_config = await AdminInterface.get_sso_config(db)
    return {
        "central_auth_url": sso_config.get("central_auth_url") if isinstance(sso_config, dict) else getattr(sso_config, "central_auth_url", ""),
        "client_id": sso_config.get("client_id") if isinstance(sso_config, dict) else getattr(sso_config, "client_id", ""),
        "client_secret": sso_config.get("client_secret") if isinstance(sso_config, dict) else getattr(sso_config, "client_secret", ""),
        "enabled": sso_config.get("enabled", False) if isinstance(sso_config, dict) else getattr(sso_config, "enabled", False)
    }

@app.post("/api/v1/admin/sso")
async def api_admin_sso_update(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    from app.modules.auth.services.auth_service import AuthService
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    from app.modules.admin.interface import AdminInterface
    config_data = {
        "central_auth_url": data.get("central_auth_url"),
        "client_id": data.get("client_id"),
        "client_secret": data.get("client_secret"),
        "enabled": data.get("enabled", False)
    }
    await AdminInterface.update_sso_config(db, config_data, user.id)
    return {"status": "success", "message": "SSO configuration updated successfully!"}
    context = await get_common_context(request, db)
    if not context["user"] or context["user"].role != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    from app.modules.admin.interface import AdminInterface
    config_data = {
        "central_auth_url": central_auth_url,
        "client_id": client_id,
        "client_secret": client_secret,
        "enabled": enabled
    }
    await AdminInterface.update_sso_config(db, config_data, context["user"].id)
    return RedirectResponse(url="/admin/sso?success=1", status_code=303)

@app.post("/api/v1/admin/sso/test")
async def test_sso_connection(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    from app.modules.auth.services.auth_service import AuthService
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    ca_url = data.get("central_auth_url", "").rstrip('/')
    if not ca_url:
        return {"status": "error", "message": "Invalid URL"}
    
    try:
        async with httpx.AsyncClient() as client:
            # Try to hit CentralAuth health endpoint
            resp = await client.get(f"{ca_url}/api/auth/health", timeout=5.0)
            if resp.status_code == 200:
                return {"status": "success", "message": "Connection Successful!"}
            else:
                return {"status": "error", "message": f"CentralAuth returned {resp.status_code}"}
    except Exception as e:
        return {"status": "error", "message": f"Connection Failed: {str(e)}"}

@app.get("/api/v1/admin/ai")
async def api_admin_ai(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    from app.modules.admin.interface import AdminInterface
    ai_config = await AdminInterface.get_ai_config(db)
    return {
        "api_key": ai_config.get("api_key", "") if isinstance(ai_config, dict) else getattr(ai_config, "api_key", ""),
        "model_id": ai_config.get("model_id", "gemini-2.5-flash") if isinstance(ai_config, dict) else getattr(ai_config, "model_id", "gemini-2.5-flash"),
        "enabled": ai_config.get("enabled", False) if isinstance(ai_config, dict) else getattr(ai_config, "enabled", False)
    }

@app.post("/api/v1/admin/ai")
async def api_admin_ai_update(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    from app.modules.auth.services.auth_service import AuthService
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    from app.modules.admin.interface import AdminInterface
    config_data = {
        "api_key": data.get("api_key"),
        "model_id": data.get("model_id", "gemini-2.5-flash"),
        "enabled": data.get("enabled", False)
    }
    await AdminInterface.update_ai_config(db, config_data, user.id)
    return {"status": "success", "message": "AI configuration updated successfully!"}

@app.post("/api/v1/admin/ai/list-models")
async def list_ai_models(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"error": "Unauthorized"})
    
    data = await request.json()
    api_key = data.get("api_key")
    if not api_key:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=400, content={"error": "API Key required"})
    
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        models = []
        # Attempt to list models - if API key is invalid, this will throw
        model_list = list(client.models.list())
        
        for m in model_list:
            # Check for generation capability with multiple possible attribute names/formats
            methods = getattr(m, 'supported_generation_methods', [])
            is_generative = any('generateContent' in str(method) or 'generate_content' in str(method) for method in methods)
            
            if is_generative or not methods: # Fallback: include if no methods defined or matches filter
                model_id = m.name.split('/')[-1] if '/' in m.name else m.name
                models.append({
                    "id": model_id, 
                    "display_name": m.display_name or model_id,
                    "is_generative": is_generative
                })
        
        # If still empty, just return everything we got
        if not models and model_list:
            models = [{"id": m.name.split('/')[-1], "display_name": m.display_name or m.name} for m in model_list]
            
        return {"models": models}
    except Exception as e:
        from fastapi.responses import JSONResponse
        # Provide clearer error message for API key issues
        error_msg = str(e)
        if "API_KEY_INVALID" in error_msg:
            error_msg = "Invalid API Key. Please check your Google AI Studio settings."
        return JSONResponse(status_code=500, content={"error": error_msg})

@app.get("/api/v1/admin/users")
async def api_admin_users(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    from app.modules.auth.models import User as UserDB
    users_result = await db.execute(select(UserDB))
    users = users_result.scalars().all()
    
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role
        } for u in users
    ]

@app.get("/api/v1/admin/maintenance")
async def api_admin_maintenance(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    from app.modules.admin.models import SystemConfig
    maintenance_config_result = await db.execute(select(SystemConfig).where(SystemConfig.id == "maintenance_mode"))
    maintenance_config = maintenance_config_result.scalar_one_or_none()
    is_enabled = maintenance_config.value.get("enabled", False) if maintenance_config else False
    return {"maintenance_enabled": is_enabled}

@app.post("/api/v1/admin/maintenance/toggle")
async def api_toggle_maintenance(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.auth.services.auth_service import AuthService
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    from app.modules.admin.models import SystemConfig
    config_result = await db.execute(select(SystemConfig).where(SystemConfig.id == "maintenance_mode"))
    config = config_result.scalar_one_or_none()
    if not config:
        config = SystemConfig(id="maintenance_mode", value={"enabled": True})
        db.add(config)
        is_enabled = True
    else:
        is_enabled = not config.value.get("enabled", False)
        config.value = {"enabled": is_enabled}
    
    await db.commit()
    return {"status": "success", "maintenance_enabled": is_enabled}



@app.get("/discover")
async def discover_page(request: Request, db: AsyncSession = Depends(get_db)):
    context = await get_common_context(request, db)
    # Redirect to home with a special flag to open the discover tab
    return RedirectResponse(url="/?tab=discover")

@app.post("/api/v1/notifications/read-all")
async def mark_notifications_read(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.notification.models import Notification
    user_id = int(request.cookies.get("user_id", 1))
    await db.execute(
        Notification.__table__.update().where(Notification.user_id == user_id).values(is_read=True)
    )
    await db.commit()
    return {"status": "ok"}

@app.get("/logout")
async def logout(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.sso_module.service import SSOService
    sso_config = await SSOService.get_config(db)
    
    if sso_config.is_enabled:
        # Logout from both systems, then land on CentralAuth portal
        ca_logout_url = f"{sso_config.server_url.rstrip('/')}/api/auth/logout"
        response = RedirectResponse(url=ca_logout_url, status_code=303)
    else:
        response = RedirectResponse(url="/", status_code=303)
    
    response.delete_cookie("user_id", path="/")
    return response

