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
        elif time_filter == "month":
            start_date = today.replace(day=1)

        # 1. Fetch current user baseline
        cur_user_res = await db.execute(select(User).where(User.id == current_user_id))
        cur_user = cur_user_res.scalar_one_or_none()
        cur_gam_res = await db.execute(select(UserGamification).where(UserGamification.user_id == current_user_id))
        cur_gam = cur_gam_res.scalar_one_or_none()
        
        cur_streak = cur_gam.streak_count if cur_gam else 0
        cur_level = cur_gam.level if cur_gam else 1
        
        # Current user's XP
        if time_filter == "all_time":
            cur_xp = cur_gam.xp if cur_gam else 0
        else:
            cur_xp_res = await db.execute(
                select(func.sum(XPTransaction.amount)).where(
                    XPTransaction.user_id == current_user_id,
                    XPTransaction.created_at >= start_date
                )
            )
            cur_xp = cur_xp_res.scalar() or 0

        # Current user's questions & time from UserDailyStats
        q_time_stmt = select(
            func.sum(UserDailyStats.questions_attempted).label("total_q"),
            func.sum(UserDailyStats.total_time_seconds).label("total_time")
        ).where(UserDailyStats.user_id == current_user_id)
        if start_date:
            q_time_stmt = q_time_stmt.where(UserDailyStats.date >= start_date.date())
        q_time_res = (await db.execute(q_time_stmt)).one_or_none()
        cur_questions = (q_time_res[0] if q_time_res else 0) or 0
        cur_time = (q_time_res[1] if q_time_res else 0) or 0

        # --- A. XP LEADERBOARD ---
        if time_filter == "all_time":
            stmt_xp = (
                select(
                    User.id, User.username, User.full_name,
                    UserGamification.xp.label("val"), UserGamification.level, UserGamification.streak_count
                )
                .join(UserGamification, User.id == UserGamification.user_id)
                .order_by(desc(UserGamification.xp))
                .limit(50)
            )
            xp_res = await db.execute(stmt_xp)
            xp_rows = xp_res.all()
            
            ahead_xp_res = await db.execute(
                select(func.count(UserGamification.user_id))
                .where(UserGamification.xp > cur_xp)
            )
            xp_rank = (ahead_xp_res.scalar() or 0) + 1
        else:
            stmt_xp = (
                select(
                    User.id, User.username, User.full_name,
                    func.sum(XPTransaction.amount).label("val"),
                    func.coalesce(UserGamification.level, 1).label("level"),
                    func.coalesce(UserGamification.streak_count, 0).label("streak_count")
                )
                .join(User, User.id == XPTransaction.user_id)
                .outerjoin(UserGamification, UserGamification.user_id == XPTransaction.user_id)
                .where(XPTransaction.created_at >= start_date)
                .group_by(User.id, User.username, User.full_name, UserGamification.level, UserGamification.streak_count)
                .order_by(desc(func.sum(XPTransaction.amount)))
                .limit(50)
            )
            xp_res = await db.execute(stmt_xp)
            xp_rows = xp_res.all()

            ahead_sub = (
                select(XPTransaction.user_id)
                .where(XPTransaction.created_at >= start_date)
                .group_by(XPTransaction.user_id)
                .having(func.sum(XPTransaction.amount) > cur_xp)
                .subquery()
            )
            ahead_xp_res = await db.execute(select(func.count()).select_from(ahead_sub))
            xp_rank = (ahead_xp_res.scalar() or 0) + 1

        xp_list = [
            {
                "rank": idx,
                "user_id": r.id,
                "username": r.username,
                "full_name": r.full_name or r.username,
                "value": int(r.val or 0),
                "level": r.level or 1,
                "streak": r.streak_count or 0,
                "active_status": "online",
                "active_text": "Active now"
            }
            for idx, r in enumerate(xp_rows, 1)
        ]

        # --- B. STREAK LEADERBOARD ---
        stmt_streak = (
            select(
                User.id, User.username, User.full_name,
                UserGamification.streak_count.label("val"), UserGamification.level, UserGamification.streak_count
            )
            .join(UserGamification, User.id == UserGamification.user_id)
            .order_by(desc(UserGamification.streak_count))
            .limit(50)
        )
        streak_res = await db.execute(stmt_streak)
        streak_rows = streak_res.all()
        ahead_streak_res = await db.execute(
            select(func.count(UserGamification.user_id))
            .where(UserGamification.streak_count > cur_streak)
        )
        streak_rank = (ahead_streak_res.scalar() or 0) + 1

        streak_list = [
            {
                "rank": idx,
                "user_id": r.id,
                "username": r.username,
                "full_name": r.full_name or r.username,
                "value": int(r.val or 0),
                "level": r.level or 1,
                "streak": r.streak_count or 0,
                "active_status": "online",
                "active_text": "Active now"
            }
            for idx, r in enumerate(streak_rows, 1)
        ]

        # --- C. QUESTIONS LEADERBOARD ---
        stmt_q = (
            select(
                User.id, User.username, User.full_name,
                func.sum(UserDailyStats.questions_attempted).label("val"),
                func.coalesce(UserGamification.level, 1).label("level"),
                func.coalesce(UserGamification.streak_count, 0).label("streak_count")
            )
            .join(User, User.id == UserDailyStats.user_id)
            .outerjoin(UserGamification, UserGamification.user_id == User.id)
        )
        if start_date:
            stmt_q = stmt_q.where(UserDailyStats.date >= start_date.date())
        stmt_q = (
            stmt_q.group_by(User.id, User.username, User.full_name, UserGamification.level, UserGamification.streak_count)
            .order_by(desc(func.sum(UserDailyStats.questions_attempted)))
            .limit(50)
        )
        q_res = await db.execute(stmt_q)
        q_rows = q_res.all()

        ahead_q_stmt = select(func.count(func.distinct(UserDailyStats.user_id))).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.questions_attempted) > cur_questions)
        if start_date:
            ahead_q_stmt = select(func.count(func.distinct(UserDailyStats.user_id))).where(UserDailyStats.date >= start_date.date()).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.questions_attempted) > cur_questions)
        ahead_q_res = await db.execute(ahead_q_stmt)
        q_rank = len(ahead_q_res.all()) + 1

        questions_list = [
            {
                "rank": idx,
                "user_id": r.id,
                "username": r.username,
                "full_name": r.full_name or r.username,
                "value": int(r.val or 0),
                "level": r.level or 1,
                "streak": r.streak_count or 0,
                "active_status": "online",
                "active_text": "Active now"
            }
            for idx, r in enumerate(q_rows, 1)
        ]

        # --- D. TIME LEADERBOARD ---
        stmt_time = (
            select(
                User.id, User.username, User.full_name,
                func.sum(UserDailyStats.total_time_seconds).label("val"),
                func.coalesce(UserGamification.level, 1).label("level"),
                func.coalesce(UserGamification.streak_count, 0).label("streak_count")
            )
            .join(User, User.id == UserDailyStats.user_id)
            .outerjoin(UserGamification, UserGamification.user_id == User.id)
        )
        if start_date:
            stmt_time = stmt_time.where(UserDailyStats.date >= start_date.date())
        stmt_time = (
            stmt_time.group_by(User.id, User.username, User.full_name, UserGamification.level, UserGamification.streak_count)
            .order_by(desc(func.sum(UserDailyStats.total_time_seconds)))
            .limit(50)
        )
        time_res = await db.execute(stmt_time)
        time_rows = time_res.all()

        ahead_time_stmt = select(func.count(func.distinct(UserDailyStats.user_id))).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.total_time_seconds) > cur_time)
        if start_date:
            ahead_time_stmt = select(func.count(func.distinct(UserDailyStats.user_id))).where(UserDailyStats.date >= start_date.date()).group_by(UserDailyStats.user_id).having(func.sum(UserDailyStats.total_time_seconds) > cur_time)
        ahead_time_res = await db.execute(ahead_time_stmt)
        time_rank = len(ahead_time_res.all()) + 1

        time_list = [
            {
                "rank": idx,
                "user_id": r.id,
                "username": r.username,
                "full_name": r.full_name or r.username,
                "value": int(r.val or 0),
                "total_time": int(r.val or 0),
                "level": r.level or 1,
                "streak": r.streak_count or 0,
                "active_status": "online",
                "active_text": "Active now"
            }
            for idx, r in enumerate(time_rows, 1)
        ]

        # Compatibility list for older widgets in Dashboard.tsx
        compat_leaderboard = [
            {
                "rank": x["rank"],
                "user_id": x["user_id"],
                "username": x["username"],
                "xp": x["value"],
                "level": x["level"],
                "streak": x["streak"],
                "is_current_user": x["user_id"] == current_user_id
            }
            for x in xp_list[:5]
        ]
        compat_time = [
            {
                "rank": t["rank"],
                "user_id": t["user_id"],
                "username": t["username"],
                "total_time": t["value"],
                "is_current_user": t["user_id"] == current_user_id
            }
            for t in time_list[:5]
        ]

        return {
            "xp": {
                "list": xp_list,
                "user_rank": xp_rank,
                "user_value": cur_xp
            },
            "streak": {
                "list": streak_list,
                "user_rank": streak_rank,
                "user_value": cur_streak
            },
            "questions": {
                "list": questions_list,
                "user_rank": q_rank,
                "user_value": cur_questions
            },
            "time": {
                "list": time_list,
                "user_rank": time_rank,
                "user_value": cur_time
            },
            # Dashboard.tsx compatibility
            "leaderboard": compat_leaderboard,
            "current_user_rank": xp_rank,
            "time_leaderboard": compat_time,
            "current_user_time_rank": time_rank
        }

    @staticmethod
    async def get_weekly_report(db: AsyncSession, user_id: int):
        today = datetime.utcnow().date()
        start_cur = today - timedelta(days=6)
        
        cur_stmt = select(
            func.sum(UserDailyStats.questions_attempted).label("total_q"),
            func.sum(UserDailyStats.correct_answers).label("total_correct"),
            func.sum(UserDailyStats.total_time_seconds).label("total_time")
        ).where(
            UserDailyStats.user_id == user_id,
            UserDailyStats.date >= start_cur
        )
        cur_res = (await db.execute(cur_stmt)).one_or_none()
        
        start_prev = today - timedelta(days=13)
        end_prev = today - timedelta(days=7)
        prev_stmt = select(
            func.sum(UserDailyStats.questions_attempted).label("total_q"),
            func.sum(UserDailyStats.correct_answers).label("total_correct"),
            func.sum(UserDailyStats.total_time_seconds).label("total_time")
        ).where(
            UserDailyStats.user_id == user_id,
            UserDailyStats.date >= start_prev,
            UserDailyStats.date <= end_prev
        )
        prev_res = (await db.execute(prev_stmt)).one_or_none()
        
        cur_q = (cur_res.total_q if cur_res and cur_res.total_q else 0) or 0
        cur_correct = (cur_res.total_correct if cur_res and cur_res.total_correct else 0) or 0
        cur_time = (cur_res.total_time if cur_res and cur_res.total_time else 0) or 0
        cur_accuracy = round((cur_correct / cur_q * 100), 1) if cur_q > 0 else 0.0
        
        prev_q = (prev_res.total_q if prev_res and prev_res.total_q else 0) or 0
        prev_correct = (prev_res.total_correct if prev_res and prev_res.total_correct else 0) or 0
        prev_accuracy = round((prev_correct / prev_q * 100), 1) if prev_q > 0 else 0.0
        
        q_delta = cur_q - prev_q
        q_pct_change = round((q_delta / prev_q * 100), 1) if prev_q > 0 else (100.0 if cur_q > 0 else 0.0)
        accuracy_delta = round(cur_accuracy - prev_accuracy, 1)
        
        best_stmt = select(
            UserDailyStats.date,
            UserDailyStats.questions_attempted
        ).where(
            UserDailyStats.user_id == user_id,
            UserDailyStats.date >= start_cur
        ).order_by(desc(UserDailyStats.questions_attempted)).limit(1)
        best_res = (await db.execute(best_stmt)).first()
        
        best_day = "N/A"
        if best_res and best_res[0]:
            dt = best_res[0]
            if isinstance(dt, str):
                try:
                    dt = datetime.strptime(dt[:10], "%Y-%m-%d")
                except Exception:
                    pass
            if isinstance(dt, (datetime, date)):
                best_day = dt.strftime("%A")
                
        insights = []
        if cur_q == 0:
            insights = [
                "You haven't practiced any questions this week yet. Start with a quick 5-question session today! 🚀",
                "Regular daily practice builds strong retention and prevents memory decay."
            ]
        else:
            insights.append(f"Great pace! You answered {cur_q} questions this week. Keep up this momentum! 🔥")
            if accuracy_delta > 0:
                insights.append(f"Precision Boost! Your accuracy increased by {accuracy_delta}% compared to last week. Solid mastery! 🎯")
            elif accuracy_delta < 0:
                insights.append("Focus Tip: Your accuracy dipped slightly. Try using 'Review' mode to strengthen weak questions. 🧠")
            else:
                insights.append("Great consistency! Your learning accuracy is holding perfectly steady. 📈")
                
            if cur_time > 1200:
                insights.append(f"Deep Focus: You invested {round(cur_time / 60, 1)} minutes in focused study. Outstanding stamina! ⏱️")
            else:
                insights.append("Tip: Even 3 to 5 minutes of daily practice reinforces neural pathways effectively! ⚡")
                
        return {
            "current_week": {
                "questions": cur_q,
                "accuracy": cur_accuracy,
                "time_minutes": round(cur_time / 60, 1)
            },
            "previous_week": {
                "questions": prev_q,
                "accuracy": prev_accuracy
            },
            "deltas": {
                "questions_change_pct": q_pct_change,
                "questions_change_absolute": q_delta,
                "accuracy_change": accuracy_delta
            },
            "best_day": best_day,
            "ai_insights": insights
        }

    @staticmethod
    async def get_speed_accuracy_stats(db: AsyncSession, user_id: int):
        stmt = select(
            func.sum(case((UserAnswer.active_time <= 3.0, 1), else_=0)).label("fast_total"),
            func.sum(case(((UserAnswer.active_time <= 3.0) & (UserAnswer.is_correct == True), 1), else_=0)).label("fast_correct"),
            
            func.sum(case(((UserAnswer.active_time > 3.0) & (UserAnswer.active_time <= 7.0), 1), else_=0)).label("optimal_total"),
            func.sum(case(((UserAnswer.active_time > 3.0) & (UserAnswer.active_time <= 7.0) & (UserAnswer.is_correct == True), 1), else_=0)).label("optimal_correct"),
            
            func.sum(case(((UserAnswer.active_time > 7.0) & (UserAnswer.active_time <= 15.0), 1), else_=0)).label("calculated_total"),
            func.sum(case(((UserAnswer.active_time > 7.0) & (UserAnswer.active_time <= 15.0) & (UserAnswer.is_correct == True), 1), else_=0)).label("calculated_correct"),
            
            func.sum(case((UserAnswer.active_time > 15.0, 1), else_=0)).label("deep_total"),
            func.sum(case(((UserAnswer.active_time > 15.0) & (UserAnswer.is_correct == True), 1), else_=0)).label("deep_correct"),
            
            func.sum(case((UserAnswer.is_correct == True, UserAnswer.active_time), else_=0.0)).label("sum_time_correct"),
            func.sum(case((UserAnswer.is_correct == True, 1), else_=0)).label("count_correct"),
            
            func.sum(case((UserAnswer.is_correct == False, UserAnswer.active_time), else_=0.0)).label("sum_time_wrong"),
            func.sum(case((UserAnswer.is_correct == False, 1), else_=0)).label("count_wrong"),
            
            func.count().label("total_answers_analyzed")
        ).join(QuizAttempt, UserAnswer.attempt_id == QuizAttempt.id)\
         .where(QuizAttempt.user_id == user_id, UserAnswer.active_time > 0)
         
        results = await db.execute(stmt)
        row = results.first()
        
        if not row or not row.total_answers_analyzed:
            return {
                "bins": [
                    {"bin": "fast", "label": "Fast (0-3s)", "accuracy": 0.0, "total": 0, "correct": 0},
                    {"bin": "optimal", "label": "Optimal (3-7s)", "accuracy": 0.0, "total": 0, "correct": 0},
                    {"bin": "calculated", "label": "Calculated (7-15s)", "accuracy": 0.0, "total": 0, "correct": 0},
                    {"bin": "deep", "label": "Deep Focus (>15s)", "accuracy": 0.0, "total": 0, "correct": 0}
                ],
                "avg_speed_correct": 0.0,
                "avg_speed_wrong": 0.0,
                "total_answers_analyzed": 0
            }
            
        fast_t = row.fast_total or 0
        fast_c = row.fast_correct or 0
        fast_acc = round((fast_c / fast_t * 100), 1) if fast_t > 0 else 0.0
        
        opt_t = row.optimal_total or 0
        opt_c = row.optimal_correct or 0
        opt_acc = round((opt_c / opt_t * 100), 1) if opt_t > 0 else 0.0
        
        calc_t = row.calculated_total or 0
        calc_c = row.calculated_correct or 0
        calc_acc = round((calc_c / calc_t * 100), 1) if calc_t > 0 else 0.0
        
        deep_t = row.deep_total or 0
        deep_c = row.deep_correct or 0
        deep_acc = round((deep_c / deep_t * 100), 1) if deep_t > 0 else 0.0
        
        avg_correct = round(float(row.sum_time_correct or 0) / max(1, row.count_correct or 1), 1) if row.count_correct else 0.0
        avg_wrong = round(float(row.sum_time_wrong or 0) / max(1, row.count_wrong or 1), 1) if row.count_wrong else 0.0
        
        return {
            "bins": [
                {"bin": "fast", "label": "Fast (0-3s)", "accuracy": fast_acc, "total": fast_t, "correct": fast_c},
                {"bin": "optimal", "label": "Optimal (3-7s)", "accuracy": opt_acc, "total": opt_t, "correct": opt_c},
                {"bin": "calculated", "label": "Calculated (7-15s)", "accuracy": calc_acc, "total": calc_t, "correct": calc_c},
                {"bin": "deep", "label": "Deep Focus (>15s)", "accuracy": deep_acc, "total": deep_t, "correct": deep_c}
            ],
            "avg_speed_correct": avg_correct,
            "avg_speed_wrong": avg_wrong,
            "total_answers_analyzed": row.total_answers_analyzed
        }

    @staticmethod
    async def get_daily_summary(db: AsyncSession, user_id: int, tz_offset: int = -420):
        from sqlalchemy.orm import joinedload
        from app.modules.quiz.models import UserQuizGoal, UserDailyProgress

        now_utc = datetime.utcnow()
        now_local = now_utc - timedelta(minutes=tz_offset)
        today_local_date = now_local.date()
        today_start_utc = datetime.combine(today_local_date, datetime.min.time()) + timedelta(minutes=tz_offset)
        today_end_utc = today_start_utc + timedelta(days=1)

        # 1. Fetch all user answers today with attempt info
        answers_stmt = (
            select(
                UserAnswer.id,
                UserAnswer.question_id,
                UserAnswer.is_correct,
                UserAnswer.active_time,
                UserAnswer.created_at,
                QuizAttempt.quiz_id,
                QuizAttempt.mode,
                QuizAttempt.id.label("attempt_id")
            )
            .join(QuizAttempt, UserAnswer.attempt_id == QuizAttempt.id)
            .where(
                QuizAttempt.user_id == user_id,
                UserAnswer.created_at >= today_start_utc,
                UserAnswer.created_at < today_end_utc
            )
            .order_by(UserAnswer.created_at.asc())
        )
        answers_res = await db.execute(answers_stmt)
        today_answers = answers_res.all()

        total_questions_studied = len(today_answers)
        correct_count = sum(1 for a in today_answers if a.is_correct)
        wrong_count = total_questions_studied - correct_count
        accuracy = round((correct_count / total_questions_studied) * 100, 1) if total_questions_studied > 0 else 0
        active_time_seconds = sum((a.active_time or 0.0) for a in today_answers)
        study_minutes = round(active_time_seconds / 60.0, 1)

        # 2. Distinct new questions answered today (first time ever by this user)
        first_answers_sub = (
            select(
                UserAnswer.question_id,
                func.min(UserAnswer.created_at).label("first_answered_at")
            )
            .join(QuizAttempt, UserAnswer.attempt_id == QuizAttempt.id)
            .where(QuizAttempt.user_id == user_id)
            .group_by(UserAnswer.question_id)
            .having(func.min(UserAnswer.created_at) >= today_start_utc)
        ).subquery()

        first_answers_res = await db.execute(select(func.count(first_answers_sub.c.question_id)))
        new_questions_learned = first_answers_res.scalar() or 0
        questions_reviewed = max(0, total_questions_studied - new_questions_learned)

        # 3. Hourly Activity Distribution (0 to 23 hours local time)
        hourly_counts = [0] * 24
        for a in today_answers:
            if a.created_at:
                local_dt = a.created_at - timedelta(minutes=tz_offset)
                hour = local_dt.hour
                if 0 <= hour < 24:
                    hourly_counts[hour] += 1

        # 4. Fetch Attempts/Sessions today
        attempts_stmt = (
            select(QuizAttempt)
            .options(joinedload(QuizAttempt.answers))
            .where(
                QuizAttempt.user_id == user_id,
                QuizAttempt.started_at >= today_start_utc,
                QuizAttempt.started_at < today_end_utc
            )
            .order_by(QuizAttempt.started_at.desc())
        )
        attempts_res = await db.execute(attempts_stmt)
        today_attempts = attempts_res.unique().scalars().all()

        quiz_ids = list(set(att.quiz_id for att in today_attempts if att.quiz_id).union(
            set(a.quiz_id for a in today_answers if a.quiz_id)
        ))
        quiz_map = {}
        if quiz_ids:
            quizzes_res = await db.execute(select(Quiz).where(Quiz.id.in_(quiz_ids)))
            for q in quizzes_res.scalars().all():
                quiz_map[q.id] = q

        sessions_data = []
        for att in today_attempts:
            q = quiz_map.get(att.quiz_id)
            att_answers = att.answers or []
            att_correct = sum(1 for ans in att_answers if ans.is_correct)
            att_total = len(att_answers)
            att_acc = round((att_correct / att_total) * 100, 1) if att_total > 0 else 0
            att_time = sum((ans.active_time or 0.0) for ans in att_answers)

            started_local = att.started_at - timedelta(minutes=tz_offset) if att.started_at else None
            time_str = started_local.strftime("%H:%M") if started_local else ""

            sessions_data.append({
                "attempt_id": att.id,
                "quiz_id": att.quiz_id,
                "quiz_title": q.title if q else f"Quiz #{att.quiz_id}",
                "quiz_cover": q.cover_image if q else None,
                "mode": att.mode or "mcq",
                "total_questions": att_total or att.total_questions or 0,
                "correct_count": att_correct,
                "accuracy": att_acc,
                "score": att.score or 0,
                "time_spent": round(att_time),
                "started_at": att.started_at.isoformat() if att.started_at else None,
                "time_str": time_str
            })

        # 5. Breakdown by Quizzes Studied
        quiz_counter = {}
        for a in today_answers:
            qid = a.quiz_id
            if qid:
                quiz_counter[qid] = quiz_counter.get(qid, 0) + 1

        quizzes_studied = []
        for qid, count in sorted(quiz_counter.items(), key=lambda x: x[1], reverse=True):
            q = quiz_map.get(qid)
            quizzes_studied.append({
                "quiz_id": qid,
                "title": q.title if q else f"Quiz #{qid}",
                "cover_image": q.cover_image if q else None,
                "questions_count": count
            })

        # 6. Fetch Gamification & Streak
        gam_res = await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))
        gam = gam_res.scalar_one_or_none()
        streak_count = gam.streak_count if gam else 0
        current_xp = gam.xp if gam else 0

        # Calculate XP earned today from answers (+10 for correct, +2 for wrong)
        xp_earned_today = (correct_count * 10) + (wrong_count * 2)

        first_session_time = None
        last_session_time = None
        if today_answers:
            first_time_local = today_answers[0].created_at - timedelta(minutes=tz_offset)
            last_time_local = today_answers[-1].created_at - timedelta(minutes=tz_offset)
            first_session_time = first_time_local.strftime("%H:%M")
            last_session_time = last_time_local.strftime("%H:%M")

        # Check roadmap goals completed today
        goals_stmt = (
            select(UserQuizGoal, UserDailyProgress)
            .outerjoin(
                UserDailyProgress,
                and_(
                    UserDailyProgress.goal_id == UserQuizGoal.id,
                    UserDailyProgress.date == today_local_date.strftime("%Y-%m-%d")
                )
            )
            .where(UserQuizGoal.user_id == user_id, UserQuizGoal.status == "active")
        )
        goals_res = await db.execute(goals_stmt)
        roadmap_goals = []
        for goal, progress in goals_res.all():
            q = quiz_map.get(goal.quiz_id)
            if not q and goal.quiz_id:
                q_res = await db.execute(select(Quiz).where(Quiz.id == goal.quiz_id))
                q = q_res.scalar_one_or_none()
            count_done = progress.count_done if progress else 0
            target = goal.daily_target or 5
            roadmap_goals.append({
                "goal_id": goal.id,
                "quiz_id": goal.quiz_id,
                "quiz_title": q.title if q else f"Quiz #{goal.quiz_id}",
                "daily_target": target,
                "count_done": count_done,
                "is_completed": count_done >= target
            })

        # Format human-readable date string
        date_str = today_local_date.strftime("%A, %b %d, %Y")

        return {
            "date_str": date_str,
            "summary": {
                "total_questions": total_questions_studied,
                "total_cards": total_questions_studied,  # compatibility
                "new_questions": new_questions_learned,
                "new_cards": new_questions_learned,      # compatibility
                "reviewed_questions": questions_reviewed,
                "reviewed_cards": questions_reviewed,    # compatibility
                "correct_count": correct_count,
                "wrong_count": wrong_count,
                "accuracy": accuracy,
                "total_time_seconds": round(active_time_seconds),
                "total_time_minutes": study_minutes,
                "total_sessions": len(today_attempts),
                "first_session_time": first_session_time,
                "last_session_time": last_session_time,
                "xp_earned": xp_earned_today,
                "streak_count": streak_count,
                "streak_completed_today": bool(total_questions_studied > 0)
            },
            "hourly_activity": hourly_counts,
            "sessions": sessions_data,
            "quizzes_studied": quizzes_studied,
            "decks_studied": quizzes_studied,  # compatibility
            "roadmap_goals": roadmap_goals
        }

    @staticmethod
    async def get_heatmap(db: AsyncSession, user_id: int):
        today = datetime.utcnow().date()
        start_date = today - timedelta(days=365)
        
        heatmap_stmt = select(
            UserDailyStats.date,
            UserDailyStats.questions_attempted
        ).where(
            UserDailyStats.user_id == user_id,
            UserDailyStats.date >= start_date
        ).order_by(UserDailyStats.date)
        
        results = await db.execute(heatmap_stmt)
        data = []
        for row in results.all():
            day_val = row[0]
            if isinstance(day_val, str):
                date_str = day_val[:10]
            elif day_val:
                date_str = day_val.strftime("%Y-%m-%d")
            else:
                date_str = ""
            data.append({
                "date": date_str,
                "count": row[1] or 0
            })
        return data

    @staticmethod
    async def get_daily_comparison_stats(db: AsyncSession, user_id: int):
        today = datetime.utcnow().date()
        start_date = datetime.combine(today - timedelta(days=13), datetime.min.time())

        # 1. Total and unique questions per day (last 14 days)
        reviews_stmt = select(
            func.date(UserAnswer.created_at).label("date_str"),
            func.count(UserAnswer.id).label("total_reviews"),
            func.count(func.distinct(UserAnswer.question_id)).label("unique_cards"),
            func.sum(UserAnswer.active_time).label("total_active_time")
        ).join(
            QuizAttempt, UserAnswer.attempt_id == QuizAttempt.id
        ).where(
            QuizAttempt.user_id == user_id,
            UserAnswer.created_at >= start_date
        ).group_by(
            func.date(UserAnswer.created_at)
        )

        # 2. Subquery for first ever answers of each question by user
        first_answers = select(
            UserAnswer.question_id,
            func.min(UserAnswer.created_at).label("first_answered_at")
        ).join(
            QuizAttempt, UserAnswer.attempt_id == QuizAttempt.id
        ).where(
            QuizAttempt.user_id == user_id
        ).group_by(
            UserAnswer.question_id
        ).subquery()

        # Questions first answered per day (last 14 days)
        new_cards_stmt = select(
            func.date(first_answers.c.first_answered_at).label("date_str"),
            func.count(first_answers.c.question_id).label("new_cards")
        ).where(
            first_answers.c.first_answered_at >= start_date
        ).group_by(
            func.date(first_answers.c.first_answered_at)
        )

        # 3. All-time daily stats for computing historical averages
        all_time_reviews_stmt = select(
            func.date(UserAnswer.created_at).label("date_str"),
            func.count(UserAnswer.id).label("total_reviews"),
            func.count(func.distinct(UserAnswer.question_id)).label("unique_cards"),
            func.sum(UserAnswer.active_time).label("total_active_time")
        ).join(
            QuizAttempt, UserAnswer.attempt_id == QuizAttempt.id
        ).where(
            QuizAttempt.user_id == user_id
        ).group_by(
            func.date(UserAnswer.created_at)
        )

        all_time_new_cards_stmt = select(
            func.date(first_answers.c.first_answered_at).label("date_str"),
            func.count(first_answers.c.question_id).label("new_cards")
        ).group_by(
            func.date(first_answers.c.first_answered_at)
        )

        reviews_res = await db.execute(reviews_stmt)
        new_cards_res = await db.execute(new_cards_stmt)
        all_reviews_res = await db.execute(all_time_reviews_stmt)
        all_new_res = await db.execute(all_time_new_cards_stmt)

        daily_map = {}
        for i in range(14):
            d = today - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            daily_map[d_str] = {
                "date": d_str,
                "new_cards": 0,
                "unique_cards": 0,
                "total_reviews": 0,
                "study_minutes": 0.0
            }

        def parse_db_date(val) -> str:
            if not val:
                return ""
            if isinstance(val, str):
                return val[:10]
            return val.strftime("%Y-%m-%d")

        for row in reviews_res.all():
            d_str = parse_db_date(row.date_str)
            if d_str in daily_map:
                daily_map[d_str]["total_reviews"] = row.total_reviews or 0
                daily_map[d_str]["unique_cards"] = row.unique_cards or 0
                daily_map[d_str]["study_minutes"] = round((row.total_active_time or 0.0) / 60.0, 1)

        for row in new_cards_res.all():
            d_str = parse_db_date(row.date_str)
            if d_str in daily_map:
                daily_map[d_str]["new_cards"] = row.new_cards or 0

        # Compute all-time averages across active days only
        all_time_by_day: dict = {}
        for row in all_reviews_res.all():
            d_str = parse_db_date(row.date_str)
            if d_str:
                all_time_by_day.setdefault(d_str, {"new_cards": 0, "unique_cards": 0, "total_reviews": 0, "study_minutes": 0.0})
                all_time_by_day[d_str]["total_reviews"] = row.total_reviews or 0
                all_time_by_day[d_str]["unique_cards"] = row.unique_cards or 0
                all_time_by_day[d_str]["study_minutes"] = round((row.total_active_time or 0.0) / 60.0, 1)
        for row in all_new_res.all():
            d_str = parse_db_date(row.date_str)
            if d_str:
                all_time_by_day.setdefault(d_str, {"new_cards": 0, "unique_cards": 0, "total_reviews": 0, "study_minutes": 0.0})
                all_time_by_day[d_str]["new_cards"] = row.new_cards or 0

        active_days = len(all_time_by_day)
        if active_days > 0:
            avg_new = round(sum(v["new_cards"] for v in all_time_by_day.values()) / active_days, 1)
            avg_unique = round(sum(v["unique_cards"] for v in all_time_by_day.values()) / active_days, 1)
            avg_reviews = round(sum(v["total_reviews"] for v in all_time_by_day.values()) / active_days, 1)
            avg_minutes = round(sum(v["study_minutes"] for v in all_time_by_day.values()) / active_days, 1)
        else:
            avg_new = avg_unique = avg_reviews = avg_minutes = 0.0

        return {
            "days": [daily_map[k] for k in sorted(daily_map.keys())],
            "all_time_avg": {
                "new_cards": avg_new,
                "unique_cards": avg_unique,
                "total_reviews": avg_reviews,
                "study_minutes": avg_minutes,
            }
        }

