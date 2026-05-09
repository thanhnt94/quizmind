import os

file_path = r'c:\Code\Ecosystem\QuizMind\client\src\pages\QuizPlay.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Remove the outside badge
badge_found = False
new_lines = []
skip_next = False
for i in range(len(lines)):
    if 'bg-slate-100 rounded-full border border-slate-200/50' in lines[i]:
        # Skip this line and its surrounding div if possible
        # Usually it's in a mb-6 div
        if 'mb-6' in lines[i-1]:
            new_lines.pop() # remove <div className="mb-6...">
        badge_found = True
        skip_next = True # skip the <Hash... line
        continue
    if skip_next:
        if '</span>' in lines[i]:
            skip_next = False
            # Also skip the closing div
            continue
        continue
    if badge_found and '</div>' in lines[i] and len(new_lines) > 0 and 'mb-6' not in new_lines[-1]:
        # Check if we should skip the closing div of the badge container
        # This is tricky without a real parser. Let's try a simpler approach.
        pass
    new_lines.append(lines[i])

# Let's try a safer string-based replacement for the whole section
content = "".join(lines)

# Remove the old badge container
old_badge_block = """            <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200/50">
               <Hash className="w-3 h-3 text-slate-400" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{currentIndex + 1} / {session.questions?.length || 0}</span>
            </div>
          </div>"""

# Alternative if spacing is different
import re
content = re.sub(r'<div className="mb-6 flex items-center justify-between">\s+<div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200/50">.*?</div>\s+</div>', '', content, flags=re.DOTALL)

# Insert the new prominent badge inside the white card
new_badge = """                  <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                     <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200 flex-shrink-0">
                        <Hash className="w-4 h-4 text-indigo-100" />
                        <span className="text-[11px] font-black tracking-[0.2em]">{currentIndex + 1} / {session.questions?.length || 0}</span>
                     </div>
                     
                     <div className="flex flex-wrap items-center gap-2">"""

content = content.replace('<div className="flex flex-wrap items-center gap-2 mb-6">', new_badge)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
