from sqlalchemy import select, func, desc, extract, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.quiz.models import UserAnswer, Quiz, Question, Category, QuizAttempt
from app.modules.auth.models import User
from app.modules.stats.models import UserDailyStats
from app.modules.gamification.models import UserGamification
from datetime import datetime, timedelta

class AnalyticsService:
    @staticmethod
    async def get_global_stats(db: AsyncSession):
        # 1. Platform Totals in a single consolidated subquery statement
        totals_stmt = select(
            select(func.count(Question.id)).scalar_subquery().label("total_questions"),
            select(func.count(Quiz.id)).scalar_subquery().label("total_quizzes"),
            select(func.count(User.id)).scalar_subquery().label("total_users")
        )
        
        # 2. Platform Performance
        perf_stmt = select(
            func.count(UserAnswer.id).label("total"),
            func.sum(case((UserAnswer.is_correct == True, 1), else_=0)).label("correct"),
            func.avg(UserAnswer.active_time).label("avg_time")
        )
        
        # Execute both consolidated queries
        totals_res = (await db.execute(totals_stmt)).one_or_none()
        perf_res = (await db.execute(perf_stmt)).one_or_none()
        
        total_questions = totals_res.total_questions if totals_res else 0
        total_quizzes = totals_res.total_quizzes if totals_res else 0
        total_users = totals_res.total_users if totals_res else 0
        
        platform_accuracy = 0
        avg_time = 0
        if perf_res and perf_res.total > 0:
            platform_accuracy = round((perf_res.correct / perf_res.total) * 100, 1)
            avg_time = round(perf_res.avg_time or 0, 1)
            
        return {
            "total_questions": total_questions,
            "total_quizzes": total_quizzes,
            "total_users": total_users,
            "platform_accuracy": platform_accuracy,
            "avg_time_per_question": avg_time
        }

    @staticmethod
    async def get_user_detailed_stats(db: AsyncSession, user_id: int):
        # ... existing logic ...
        user_stats = await AnalyticsService._get_user_stats_internal(db, user_id)
        global_stats = await AnalyticsService.get_global_stats(db)
        
        return {
            "personal": user_stats,
            "global": global_stats
        }

    @staticmethod
    async def _get_user_stats_internal(db: AsyncSession, user_id: int):
        # Move previous logic here
        today = datetime.utcnow().date()
        start_date = today - timedelta(days=29)
        
        daily_stmt = select(
            UserDailyStats.date,
            UserDailyStats.questions_attempted,
            UserDailyStats.correct_answers,
            UserDailyStats.accuracy,
            UserDailyStats.total_time_seconds
        ).where(
            UserDailyStats.user_id == user_id,
            UserDailyStats.date >= start_date
        ).order_by(UserDailyStats.date)
        
        daily_results = await db.execute(daily_stmt)
        daily_data = []
        for row in daily_results.all():
            day_val = row[0]
            if isinstance(day_val, str):
                date_str = day_val[:10]
            elif day_val:
                date_str = day_val.strftime("%Y-%m-%d")
            else:
                date_str = ""
                
            daily_data.append({
                "date": date_str,
                "attempted": row[1] or 0,
                "correct": row[2] or 0,
                "accuracy": round((row[3] or 0) * 100, 1),
                "time_minutes": round((row[4] or 0) / 60, 1)
            })

        # 2. Category Performance
        cat_stmt = select(
            Category.name,
            func.count(UserAnswer.id).label("total"),
            func.sum(case((UserAnswer.is_correct == True, 1), else_=0)).label("correct"),
            func.avg(UserAnswer.active_time).label("avg_time")
        ).select_from(UserAnswer)\
         .join(QuizAttempt, UserAnswer.attempt_id == QuizAttempt.id)\
         .join(Question, UserAnswer.question_id == Question.id)\
         .join(Quiz, Question.quiz_id == Quiz.id)\
         .join(Category, Quiz.category_id == Category.id)\
         .where(QuizAttempt.user_id == user_id)\
         .group_by(Category.name)

        cat_results = await db.execute(cat_stmt)
        category_stats = []
        for row in cat_results.all():
            category_stats.append({
                "category": row[0],
                "total": row[1] or 0,
                "correct": row[2] or 0,
                "accuracy": round((row[2] / row[1]) * 100, 1) if row[1] and row[1] > 0 else 0,
                "avg_time": round(row[3] or 0, 1)
            })

        # 3. Overall Summary
        summary_stmt = select(
            func.sum(UserDailyStats.questions_attempted).label("total_q"),
            func.sum(UserDailyStats.correct_answers).label("total_correct"),
            func.sum(UserDailyStats.total_time_seconds).label("total_time")
        ).where(UserDailyStats.user_id == user_id)
        
        summary_res = (await db.execute(summary_stmt)).one_or_none()
        
        total_q = 0
        total_correct = 0
        total_time = 0
        
        if summary_res:
            total_q = summary_res[0] or 0
            total_correct = summary_res[1] or 0
            total_time = summary_res[2] or 0
        
        summary = {
            "total_questions": total_q,
            "total_correct": total_correct,
            "total_time_hours": round(total_time / 3600, 1),
            "global_accuracy": round((total_correct / total_q * 100), 1) if total_q > 0 else 0
        }

        # 4. Hourly Distribution (Study Hours)
        hour_stmt = select(
            extract('hour', UserAnswer.created_at).label("hour"),
            func.count(UserAnswer.id).label("count")
        ).select_from(UserAnswer)\
         .join(QuizAttempt, UserAnswer.attempt_id == QuizAttempt.id)\
         .where(QuizAttempt.user_id == user_id)\
         .group_by("hour")
        
        hour_results = await db.execute(hour_stmt)
        hourly_data = {i: 0 for i in range(24)}
        for row in hour_results.all():
            h = int(row[0]) if row[0] is not None else 0
            hourly_data[h] = row[1]
        
        hourly_formatted = [{"hour": f"{h:02d}:00", "count": count} for h, count in hourly_data.items()]

        # 5. Recent Sessions
        recent_stmt = select(
            Quiz.title,
            QuizAttempt.score,
            QuizAttempt.total_questions,
            QuizAttempt.completed_at
        ).join(Quiz, QuizAttempt.quiz_id == Quiz.id)\
         .where(QuizAttempt.user_id == user_id, QuizAttempt.completed_at != None)\
         .order_by(desc(QuizAttempt.completed_at))\
         .limit(5)
        
        recent_results = await db.execute(recent_stmt)
        recent_sessions = []
        for row in recent_results.all():
            recent_sessions.append({
                "title": row[0],
                "score": row[1],
                "total": row[2],
                "date": row[3].strftime("%Y-%m-%d %H:%M") if row[3] else ""
            })

        return {
            "daily_activity": daily_data,
            "category_performance": category_stats,
            "hourly_distribution": hourly_formatted,
            "recent_sessions": recent_sessions,
            "summary": summary
        }

    @staticmethod
    async def get_leaderboard(db: AsyncSession, current_user_id: int, time_filter: str = "all_time"):
        from app.modules.gamification.models import XPTransaction
        
        # Determine date range based on time_filter
        start_date = None
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        if time_filter == "today":
            start_date = today
        elif time_filter == "week":
            start_date = today - timedelta(days=today.weekday())

        # 1. Fetch XP Leaderboard
        if time_filter == "all_time":
            stmt_xp = (
                select(UserGamification.user_id, User.username, UserGamification.xp.label("xp"), UserGamification.level, UserGamification.streak_count)
                .join(User, User.id == UserGamification.user_id)
                .order_by(desc(UserGamification.xp))
                .limit(5)
            )
        else:
            stmt_xp = (
                select(
                    XPTransaction.user_id, 
                    User.username, 
                    func.sum(XPTransaction.amount).label("xp"),
                    UserGamification.level,
                    UserGamification.streak_count
                )
                .join(User, User.id == XPTransaction.user_id)
                .outerjoin(UserGamification, UserGamification.user_id == XPTransaction.user_id)
                .where(XPTransaction.created_at >= start_date)
                .group_by(XPTransaction.user_id, User.username, UserGamification.level, UserGamification.streak_count)
                .order_by(desc(func.sum(XPTransaction.amount)))
                .limit(5)
            )
            
        results_xp = await db.execute(stmt_xp)
        rows_xp = results_xp.all()

        leaderboard = []
        current_user_rank = None
        current_user_obj = await db.execute(select(User).where(User.id == current_user_id))
        current_user = current_user_obj.scalar_one_or_none()

        for rank, row in enumerate(rows_xp, start=1):
            entry = {
                "rank": rank,
                "user_id": row.user_id,
                "username": row.username,
                "xp": row.xp,
                "level": row.level or 1,
                "streak": row.streak_count or 0,
                "is_current_user": row.user_id == current_user_id,
            }
            leaderboard.append(entry)
            if row.user_id == current_user_id:
                current_user_rank = rank

        # If current user isn't in top 5, find their rank
        if current_user_id and current_user_rank is None and current_user:
            user_xp = 0
            ahead_count = 0
            if time_filter == "all_time":
                uxp_res = await db.execute(select(UserGamification.xp).where(UserGamification.user_id == current_user_id))
                user_xp = uxp_res.scalar() or 0
                cnt_res = await db.execute(select(func.count(UserGamification.user_id)).where(UserGamification.xp > user_xp))
                ahead_count = cnt_res.scalar() or 0
            else:
                uxp_res = await db.execute(select(func.sum(XPTransaction.amount)).where(XPTransaction.user_id == current_user_id, XPTransaction.created_at >= start_date))
                user_xp = uxp_res.scalar() or 0
                cnt_res = await db.execute(
                    select(func.count(func.distinct(XPTransaction.user_id)))
                    .where(XPTransaction.created_at >= start_date)
                    .group_by(XPTransaction.user_id)
                    .having(func.sum(XPTransaction.amount) > user_xp)
                )
                ahead_count = len(cnt_res.all())

            current_user_rank = ahead_count + 1
            
            cur_gam_res = await db.execute(select(UserGamification).where(UserGamification.user_id == current_user_id))
            cur_gam = cur_gam_res.scalar_one_or_none()
            leaderboard.append({
                "rank": current_user_rank,
                "user_id": current_user_id,
                "username": current_user.username,
                "xp": user_xp,
                "level": cur_gam.level if cur_gam else 1,
                "streak": cur_gam.streak_count if cur_gam else 0,
                "is_current_user": True,
                "out_of_top_5": True,
            })

        # 2. Fetch Time Leaderboard
        stmt_time = (
            select(UserDailyStats.user_id, User.username, func.sum(UserDailyStats.total_time_seconds).label("total_time"))
            .join(User, User.id == UserDailyStats.user_id)
        )
        if start_date:
            stmt_time = stmt_time.where(UserDailyStats.date >= start_date.date())
            
        stmt_time = stmt_time.group_by(UserDailyStats.user_id, User.username).order_by(desc(func.sum(UserDailyStats.total_time_seconds))).limit(5)
        
        time_results = await db.execute(stmt_time)
        time_rows = time_results.all()

        time_leaderboard = []
        current_user_time_rank = None
        for rank, row in enumerate(time_rows, start=1):
            uid = row.user_id
            time_leaderboard.append({
                "rank": rank,
                "user_id": uid,
                "username": row.username,
                "total_time": int(row.total_time or 0),
                "is_current_user": uid == current_user_id,
            })
            if uid == current_user_id:
                current_user_time_rank = rank

        if current_user_id and current_user_time_rank is None and current_user:
            stmt_my_time = select(func.sum(UserDailyStats.total_time_seconds)).where(UserDailyStats.user_id == current_user_id)
            if start_date:
                stmt_my_time = stmt_my_time.where(UserDailyStats.date >= start_date.date())
            user_time_res = await db.execute(stmt_my_time)
            user_time = int(user_time_res.scalar() or 0)
            
            stmt_ahead_time = select(func.count(func.distinct(UserDailyStats.user_id))).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.total_time_seconds) > user_time)
            if start_date:
                stmt_ahead_time = select(func.count(func.distinct(UserDailyStats.user_id))).where(UserDailyStats.date >= start_date.date()).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.total_time_seconds) > user_time)
            
            ahead_time_res = await db.execute(stmt_ahead_time)
            current_user_time_rank = len(ahead_time_res.all()) + 1
            
            time_leaderboard.append({
                "rank": current_user_time_rank,
                "user_id": current_user_id,
                "username": current_user.username,
                "total_time": user_time,
                "is_current_user": True,
                "out_of_top_5": True,
            })

        return {
            "leaderboard": leaderboard,
            "current_user_rank": current_user_rank,
            "time_leaderboard": time_leaderboard,
            "current_user_time_rank": current_user_time_rank,
        }
