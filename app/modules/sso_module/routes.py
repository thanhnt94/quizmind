from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from .service import SSOService
from fastapi.responses import RedirectResponse
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["SSO Integration"])

# NOTE: NO /login route here. The /login route in main.py handles
# SSO redirect logic directly to avoid route conflicts.

@router.get("/api/sso/config")
async def get_sso_config(db: AsyncSession = Depends(get_db)):
    """API for the sub-project's Admin Panel to show current settings."""
    config = await SSOService.get_config(db)
    return config.to_dict()

@router.get("/api/v1/auth/config")
async def get_auth_config(db: AsyncSession = Depends(get_db)):
    """Public authentication configuration endpoint for pure SPA."""
    config = await SSOService.get_config(db)
    return {
        "auth_provider": "central" if config.is_enabled else "local",
        "sso_enabled": config.is_enabled,
        "jump_url": f"{config.server_url.rstrip('/')}/api/auth/jump/{config.client_id}" if config.is_enabled else None
    }


@router.post("/api/sso/config")
async def update_sso_config(data: dict, db: AsyncSession = Depends(get_db)):
    """API for the sub-project's Admin Panel to toggle SSO and update settings."""
    config = await SSOService.get_config(db)
    config.is_enabled = data.get("is_enabled", config.is_enabled)
    config.server_url = data.get("server_url", config.server_url)
    config.client_id = data.get("client_id", config.client_id)
    config.client_secret = data.get("client_secret", config.client_secret)
    await db.commit()
    return {"success": True}

@router.get("/auth-center/callback")
async def sso_callback(request: Request, code: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Standardized callback for CentralAuth SSO."""
    if not code:
        logger.error("SSO callback called without code parameter")
        return RedirectResponse(url="/login?backdoor=1&error=Missing+authorization+code", status_code=303)
    
    try:
        user_data, error = await SSOService.verify_sso_code(db, code)
    except Exception as e:
        logger.error(f"SSO verification exception: {e}")
        return RedirectResponse(url="/login?backdoor=1&error=SSO+service+error", status_code=303)
    
    if error:
        logger.error(f"SSO verification error: {error}")
        return RedirectResponse(url=f"/login?backdoor=1&error={error}", status_code=303)
    
    if not user_data:
        return RedirectResponse(url="/login?backdoor=1&error=No+user+data+returned", status_code=303)
    
    # Sync or Find user in local DB
    from app.modules.auth.models import User
    from sqlalchemy import select
    
    sso_id = str(user_data.get("id"))
    username = user_data.get("username")
    email = user_data.get("email")
    password_hash = user_data.get("password_hash")
    
    # 1. Try to find by sso_id
    result = await db.execute(select(User).where(User.sso_id == sso_id))
    user = result.scalar_one_or_none()
    
    if not user:
        # 2. Try to find by username
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        
        if user:
            # Link existing account to SSO
            user.sso_id = sso_id
        else:
            # 3. Create new user
            user = User(
                username=username,
                email=email,
                full_name=username,
                sso_id=sso_id,
                hashed_password=password_hash
            )
            db.add(user)
    
    # Sync password hash from CentralAuth
    if password_hash:
        user.hashed_password = password_hash
    
    await db.commit()
    await db.refresh(user)
    
    logger.info(f"SSO login success for user: {user.username} (id={user.id})")
    
    res = RedirectResponse(url="/", status_code=303)
    res.set_cookie(key="user_id", value=str(user.id), httponly=True, path="/", samesite="lax")
    return res
