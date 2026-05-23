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
