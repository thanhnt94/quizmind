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
