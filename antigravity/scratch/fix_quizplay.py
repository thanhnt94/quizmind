import os

file_path = r'c:\Code\Ecosystem\QuizMind\client\src\pages\QuizPlay.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix Attempts block and gap
for i in range(len(lines)):
    if 'gap-3 mb-6' in lines[i] and 'flex-wrap' in lines[i]:
        lines[i] = lines[i].replace('gap-3 mb-6', 'gap-2 mb-6')
    if 'Attempts:' in lines[i] and '<strong' in lines[i]:
        lines[i] = lines[i].replace('Attempts:', '<span className="hidden sm:inline">Attempts: </span>')
    if 'bg-slate-50 px-3 py-1.5' in lines[i]:
        lines[i] = lines[i].replace('px-3 py-1.5', 'px-2.5 py-1.5')

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
