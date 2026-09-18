from fastapi import APIRouter, Request, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import httpx
from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.admin.interface import AdminInterface
from app.modules.auth.models import User
from app.modules.quiz.models import Quiz, UserAnswer
from app.modules.admin.models import SystemConfig

router = APIRouter(tags=["Admin"])

@router.post("/admin/ecosystem-sync")
async def ecosystem_sync(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    sso_config = await AdminInterface.get_sso_config(db)
    
    hub_secret = data.get("hub_secret") or data.get("client_secret")
    if not hub_secret or hub_secret != sso_config.get("client_secret"):
        return Response(content="Unauthorized: Invalid Secret", status_code=401)

    users = data.get("users", [])
    synced_count = 0
    for u_data in users:
        email = u_data.get("email")
        username = u_data.get("username")
        if not email or not username:
            continue
        
        user = await AuthService.get_user_by_email(db, email)
        if not user:
            user = await AuthService.get_user_by_username(db, username)
        
        if not user:
            user = User(
                email=email,
                username=username,
                full_name=u_data.get("full_name") or username,
                role="admin" if u_data.get("role") == "admin" else "user",
                hashed_password=u_data.get("password_hash")
            )
            db.add(user)
        else:
            user.email = email 
            user.username = username
            user.full_name = u_data.get("full_name", user.full_name)
            if u_data.get("role"):
                user.role = "admin" if u_data.get("role") == "admin" else "user"
            if u_data.get("password_hash"):
                user.hashed_password = u_data.get("password_hash")
                
        synced_count += 1
    
    server_address = data.get("server_address")
    if server_address:
        server_address = server_address.rstrip('/')
        if server_address != sso_config.get("central_auth_url"):
            sso_config["central_auth_url"] = server_address
            await AdminInterface.update_sso_config(db, sso_config, 0)

    await db.commit()
    return {"status": "success", "message": f"Synced {synced_count} users successfully."}

@router.get("/admin/stats")
async def api_admin_stats(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    user_count_result = await db.execute(select(func.count(User.id)))
    quiz_count_result = await db.execute(select(func.count(Quiz.id)))
    total_answers_result = await db.execute(select(func.count(UserAnswer.id)))
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

@router.get("/admin/sso")
async def api_admin_sso(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    sso_config = await AdminInterface.get_sso_config(db)
    return {
        "central_auth_url": sso_config.get("central_auth_url") if isinstance(sso_config, dict) else getattr(sso_config, "central_auth_url", ""),
        "client_id": sso_config.get("client_id") if isinstance(sso_config, dict) else getattr(sso_config, "client_id", ""),
        "client_secret": sso_config.get("client_secret") if isinstance(sso_config, dict) else getattr(sso_config, "client_secret", ""),
        "enabled": sso_config.get("enabled", False) if isinstance(sso_config, dict) else getattr(sso_config, "enabled", False)
    }

@router.post("/admin/sso")
async def api_admin_sso_update(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    config_data = {
        "central_auth_url": data.get("central_auth_url"),
        "client_id": data.get("client_id"),
        "client_secret": data.get("client_secret"),
        "enabled": data.get("enabled", False)
    }
    await AdminInterface.update_sso_config(db, config_data, user.id)
    return {"status": "success", "message": "SSO configuration updated successfully!"}

@router.post("/admin/sso/test")
async def test_sso_connection(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    ca_url = data.get("central_auth_url", "").rstrip('/')
    if not ca_url:
        return {"status": "error", "message": "Invalid URL"}
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{ca_url}/api/auth/health", timeout=5.0)
            if resp.status_code == 200:
                return {"status": "success", "message": "Connection Successful!"}
            else:
                return {"status": "error", "message": f"CentralAuth returned {resp.status_code}"}
    except Exception as e:
        return {"status": "error", "message": f"Connection Failed: {str(e)}"}

@router.get("/admin/ai")
async def api_admin_ai(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    ai_config = await AdminInterface.get_ai_config(db)
    return {
        "api_key": ai_config.get("api_key", "") if isinstance(ai_config, dict) else getattr(ai_config, "api_key", ""),
        "model_id": ai_config.get("model_id", "gemini-2.5-flash") if isinstance(ai_config, dict) else getattr(ai_config, "model_id", "gemini-2.5-flash"),
        "enabled": ai_config.get("enabled", False) if isinstance(ai_config, dict) else getattr(ai_config, "enabled", False)
    }

@router.post("/admin/ai")
async def api_admin_ai_update(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    config_data = {
        "api_key": data.get("api_key"),
        "model_id": data.get("model_id", "gemini-2.5-flash"),
        "enabled": data.get("enabled", False)
    }
    await AdminInterface.update_ai_config(db, config_data, user.id)
    return {"status": "success", "message": "AI configuration updated successfully!"}

@router.post("/admin/ai/list-models")
async def list_ai_models(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=403, content={"error": "Unauthorized"})
    
    data = await request.json()
    api_key = data.get("api_key")
    if not api_key:
        return JSONResponse(status_code=400, content={"error": "API Key required"})
    
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        models = []
        model_list = list(client.models.list())
        
        for m in model_list:
            methods = getattr(m, 'supported_generation_methods', [])
            is_generative = any('generateContent' in str(method) or 'generate_content' in str(method) for method in methods)
            if is_generative or not methods:
                model_id = m.name.split('/')[-1] if '/' in m.name else m.name
                models.append({
                    "id": model_id, 
                    "display_name": m.display_name or model_id,
                    "is_generative": is_generative
                })
        
        if not models and model_list:
            models = [{"id": m.name.split('/')[-1], "display_name": m.display_name or m.name} for m in model_list]
            
        return {"models": models}
    except Exception as e:
        error_msg = str(e)
        if "API_KEY_INVALID" in error_msg:
            error_msg = "Invalid API Key. Please check your Google AI Studio settings."
        return JSONResponse(status_code=500, content={"error": error_msg})

@router.get("/admin/telegram")
async def api_admin_telegram(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    tele_config = await AdminInterface.get_telegram_config(db)
    return {
        "bot_token": tele_config.get("bot_token", "") if isinstance(tele_config, dict) else getattr(tele_config, "bot_token", ""),
        "bot_username": tele_config.get("bot_username", "") if isinstance(tele_config, dict) else getattr(tele_config, "bot_username", ""),
        "enabled": tele_config.get("enabled", False) if isinstance(tele_config, dict) else getattr(tele_config, "enabled", False)
    }

@router.post("/admin/telegram")
async def api_admin_telegram_update(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    config_data = {
        "bot_token": data.get("bot_token"),
        "bot_username": data.get("bot_username"),
        "enabled": data.get("enabled", False)
    }
    await AdminInterface.update_telegram_config(db, config_data, user.id)
    return {"status": "success", "message": "Telegram configuration updated successfully!"}

@router.post("/admin/telegram/test")
async def test_telegram_bot(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    tele_config = await AdminInterface.get_telegram_config(db)
    token = tele_config.get("bot_token") if isinstance(tele_config, dict) else getattr(tele_config, "bot_token", "")
    
    if not token:
        return {"status": "error", "message": "Bot token not configured"}
        
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://api.telegram.org/bot{token}/getMe", timeout=10)
            data = resp.json()
            if data.get("ok"):
                bot_info = data["result"]
                return {
                    "status": "success",
                    "message": f"Connected to bot: {bot_info.get('first_name')} (@{bot_info.get('username')})"
                }
            else:
                return {"status": "error", "message": data.get("description", "Unknown error")}
    except Exception as e:
        return {"status": "error", "message": f"Connection error: {e}"}

@router.post("/admin/telegram/broadcast")
async def broadcast_telegram_message(request: Request, data: dict, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    message = data.get("message")
    if not message or not message.strip():
        return {"status": "error", "message": "Message cannot be empty"}
        
    from app.modules.notification.services.telegram_service import TelegramService
    from app.modules.notification.services.reminder_scheduler import _get_active_configs
    
    configs = await _get_active_configs(db)
    
    success_count = 0
    seen_chats = set()
    for config in configs:
        chat_id = config.get("telegram_chat_id")
        if chat_id and chat_id not in seen_chats and config.get("is_active"):
            seen_chats.add(chat_id)
            if await TelegramService.send_message(db, chat_id, message.strip(), message_type="broadcast"):
                success_count += 1
                
    return {"status": "success", "message": f"Broadcast sent successfully to {success_count} user(s)."}

@router.get("/admin/users")
async def api_admin_users(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    users_result = await db.execute(select(User))
    users = users_result.scalars().all()
    
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role
        } for u in users
    ]

@router.get("/admin/maintenance")
async def api_admin_maintenance(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
    maintenance_config_result = await db.execute(select(SystemConfig).where(SystemConfig.id == "maintenance_mode"))
    maintenance_config = maintenance_config_result.scalar_one_or_none()
    is_enabled = maintenance_config.value.get("enabled", False) if maintenance_config else False
    return {"maintenance_enabled": is_enabled}

@router.post("/admin/maintenance/toggle")
async def api_toggle_maintenance(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user or user.role != "admin":
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
        
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
