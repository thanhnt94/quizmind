from sqlalchemy import func, Integer, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.quiz.models import Quiz, Question, Option, Category
from app.modules.quiz.schemas import QuizSchema, QuestionSchema, CategorySchema

class QuizService:
    @staticmethod
    async def create_quiz(db: AsyncSession, quiz_data: QuizSchema):
        db_quiz = Quiz(
            title=quiz_data.title,
            description=quiz_data.description,
            category_id=quiz_data.category_id,
            creator_id=quiz_data.creator_id,
            time_limit=quiz_data.time_limit,
            is_active=quiz_data.is_active
        )
        db.add(db_quiz)
        await db.commit()
        await db.refresh(db_quiz)
        return db_quiz

    @staticmethod
    async def add_question(db: AsyncSession, quiz_id: int, question_data: QuestionSchema):
        db_question = Question(
            quiz_id=quiz_id,
            content=question_data.content,
            image=question_data.image,
            audio=question_data.audio,
            question_type=question_data.question_type,
            explanation=question_data.explanation,
            ai_explanation=question_data.ai_explanation,
            others=question_data.others,
            points=question_data.points
        )
        db.add(db_question)
        await db.commit()
        await db.refresh(db_question)
        
        for opt in question_data.options:
            db_opt = Option(
                question_id=db_question.id,
                content=opt.content,
                is_correct=opt.is_correct
            )
            db.add(db_opt)
        
        await db.commit()
        await db.refresh(db_question)
        return db_question

    @staticmethod
    async def bulk_add_questions(db: AsyncSession, quiz_id: int, questions_data: list[QuestionSchema]):
        db_questions = []
        for q_data in questions_data:
            db_question = Question(
                quiz_id=quiz_id,
                content=q_data.content,
                image=q_data.image,
                audio=q_data.audio,
                question_type=q_data.question_type,
                explanation=q_data.explanation,
                ai_explanation=q_data.ai_explanation,
                others=q_data.others,
                points=q_data.points
            )
            # Associate Option objects using the options relationship
            db_question.options = [
                Option(content=opt.content, is_correct=opt.is_correct)
                for opt in q_data.options
            ]
            db_questions.append(db_question)
            
        db.add_all(db_questions)
        await db.commit()
        return db_questions

    @staticmethod
    async def get_quizzes(db: AsyncSession, skip: int = 0, limit: int = 100):
        from sqlalchemy import func
        from app.modules.quiz.models import Question, Tag
        
        # Select Quiz and its question count in a single efficient query
        stmt = select(
            Quiz,
            select(func.count(Question.id)).where(Question.quiz_id == Quiz.id).scalar_subquery().label("q_count")
        ).options(selectinload(Quiz.tags)).offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        return result.all()

    @staticmethod
    async def set_quiz_tags(db: AsyncSession, quiz_id: int, tag_names: list[str]):
        from app.modules.quiz.models import Tag
        
        # 1. Get or create tags
        tags = []
        for name in tag_names:
            name = name.strip().upper()
            if not name: continue
            
            result = await db.execute(select(Tag).where(Tag.name == name))
            tag = result.scalar_one_or_none()
            if not tag:
                tag = Tag(name=name)
                db.add(tag)
                await db.flush()
            tags.append(tag)
            
        # 2. Assign to quiz
        result = await db.execute(select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.tags)))
        quiz = result.scalar_one_or_none()
        if quiz:
            quiz.tags = tags
            await db.commit()
            return True
        return False

    @staticmethod
    async def get_quiz_by_id(db: AsyncSession, quiz_id: int):
        result = await db.execute(
            select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions).selectinload(Question.options), selectinload(Quiz.tags))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_quiz_with_stats(db: AsyncSession, quiz_id: int, user_id: int = None):
        from app.modules.quiz.models import UserAnswer, Question, QuizAttempt
        
        result = await db.execute(
            select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions).selectinload(Question.options), selectinload(Quiz.tags))
        )
        quiz = result.scalar_one_or_none()
        if not quiz:
            return None
            
        # Get all stats for this quiz's questions in one go
        stats_query = select(
            UserAnswer.question_id,
            func.count(UserAnswer.id).label("total"),
            func.sum(func.cast(UserAnswer.is_correct, Integer)).label("correct"),
            func.avg(UserAnswer.active_time).label("avg_time")
        ).join(Question).where(Question.quiz_id == quiz_id)
        
        if user_id:
            stats_query = stats_query.join(QuizAttempt, UserAnswer.attempt_id == QuizAttempt.id).where(QuizAttempt.user_id == user_id)
            
        stats_query = stats_query.group_by(UserAnswer.question_id)
        
        stats_results = await db.execute(stats_query)
        stats_map = {row.question_id: row for row in stats_results}
            
        # Assign stats to each question
        for q in quiz.questions:
            row = stats_map.get(q.id)
            total = row.total if row else 0
            correct = row.correct if row else 0
            
            q.stats = {
                "total": total,
                "correct": correct,
                "wrong": total - correct,
                "avg_time": round(row.avg_time if row else 0, 1)
            }
        
        return quiz

    @staticmethod
    async def get_today_review(db: AsyncSession, user_id: int):
        from app.modules.quiz.models import UserQuizGoal, UserDailyProgress, Quiz, Question, UserQuestionMastery, QuizAttempt
        from app.modules.gamification.models import UserDailyActivity
        from datetime import datetime
        import math
        
        # 1. Fetch active goals
        res = await db.execute(
            select(UserQuizGoal).where(UserQuizGoal.user_id == user_id, UserQuizGoal.status == "active")
        )
        active_goals = res.scalars().all()
        
        active_quiz_ids = [goal.quiz_id for goal in active_goals]
        
        # Fetch attempts where is_archived is False
        attempt_res = await db.execute(
            select(QuizAttempt.quiz_id).where(
                QuizAttempt.user_id == user_id,
                QuizAttempt.is_archived == False
            ).distinct()
        )
        attempt_quiz_ids = [row[0] for row in attempt_res.all()]
        
        # Combine distinct quiz IDs
        all_quiz_ids = list(set(active_quiz_ids + attempt_quiz_ids))
        
        if not all_quiz_ids:
            return {
                "due_cards_count": 0,
                "decks_summary": [],
                "streak_at_risk": False,
                "estimated_minutes": 0
            }
            
        now = datetime.utcnow()
        today_str = now.strftime("%Y-%m-%d")
        
        # Fetch active goal configurations (map quiz_id -> goal)
        goals_map = {goal.quiz_id: goal for goal in active_goals}
        
        # Bulk query daily progress for active goals
        goal_ids = [goal.id for goal in active_goals]
        progress_map = {}
        if goal_ids:
            prog_res = await db.execute(
                select(UserDailyProgress).where(
                    UserDailyProgress.goal_id.in_(goal_ids),
                    UserDailyProgress.date == today_str
                )
            )
            progress_map = {p.goal_id: p for p in prog_res.scalars().all()}
            
        decks_summary = []
        total_due_review = 0
        total_due_new = 0
        
        for quiz_id in all_quiz_ids:
            # Get quiz title
            quiz_stmt = select(Quiz.title).where(Quiz.id == quiz_id)
            quiz_title_res = await db.execute(quiz_stmt)
            quiz_title = quiz_title_res.scalar() or f"Quiz {quiz_id}"
            
            # Count total questions in quiz
            total_questions_stmt = select(func.count(Question.id)).where(Question.quiz_id == quiz_id)
            total_questions_res = await db.execute(total_questions_stmt)
            total_questions = total_questions_res.scalar() or 0
            
            # Leitner due reviews: cards in box_level < 5
            due_reviews_stmt = select(func.count(UserQuestionMastery.id)).join(
                Question, UserQuestionMastery.question_id == Question.id
            ).where(
                Question.quiz_id == quiz_id,
                UserQuestionMastery.user_id == user_id,
                UserQuestionMastery.box_level < 5
            )
            due_reviews_res = await db.execute(due_reviews_stmt)
            due_reviews_count = due_reviews_res.scalar() or 0
            
            # Count total attempted/learned questions to determine unattempted (new) questions
            learned_stmt = select(func.count(UserQuestionMastery.id)).join(
                Question, UserQuestionMastery.question_id == Question.id
            ).where(
                Question.quiz_id == quiz_id,
                UserQuestionMastery.user_id == user_id
            )
            learned_res = await db.execute(learned_stmt)
            learned_count = learned_res.scalar() or 0
            unattempted_count = max(0, total_questions - learned_count)
            
            # Determine due new count under active goal
            due_new_count = 0
            goal = goals_map.get(quiz_id)
            if goal:
                progress = progress_map.get(goal.id)
                done_today = progress.count_done if progress else 0
                due_new_count = max(0, goal.daily_target - done_today)
                # Cap at the actual number of unattempted questions in the deck
                due_new_count = min(due_new_count, unattempted_count)
                
            if due_reviews_count > 0 or due_new_count > 0:
                decks_summary.append({
                    "quiz_id": quiz_id,
                    "title": quiz_title,
                    "due_count": due_reviews_count,
                    "new_count": due_new_count
                })
                total_due_review += due_reviews_count
                total_due_new += due_new_count
                
        # Check if daily activity exists for today in gamification
        act_res = await db.execute(
            select(UserDailyActivity).where(
                UserDailyActivity.user_id == user_id,
                UserDailyActivity.activity_date == now.date()
            )
        )
        has_activity_today = act_res.scalar_one_or_none() is not None
        
        # Calculate estimated minutes
        estimated_minutes = math.ceil((total_due_review * 15 + total_due_new * 30) / 60)
        if (total_due_review + total_due_new) > 0 and estimated_minutes == 0:
            estimated_minutes = 1
            
        due_cards_count = total_due_review + total_due_new
        streak_at_risk = not has_activity_today and (due_cards_count > 0 or len(active_goals) > 0)
        
        return {
            "due_cards_count": due_cards_count,
            "decks_summary": decks_summary,
            "streak_at_risk": streak_at_risk,
            "estimated_minutes": estimated_minutes
        }

