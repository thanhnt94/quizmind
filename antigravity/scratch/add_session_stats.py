import os

file_path = r'c:\Code\Ecosystem\QuizMind\client\src\pages\QuizPlay.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Define renderSessionStats
stats_func = """  const renderSessionStats = () => {
    const answeredCount = Object.keys(sessionAnswers).length
    const correctCount = Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
      const q = session.questions[Number(idx)]
      return q.options[optIdx]?.is_correct
    }).length
    const wrongCount = answeredCount - correctCount
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

    return (
      <div className="bg-slate-50/80 rounded-[1.5rem] p-4 mb-4 border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SESSION SUMMARY</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 rounded-full text-white">
            <Target className="w-2.5 h-2.5" />
            <span className="text-[9px] font-black">{accuracy}%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 bg-white rounded-xl shadow-sm border border-slate-100/50">
            <span className="text-[14px] font-black text-slate-700">{answeredCount}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase">DONE</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-emerald-50 rounded-xl shadow-sm border border-emerald-100/50">
            <span className="text-[14px] font-black text-emerald-600">{correctCount}</span>
            <span className="text-[8px] font-bold text-emerald-400 uppercase">RIGHT</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-rose-50 rounded-xl shadow-sm border border-rose-100/50">
            <span className="text-[14px] font-black text-rose-600">{wrongCount}</span>
            <span className="text-[8px] font-bold text-rose-400 uppercase">WRONG</span>
          </div>
        </div>
      </div>
    )
  }

"""

# Insert the function before renderQuestionMapGrid
content = "".join(lines)
content = content.replace('  const renderQuestionMapGrid = () => (', stats_func + '  const renderQuestionMapGrid = () => (')

# Inject renderSessionStats() into containers
content = content.replace('{renderQuestionMapGrid()}', '{renderSessionStats()}\n               {renderQuestionMapGrid()}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
