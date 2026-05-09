from fastapi import FastAPI, Request, Depends, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.modules.auth.models import User
from app.modules.auth.services.central_auth_client import CentralAuthClient
from app.core.db import get_db, engine, Base
from app.core.init_db import init_db
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
    description="A standalone high-scale Quiz system (SSR Version with Intelligent Auth)",
    version="1.2.0",
    lifespan=lifespan
)

# Static & Templates
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
# Mount Vite dist specifically if it exists
DIST_DIR = os.path.join(BASE_DIR, "static", "dist")
if os.path.exists(DIST_DIR):
    app.mount("/static/dist", StaticFiles(directory=DIST_DIR), name="dist")

templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.modules.quiz.routes.api import router as quiz_api_router
app.include_router(quiz_api_router, prefix=settings.API_V1_STR)

# Helper for common context
async def get_common_context(request: Request, db: AsyncSession):
    user_id = request.cookies.get("user_id")
    
    # Optimize CentralAuth Health Check with Cache
    global CA_HEALTH_CACHE
    now = time.time()
    if now - CA_HEALTH_CACHE["last_check"] > CA_CHECK_INTERVAL:
        try:
            async with httpx.AsyncClient() as client:
                # Use a very short timeout for health check to avoid lagging
                resp = await client.get(f"{settings.CENTRAL_AUTH_URL}/api/auth/health", timeout=0.2)
                CA_HEALTH_CACHE["status"] = (resp.status_code == 200)
        except Exception as e:
            # If CentralAuth is down or slow, don't lag the app
            CA_HEALTH_CACHE["status"] = False
        CA_HEALTH_CACHE["last_check"] = now

    is_ca_alive = CA_HEALTH_CACHE["status"]

    # Sign-in URL logic
    if is_ca_alive:
        # Use dynamic base URL
        callback_url = f"{request.base_url}auth/callback".replace("127.0.0.1", "localhost")
        signin_url = f"{settings.CENTRAL_AUTH_URL}/api/auth/login?client_id={settings.CLIENT_ID}&return_to={callback_url}"
    else:
        signin_url = "/login"

    user_data = None
    if user_id:
        from app.modules.auth.models import User as UserDB
        try:
            result = await db.execute(select(UserDB).where(UserDB.id == int(user_id)))
            user_data = result.scalar_one_or_none()
        except:
            user_data = None

    return {
        "request": request,
        "user": user_data,
        "login_url": signin_url,
        "is_ca_alive": is_ca_alive
    }

@app.get("/api/v1/auth/me")
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user: return {"user": None}
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }

@app.get("/")
@app.get("/dashboard")
@app.get("/quiz/{path:path}")
@app.get("/profile")
@app.get("/stats")
async def serve_spa(request: Request, db: AsyncSession = Depends(get_db)):
    # Check if we should serve SSR or SPA
    # For now, let's serve SPA if it exists, otherwise fallback to root SSR
    spa_index = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(spa_index):
        from fastapi.responses import FileResponse
        return FileResponse(spa_index)
    
    # Fallback to SSR root if no SPA built
    user = await AuthService.get_current_user(request, db)
    if user:
        return RedirectResponse(url="/dashboard")
    return templates.TemplateResponse("landing.html", {"request": request})
    user_id = request.cookies.get("user_id")
    if user_id:
        return RedirectResponse(url="/dashboard", status_code=303)
    context = await get_common_context(request, db)
    return templates.TemplateResponse(
        request=request, name="landing.html", context=context
    )

@app.get("/api/v1/dashboard/data")
async def get_dashboard_data(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user: return {"error": "Unauthorized"}
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
    
    for q, count in all_quizzes:
        quiz_dict = {
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "questions_count": count
        }
        
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
        "my_quizzes": my_quizzes_data,
        "archived_quizzes": archived_quizzes_data,
        "discover_quizzes": discover_quizzes_data,
        "gamify": gamify_data,
        "stats_summary": stats_summary,
        "notifications": notifications,
        "unread_count": unread_count
    }

@app.get("/login")
async def login_page(request: Request, db: AsyncSession = Depends(get_db)):
    context = await get_common_context(request, db)
    return templates.TemplateResponse(request=request, name="auth/login.html", context=context)

@app.get("/quiz/import")
async def quiz_import(request: Request, db: AsyncSession = Depends(get_db)):
    context = await get_common_context(request, db)
    if not context["user"]:
        return RedirectResponse(url="/login?target=import", status_code=303)
    return templates.TemplateResponse(
        request=request, name="modules/quiz/import/index.html", context=context
    )

@app.get("/stats")
async def stats_page(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.stats.interface import StatsInterface
    from app.modules.gamification.interface import GamificationInterface
    
    context = await get_common_context(request, db)
    if not context["user"]:
        return RedirectResponse(url="/login?target=stats", status_code=303)
        
    user_id = int(request.cookies.get("user_id", 1))
    stats_summary = await StatsInterface.get_user_summary(db, user_id)
    gamify_data = await GamificationInterface.get_user_stats(db, user_id)
    
    # Fetch chart data (Activity by day - last 7 days)
    from app.modules.stats.models import UserDailyStats
    daily_stats_result = await db.execute(
        select(UserDailyStats).where(UserDailyStats.user_id == user_id).order_by(UserDailyStats.date.desc()).limit(7)
    )
    daily_stats = daily_stats_result.scalars().all()
    chart_data = {
        "labels": [s.date.strftime("%d/%m") for s in reversed(daily_stats)],
        "values": [s.questions_attempted for s in reversed(daily_stats)]
    }

    context.update({
        "stats": stats_summary,
        "gamify": gamify_data,
        "chart_data": chart_data,
        "title": "Learning Analytics - QuizMind",
        "show_bottom_nav": True,
        "active_nav": "stats"
    })
    return templates.TemplateResponse(
        request=request, name="modules/stats/view.html", context=context
    )

@app.get("/admin")
async def admin_dashboard(request: Request, db: AsyncSession = Depends(get_db)):
    context = await get_common_context(request, db)
    if not context["user"] or context["user"].role != "admin":
        return RedirectResponse(url="/login?target=admin", status_code=303)
    
    from app.modules.quiz.models import Quiz, UserAnswer
    from app.modules.auth.models import User as UserDB
    
    user_count_result = await db.execute(select(func.count(UserDB.id)))
    quiz_count_result = await db.execute(select(func.count(Quiz.id)))
    total_answers_result = await db.execute(select(func.count(UserAnswer.id)))
    
    context.update({
        "user_count": user_count_result.scalar(),
        "quiz_count": quiz_count_result.scalar(),
        "total_answers": total_answers_result.scalar(),
        "active_page": "dashboard",
        "settings": settings
    })
    return templates.TemplateResponse(
        request=request, name="modules/admin/dashboard.html", context=context
    )

@app.get("/admin/sso")
async def admin_sso(request: Request, db: AsyncSession = Depends(get_db)):
    context = await get_common_context(request, db)
    if not context["user"] or context["user"].role != "admin":
        return RedirectResponse(url="/login?target=admin/sso", status_code=303)
    
    from app.modules.admin.interface import AdminInterface
    sso_config = await AdminInterface.get_sso_config(db)
    
    context.update({
        "sso_config": sso_config,
        "active_page": "sso"
    })
    return templates.TemplateResponse(
        request=request, name="modules/admin/sso.html", context=context
    )

@app.post("/admin/sso")
async def admin_sso_update(
    request: Request,
    central_auth_url: str = Form(...),
    client_id: str = Form(...),
    client_secret: str = Form(...),
    enabled: bool = Form(False),
    db: AsyncSession = Depends(get_db)
):
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

@app.get("/admin/users")
async def admin_users(request: Request, db: AsyncSession = Depends(get_db)):
    context = await get_common_context(request, db)
    if not context["user"] or context["user"].role != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    from app.modules.auth.models import User as UserDB
    users_result = await db.execute(select(UserDB))
    users = users_result.scalars().all()
    
    context.update({
        "users": users,
        "active_page": "users"
    })
    return templates.TemplateResponse(
        request=request, name="modules/admin/users.html", context=context
    )

@app.get("/admin/maintenance")
async def admin_maintenance(request: Request, db: AsyncSession = Depends(get_db)):
    context = await get_common_context(request, db)
    if not context["user"] or context["user"].role != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    from app.modules.admin.models import SystemConfig
    maintenance_config_result = await db.execute(select(SystemConfig).where(SystemConfig.id == "maintenance_mode"))
    maintenance_config = maintenance_config_result.scalar_one_or_none()
    is_enabled = maintenance_config.value.get("enabled", False) if maintenance_config else False
    
    context.update({
        "maintenance_enabled": is_enabled,
        "active_page": "maintenance"
    })
    return templates.TemplateResponse(
        request=request, name="modules/admin/maintenance.html", context=context
    )

@app.post("/admin/maintenance/toggle")
async def toggle_maintenance(request: Request, db: AsyncSession = Depends(get_db)):
    context = await get_common_context(request, db)
    if not context["user"] or context["user"].role != "admin":
        return RedirectResponse(url="/login", status_code=303)
    
    from app.modules.admin.models import SystemConfig
    config_result = await db.execute(select(SystemConfig).where(SystemConfig.id == "maintenance_mode"))
    config = config_result.scalar_one_or_none()
    if not config:
        config = SystemConfig(id="maintenance_mode", value={"enabled": True})
        db.add(config)
    else:
        new_val = not config.value.get("enabled", False)
        config.value = {"enabled": new_val}
    
    await db.commit()
    return RedirectResponse(url="/admin/maintenance", status_code=303)

@app.get("/profile")
async def profile_page(request: Request, db: AsyncSession = Depends(get_db)):
    from app.modules.gamification.interface import GamificationInterface
    context = await get_common_context(request, db)
    if not context["user"]:
        return RedirectResponse(url="/login?target=profile", status_code=303)
    
    user_id = int(request.cookies.get("user_id", 1))
    gamify_data = await GamificationInterface.get_user_stats(db, user_id)
    
    context.update({
        "gamify": gamify_data,
        "show_bottom_nav": True,
        "active_nav": "profile"
    })
    return templates.TemplateResponse(
        request=request, name="modules/auth/profile.html", context=context
    )

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

@app.post("/auth/login")
async def local_login(
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    user = await AuthService.authenticate_user(db, username, password)
    if not user:
        return RedirectResponse(url="/login?error=Invalid credentials", status_code=303)
    
    # Mock session
    response = RedirectResponse(url="/", status_code=303)
    response.set_cookie(key="user_id", value=str(user.id), httponly=True, samesite="lax")
    return response

@app.get("/api/v1/quiz/{quiz_id}/data")
async def get_quiz_data(quiz_id: int, db: AsyncSession = Depends(get_db)):
    quiz = await QuizService.get_quiz_with_stats(db, quiz_id)
    if not quiz: return {"error": "Quiz not found"}
    return {
        "id": quiz.id,
        "title": quiz.title,
        "description": quiz.description,
        "questions_count": len(quiz.questions)
    }

@app.get("/quiz/{quiz_id}")
async def quiz_detail(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    quiz = await QuizService.get_quiz_with_stats(db, quiz_id)
    if not quiz: return RedirectResponse(url="/")
    
    context = await get_common_context(request, db)
    context["quiz"] = quiz
    return templates.TemplateResponse(
        request=request, name="modules/quiz/detail.html", context=context
    )

@app.get("/quiz/{quiz_id}/play")
async def play_quiz(request: Request, quiz_id: int, db: AsyncSession = Depends(get_db)):
    quiz = await QuizService.get_quiz_by_id(db, quiz_id)
    if not quiz: return {"error": "Quiz not found"}
    
    from app.modules.quiz.models import UserAnswer, Question
    from sqlalchemy import func, Integer
    
    # Get all stats for this quiz's questions in one go
    stats_query = select(
        UserAnswer.question_id,
        func.count(UserAnswer.id).label("total"),
        func.sum(func.cast(UserAnswer.is_correct, Integer)).label("correct"),
        func.avg(UserAnswer.active_time).label("avg_time")
    ).join(Question, UserAnswer.question_id == Question.id).where(Question.quiz_id == quiz_id).group_by(UserAnswer.question_id)
    
    stats_results = await db.execute(stats_query)
    stats_map = {row.question_id: row for row in stats_results}

    questions_data = []
    for q in quiz.questions:
        row = stats_map.get(q.id)
        total = row.total if row else 0
        correct = row.correct if row else 0
        
        questions_data.append({
            "id": q.id, "content": q.content, "explanation": q.explanation,
            "ai_explanation": q.ai_explanation,
            "image": q.image, "audio": q.audio,
            "stats": {
                "total": total, 
                "correct": correct, 
                "wrong": total - correct, 
                "avg_time": round(row.avg_time if row else 0, 1)
            },
            "options": [{"id": o.id, "content": o.content, "is_correct": o.is_correct} for o in q.options]
        })
    
    context = await get_common_context(request, db)
    context.update({
        "quiz": {
            "id": quiz.id,
            "title": quiz.title,
            "description": quiz.description,
            "time_limit": quiz.time_limit
        },
        "questions": questions_data,
        "hide_navbar": True
    })
    return templates.TemplateResponse(request=request, name="modules/quiz/play.html", context=context)

@app.get("/admin/upload")
async def legacy_admin_upload(request: Request):
    return RedirectResponse(url="/quiz/import", status_code=301)

@app.get("/auth/callback")
async def auth_callback(request: Request, response: Response, code: str, db: AsyncSession = Depends(get_db)):
    """Handle CentralAuth SSO callback — exchange code for token and verify user."""
    ca_client = CentralAuthClient()
    callback_url = "http://localhost:5080/auth/callback"
    
    # 1. Exchange code for tokens
    token_data = await ca_client.get_token(code, callback_url)
    if not token_data:
        return RedirectResponse(url="/login?error=SSO token exchange failed", status_code=303)
    
    access_token = token_data.get("access_token")
    
    # 2. Verify token and get user info
    sso_user_info = await ca_client.verify_token(access_token)
    if not sso_user_info:
        return RedirectResponse(url="/login?error=SSO verification failed", status_code=303)
    
    # 3. Find or create local user
    sso_id = str(sso_user_info.get("id"))
    from app.modules.auth.models import User as UserDB
    
    result = await db.execute(select(UserDB).filter(UserDB.sso_id == sso_id))
    user = result.scalar_one_or_none()
    if not user:
        # Check if username exists
        username = sso_user_info.get("username")
        result = await db.execute(select(UserDB).filter(UserDB.username == username))
        user = result.scalar_one_or_none()
        
        if user:
            # Link existing account
            user.sso_id = sso_id
        else:
            # Create new user
            user = UserDB(
                username=username,
                email=sso_user_info.get("email"),
                full_name=sso_user_info.get("username"), # Fallback
                sso_id=sso_id
            )
            db.add(user)
        
        await db.commit()
        await db.refresh(user)
    
    # 4. Set cookie and redirect
    response = RedirectResponse(url="/dashboard", status_code=303)
    response.set_cookie(key="user_id", value=str(user.id), httponly=True, samesite="lax")
    return response

@app.get("/logout")
async def logout(response: Response):
    response = RedirectResponse(url="/", status_code=303)
    response.delete_cookie("user_id")
    return response
