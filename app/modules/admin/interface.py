from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.admin.models import SystemConfig, AdminLog

class AdminInterface:
    @staticmethod
    async def get_sso_config(db: AsyncSession):
        result = await db.execute(select(SystemConfig).where(SystemConfig.id == "sso_config"))
        config = result.scalar_one_or_none()
        if not config:
            return {
                "central_auth_url": "http://centralauth.mindstack.local",
                "client_id": "quizmind_client",
                "client_secret": "****************",
                "enabled": False
            }
        return config.value

    @staticmethod
    async def update_sso_config(db: AsyncSession, config_data: dict, admin_id: int):
        result = await db.execute(select(SystemConfig).where(SystemConfig.id == "sso_config"))
        config = result.scalar_one_or_none()
        if not config:
            config = SystemConfig(id="sso_config")
            db.add(config)
        
        config.value = config_data
        
        # Keep sso_settings table (SSOConfig model) in sync for auth system routes
        try:
            from app.modules.sso_module.models import SSOConfig
            sso_result = await db.execute(select(SSOConfig))
            sso_config = sso_result.scalar_one_or_none()
            if not sso_config:
                sso_config = SSOConfig()
                db.add(sso_config)
            
            sso_config.is_enabled = bool(config_data.get("enabled", False))
            sso_config.server_url = config_data.get("central_auth_url")
            sso_config.client_id = config_data.get("client_id")
            sso_config.client_secret = config_data.get("client_secret")
        except Exception as e:
            # Prevent failure if tables are migrating
            pass
        
        # Log action
        log = AdminLog(admin_id=admin_id, action="UPDATE_SSO", details="Updated CentralAuth settings")
        db.add(log)
        await db.commit()
        return True

    @staticmethod
    async def get_ai_config(db: AsyncSession):
        result = await db.execute(select(SystemConfig).where(SystemConfig.id == "google_ai_config"))
        config = result.scalar_one_or_none()
        if not config:
            return {
                "api_key": "",
                "model_id": "gemini-2.0-flash",
                "enabled": False
            }
        return config.value

    @staticmethod
    async def update_ai_config(db: AsyncSession, config_data: dict, admin_id: int):
        result = await db.execute(select(SystemConfig).where(SystemConfig.id == "google_ai_config"))
        config = result.scalar_one_or_none()
        if not config:
            config = SystemConfig(id="google_ai_config")
            db.add(config)
        
        config.value = config_data
        
        # Log action
        log = AdminLog(admin_id=admin_id, action="UPDATE_AI", details=f"Updated Google AI settings: {config_data.get('model_id')}")
        db.add(log)
        await db.commit()
        return True
