import os

file_path = r'c:\Code\Ecosystem\QuizMind\client\src\pages\Dashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace with optional chaining
content = content.replace('data.gamify.level', 'data.gamify?.level')
content = content.replace('data.gamify.xp', 'data.gamify?.xp')
content = content.replace('data.gamify.streak', 'data.gamify?.streak')
content = content.replace('data.stats_summary.avg_accuracy', 'data.stats_summary?.avg_accuracy')
content = content.replace('data.stats_summary.total_time_hours', 'data.stats_summary?.total_time_hours')
content = content.replace('data.stats_summary.total_questions', 'data.stats_summary?.total_questions')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
