from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.modules.auth.services.auth_service import AuthService
from app.modules.stats.services.analytics_service import AnalyticsService

router = APIRouter(tags=["Stats"])

@router.get("/stats/detailed")
async def get_detailed_stats(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_user_detailed_stats(db, user.id)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/leaderboard")
async def get_leaderboard(request: Request, time_filter: str = "all_time", db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_leaderboard(db, user.id, time_filter=time_filter)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/heatmap")
async def get_heatmap(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_heatmap(db, user.id)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/daily-comparison")
async def get_daily_comparison(request: Request, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_daily_comparison_stats(db, user.id)
    except Exception as e:
        return {"error": str(e)}

@router.get("/stats/daily-summary")
async def get_daily_summary(request: Request, tz_offset: int = -420, db: AsyncSession = Depends(get_db)):
    user = await AuthService.get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return await AnalyticsService.get_daily_summary(db, user.id, tz_offset=tz_offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
