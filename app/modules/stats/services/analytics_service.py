from sqlalchemy import select, func, desc, extract, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.quiz.models import UserAnswer, Quiz, Question, Category, QuizAttempt
from app.modules.auth.models import User
from app.modules.stats.models import UserDailyStats
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
