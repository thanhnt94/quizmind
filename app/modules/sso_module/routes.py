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
    
    sso_active = config.is_enabled
    if sso_active and config.server_url:
        import urllib.parse
        import socket
        try:
            parsed = urllib.parse.urlparse(config.server_url)
            host = parsed.hostname
            port = parsed.port
            if not host:
                sso_active = False
            else:
                if not port:
                    port = 443 if parsed.scheme == "https" else 80
                # Fast TCP ping check (0.5 second timeout) to avoid blockages
                socket.gethostbyname(host)
                with socket.create_connection((host, port), timeout=0.5):
                    pass
        except Exception:
            sso_active = False
            
    return {
        "auth_provider": "central" if sso_active else "local",
        "sso_enabled": sso_active,
        "jump_url": f"{config.server_url.rstrip('/')}/api/auth/jump/{config.client_id}" if sso_active else None
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
        logger.error("SSO callback called without code parameter. Gracefully redirecting to /login to trigger automatic SSO flow.")
        return RedirectResponse(url="/login", status_code=303)
    
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
    from app.modules.sso_module.cookie_signer import sign_cookie
    from app.core.config import settings
    signed_id = sign_cookie(str(user.id), settings.SECRET_KEY)
    res.set_cookie(key="user_id", value=signed_id, httponly=True, path="/", samesite="lax", max_age=1800)
    return res

from pydantic import BaseModel
from fastapi import HTTPException

class HandshakeRequest(BaseModel):
    client_id: str
    client_secret: str

@router.post("/api/admin/sso/handshake")
async def sso_handshake(req: HandshakeRequest, db: AsyncSession = Depends(get_db)):
    """Dynamic DB discovery endpoint for CentralAuth Hub."""
    config = await SSOService.get_config(db)
    
    # If config not in DB yet, fallback to environment settings
    from app.core.config import settings
    expected_client_id = config.client_id or settings.CLIENT_ID
    expected_client_secret = config.client_secret or settings.CLIENT_SECRET
    
    if expected_client_id != req.client_id:
        raise HTTPException(status_code=401, detail="Client ID mismatch")
        
    if expected_client_secret != req.client_secret:
        raise HTTPException(status_code=401, detail="Client Secret mismatch")
        
    # Get absolute DB path
    db_url = settings.DATABASE_URL
    # Remove sqlite+aiosqlite:/// prefix
    import os
    db_path = db_url.split("///")[-1] if "///" in db_url else db_url
    if not os.path.isabs(db_path):
        # Resolve against project directory if relative
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_path = os.path.abspath(os.path.join(project_root, db_path))
        
    return {
        "success": True,
        "db_path": db_path
    }
