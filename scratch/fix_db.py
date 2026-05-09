import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

import os
DATABASE_URL = f"sqlite+aiosqlite:///{os.path.abspath(os.path.join(os.getcwd(), '..', 'Storage', 'database', 'quizmind.db'))}"

async def fix_ownership():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            await db.execute(text("ALTER TABLE quizzes ADD COLUMN creator_id INTEGER"))
            await db.commit()
            print("Added creator_id column.")
        except Exception as e:
            print(f"Column might already exist: {e}")
            
        await db.execute(text("UPDATE quizzes SET creator_id = 1 WHERE creator_id IS NULL"))
        await db.commit()
        print("Successfully updated quiz ownership.")

if __name__ == "__main__":
    asyncio.run(fix_ownership())
