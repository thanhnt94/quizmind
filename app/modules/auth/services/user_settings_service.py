from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.modules.auth.models import UserGlobalSettings

class UserSettingsService:
    @staticmethod
    async def get_or_create_settings(db: AsyncSession, user_id: int) -> UserGlobalSettings:
        stmt = select(UserGlobalSettings).where(UserGlobalSettings.user_id == user_id)
        result = await db.execute(stmt)
        settings_obj = result.scalar_one_or_none()
        
        if not settings_obj:
            settings_obj = UserGlobalSettings(user_id=user_id)
            db.add(settings_obj)
            await db.commit()
            await db.refresh(settings_obj)
            
        return settings_obj

    @staticmethod
    async def update_settings(db: AsyncSession, user_id: int, data: dict) -> UserGlobalSettings:
        settings_obj = await UserSettingsService.get_or_create_settings(db, user_id)
        
        allowed_fields = {
            "theme", "focus_timer_active", "sfx_enabled", "haptic_enabled",
            "autoplay_audio", "quiz_learning_mode", "practice_range",
            "score_mode", "time_mode", "last_quiz_id",
            "home_active_tab", "roadmap_quiz_order", "quizzes_quiz_order",
            "shuffle_choices", "shuffle_questions", "auto_expand_explanation",
            "exam_batch_size", "instant_feedback",
            "font_size", "auto_advance", "show_mastery"
        }
        
        updated = False
        for k, v in data.items():
            if k in allowed_fields and hasattr(settings_obj, k):
                setattr(settings_obj, k, v)
                updated = True
                
        if updated:
            from sqlalchemy.orm.attributes import flag_modified
            if "roadmap_quiz_order" in data:
                flag_modified(settings_obj, "roadmap_quiz_order")
            if "quizzes_quiz_order" in data:
                flag_modified(settings_obj, "quizzes_quiz_order")
            await db.commit()
            await db.refresh(settings_obj)
            
        return settings_obj

    @staticmethod
    def to_dict(settings_obj: UserGlobalSettings) -> dict:
        if not settings_obj:
            return {}
        return {
            "theme": settings_obj.theme or "light",
            "focus_timer_active": True if settings_obj.focus_timer_active is None else settings_obj.focus_timer_active,
            "sfx_enabled": True if settings_obj.sfx_enabled is None else settings_obj.sfx_enabled,
            "haptic_enabled": True if settings_obj.haptic_enabled is None else settings_obj.haptic_enabled,
            "autoplay_audio": settings_obj.autoplay_audio or "never",
            "quiz_learning_mode": settings_obj.quiz_learning_mode or "mcq",
            "practice_range": settings_obj.practice_range or "all",
            "score_mode": settings_obj.score_mode or "all",
            "time_mode": settings_obj.time_mode or "question",
            "last_quiz_id": settings_obj.last_quiz_id,
            "home_active_tab": settings_obj.home_active_tab or "roadmap",
            "roadmap_quiz_order": settings_obj.roadmap_quiz_order or [],
            "quizzes_quiz_order": settings_obj.quizzes_quiz_order or [],
            "shuffle_choices": True if settings_obj.shuffle_choices is None else settings_obj.shuffle_choices,
            "shuffle_questions": True if settings_obj.shuffle_questions is None else settings_obj.shuffle_questions,
            "auto_expand_explanation": True if settings_obj.auto_expand_explanation is None else settings_obj.auto_expand_explanation,
            "exam_batch_size": 10 if settings_obj.exam_batch_size is None else settings_obj.exam_batch_size,
            "instant_feedback": True if settings_obj.instant_feedback is None else settings_obj.instant_feedback,
            "font_size": settings_obj.font_size or "100%",
            "auto_advance": False if settings_obj.auto_advance is None else settings_obj.auto_advance,
            "show_mastery": True if settings_obj.show_mastery is None else settings_obj.show_mastery,
            "updated_at": settings_obj.updated_at.isoformat() if settings_obj.updated_at else None
        }
