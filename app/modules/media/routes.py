import os
import uuid
import logging
import httpx
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.config import settings
from app.modules.auth.services.auth_service import AuthService
from app.modules.sso_module.service import SSOService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/media", tags=["Media Management"])

ALLOWED_IMAGE_EXTS = {"png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"}
ALLOWED_AUDIO_EXTS = {"mp3", "wav", "m4a", "ogg", "aac", "webm", "flac"}
ALLOWED_EXTS = ALLOWED_IMAGE_EXTS | ALLOWED_AUDIO_EXTS


@router.post("/upload")
async def upload_media_file(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Direct media upload from QuizMind web interface.
    Authenticated via session, forwards file to CentralAuth Vault,
    and returns canonical CentralAuth pseudo-URL (central-media:// or central-tts://).
    """
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Please log in to upload files.")

    filename_raw = file.filename or "uploaded_file"
    ext = filename_raw.split(".")[-1].lower() if "." in filename_raw else "jpg"
    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension .{ext} is not supported. Only images or audio files are allowed."
        )

    # Read content into memory (max 25MB)
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 25MB.")

    sso_config = await SSOService.get_config(db)
    central_server_url = (sso_config.server_url if sso_config and sso_config.server_url else "https://auth.inmind.site").rstrip("/")
    if not central_server_url or central_server_url.startswith("http://centralauth.mindstack.local"):
        central_server_url = "https://auth.inmind.site"

    queue_token = getattr(settings, "QUEUE_API_SECRET", "super-secret-token-123")

    # 1. Forward directly to CentralAuth Media Vault
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            upload_url = f"{central_server_url}/api/queue/media/upload"
            files = {
                "file": (file.filename, content, file.content_type or "application/octet-stream")
            }
            data = {
                "source_info": f"QuizMind: {user.username} (ID #{user.id})"
            }
            headers = {
                "X-Queue-Token": queue_token
            }
            response = await client.post(upload_url, files=files, data=data, headers=headers)

            if response.status_code == 200:
                res_data = response.json()
                filename = res_data.get("filename")
                is_audio = ext in ALLOWED_AUDIO_EXTS
                canonical_prefix = "central-tts://" if is_audio else "central-media://"
                canonical_url = f"{canonical_prefix}{filename}" if filename else None
                full_url = res_data.get("full_url")
                if not full_url:
                    rel_url = res_data.get("url", "")
                    full_url = f"{central_server_url}{rel_url}" if rel_url.startswith("/") else rel_url

                return {
                    "status": "success",
                    "url": canonical_url or full_url,
                    "canonical_url": canonical_url,
                    "full_url": full_url,
                    "relative_url": res_data.get("url"),
                    "filename": filename,
                    "mime_type": res_data.get("mime_type"),
                    "size_bytes": res_data.get("size_bytes"),
                    "media_type": "audio" if is_audio else "image"
                }
            else:
                logger.warning(f"CentralAuth upload returned status {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Error forwarding media to CentralAuth: {e}", exc_info=True)

    # 2. Fallback: Save locally on QuizMind if CentralAuth is unreachable
    try:
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        local_dir = os.path.join(settings.BASE_DIR, "static", "uploads", "media")
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, unique_name)
        with open(local_path, "wb") as f:
            f.write(content)

        is_audio = ext in ALLOWED_AUDIO_EXTS
        canonical_prefix = "central-tts://" if is_audio else "central-media://"
        canonical_url = f"{canonical_prefix}{unique_name}"

        return {
            "status": "success",
            "url": canonical_url,
            "canonical_url": canonical_url,
            "full_url": f"/static/uploads/media/{unique_name}",
            "relative_url": f"/static/uploads/media/{unique_name}",
            "filename": unique_name,
            "mime_type": file.content_type,
            "size_bytes": len(content),
            "media_type": "audio" if is_audio else "image",
            "is_fallback": True
        }
    except Exception as err:
        logger.error(f"Failed local media fallback: {err}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unable to save file to server.")
