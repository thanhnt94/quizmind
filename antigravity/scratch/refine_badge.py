import os

file_path = r'c:\Code\Ecosystem\QuizMind\client\src\pages\QuizPlay.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the prominent question badge
old_badge = """                     <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200 flex-shrink-0">
                        <Hash className="w-4 h-4 text-indigo-100" />
                        <span className="text-[11px] font-black tracking-[0.2em]">{currentIndex + 1} / {session.questions?.length || 0}</span>
                     </div>"""

new_badge = """                     <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100/50 flex-shrink-0 shadow-sm shadow-indigo-100/50">
                        <Hash className="w-3 h-3.5 text-indigo-500" />
                        <span className="text-[11px] font-black text-indigo-600 tracking-wider">
                          <span className="text-[9px] opacity-60 mr-0.5">Q.</span>{currentIndex + 1}
                          <span className="mx-1 opacity-20">/</span>
                          <span className="opacity-50 font-bold">{session.questions?.length || 0}</span>
                        </span>
                     </div>"""

if old_badge in content:
    content = content.replace(old_badge, new_badge)
else:
    # Fallback to regex if indentation differed
    import re
    content = re.sub(r'<div className="flex items-center gap-2 px-4 py-2\.5 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200 flex-shrink-0">.*?</div>', new_badge, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
