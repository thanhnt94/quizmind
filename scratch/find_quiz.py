import sqlite3
import sys
import io

# Fix encoding for console output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

db_path = r"c:\Code\Ecosystem\Storage\database\quizmind.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT id, title FROM quizzes WHERE title LIKE '%JLPT%';")
rows = cursor.fetchall()
for row in rows:
    print(f"ID: {row[0]}, Title: {row[1]}")
conn.close()
