import re
from typing import Optional
from sqlalchemy import select
from app.modules.sso_module.models import SSOConfig
from app.core.config import settings

AUDIO_EXTENSIONS = {"mp3", "wav", "m4a", "ogg", "aac", "webm", "flac"}

async def get_sso_server_url(db) -> str:
    """Get the current CentralAuth public server URL."""
    try:
        res = await db.execute(select(SSOConfig))
        config = res.scalar_one_or_none()
        if config and config.server_url:
            url = config.server_url.strip().rstrip("/")
            if url and not url.startswith("http://centralauth.mindstack.local"):
                return url
    except Exception:
        pass

    env_url = getattr(settings, "CENTRAL_AUTH_URL", "")
    if env_url:
        return env_url.strip().rstrip("/")

    return "https://auth.inmind.site"


def resolve_central_url(url: Optional[str], sso_url: str = "https://auth.inmind.site") -> str:
    """
    Resolves canonical pseudo-protocol URLs (central://, and legacy central-media://, central-tts://)
    to fully accessible public HTTP URLs.
    
    Supports:
    - central://filename.ext -> auto-detects audio (tts) vs general media (media) under /static/uploads/
    - central://folder/filename.ext -> resolves to /static/folder/filename.ext (or /static/uploads/ if folder is tts/media)
    - legacy central-media://filename -> /static/uploads/media/filename
    - legacy central-tts://filename -> /static/uploads/tts/filename
    - /static/... -> prepends sso_url
    """
    if not url or not isinstance(url, str):
        return ""
    trimmed = url.strip()
    if not trimmed:
        return ""
    base_sso = (sso_url or "https://auth.inmind.site").rstrip("/")

    # Normalize old subdomains
    if base_sso and ("auth.inmind.site" in trimmed or "centralauth.inmind.site" in trimmed or "centralauth.mindstack.local" in trimmed):
        trimmed = re.sub(r"https?://(?:auth|centralauth)\.inmind\.site", base_sso, trimmed)
        trimmed = trimmed.replace("http://centralauth.mindstack.local", base_sso)

    # 1. central:// (Unified canonical protocol)
    if trimmed.startswith("central://"):
        path = trimmed[len("central://"):].lstrip("/")
        if "/" in path:
            # Custom folder/filename
            if path.startswith("static/"):
                return f"{base_sso}/{path}"
            elif path.startswith("uploads/"):
                return f"{base_sso}/static/{path}"
            elif path.startswith("tts/") or path.startswith("media/"):
                return f"{base_sso}/static/uploads/{path}"
            else:
                # Direct subfolder under static (e.g. static/<folder>/<filename>)
                return f"{base_sso}/static/{path}"
        else:
            # Bare filename: check audio extension
            ext = path.split(".")[-1].lower() if "." in path else ""
            subfolder = "tts" if ext in AUDIO_EXTENSIONS else "media"
            return f"{base_sso}/static/uploads/{subfolder}/{path}"

    # 2. legacy central-media://
    if trimmed.startswith("central-media://"):
        filename = trimmed[len("central-media://"):].lstrip("/")
        return f"{base_sso}/static/uploads/media/{filename}"

    # 3. legacy central-tts://
    if trimmed.startswith("central-tts://"):
        filename = trimmed[len("central-tts://"):].lstrip("/")
        return f"{base_sso}/static/uploads/tts/{filename}"

    # 4. Relative paths /static/
    if trimmed.startswith("/static/"):
        return f"{base_sso}{trimmed}"

    return trimmed


def unresolve_central_url(url: Optional[str], sso_url: str = "") -> str:
    """
    Converts full or relative CentralAuth URLs into the unified canonical pseudo-protocol
    `central://<filename>` or `central://<folder>/<filename>`.
    """
    if not url or not isinstance(url, str):
        return ""
    trimmed = url.strip()
    if not trimmed:
        return ""

    # Already central://
    if trimmed.startswith("central://"):
        return trimmed

    # Convert legacy central-media:// -> central://
    if trimmed.startswith("central-media://"):
        filename = trimmed[len("central-media://"):].lstrip("/")
        return f"central://{filename}"

    # Convert legacy central-tts:// -> central://
    if trimmed.startswith("central-tts://"):
        filename = trimmed[len("central-tts://"):].lstrip("/")
        return f"central://{filename}"

    # Match audio TTS: /static/uploads/tts/<filename> -> central://<filename>
    tts_match = re.search(r"(?:https?://[^/]+)?/static/uploads/tts/([^\s?#]+)", trimmed)
    if tts_match:
        return f"central://{tts_match.group(1)}"

    # Match general Media: /static/uploads/media/<filename> -> central://<filename>
    media_match = re.search(r"(?:https?://[^/]+)?/static/uploads/media/([^\s?#]+)", trimmed)
    if media_match:
        return f"central://{media_match.group(1)}"

    # Match general static/uploads/<folder>/<filename>
    uploads_match = re.search(r"(?:https?://[^/]+)?/static/uploads/([^\s?#]+)", trimmed)
    if uploads_match:
        return f"central://uploads/{uploads_match.group(1)}"

    # Match general static/<folder>/<filename>
    static_match = re.search(r"(?:https?://[^/]+)?/static/([^\s?#]+)", trimmed)
    if static_match:
        return f"central://{static_match.group(1)}"

    return trimmed


def resolve_question_dict(q_dict: dict, sso_url: str = "https://auth.inmind.site") -> dict:
    """Recursively resolves media URLs in question dictionary."""
    if not isinstance(q_dict, dict):
        return q_dict

    for field in ["image", "audio"]:
        if field in q_dict and q_dict[field]:
            q_dict[field] = resolve_central_url(q_dict[field], sso_url)

    others = q_dict.get("others")
    if isinstance(others, dict):
        for field in ["image", "audio", "image_url", "audio_url"]:
            if field in others and others[field]:
                others[field] = resolve_central_url(others[field], sso_url)

    return q_dict


def resolve_group_dict(g_dict: dict, sso_url: str = "https://auth.inmind.site") -> dict:
    """Resolves media URLs in question group dictionary."""
    if not isinstance(g_dict, dict):
        return g_dict

    for field in ["image_url", "audio_url"]:
        if field in g_dict and g_dict[field]:
            g_dict[field] = resolve_central_url(g_dict[field], sso_url)

    return g_dict
