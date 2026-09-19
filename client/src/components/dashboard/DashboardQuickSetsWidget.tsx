import React, { useState, useEffect } from 'react'
import { 
  BookOpen, 
  Check, 
  ChevronRight, 
  Sparkles,
  Layers,
  Play,
  Compass,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardQuickSetsWidgetProps {
  quizzes: any[]
  allQuizzesCount?: number
  onOpenStudyModal: (quiz: any) => void
  navigate: (url: string) => void
}

const SET_PALETTES = [
  {
    theme: 'indigo',
    avatarBg: 'bg-gradient-to-br from-indigo-100 via-indigo-50 to-violet-100',
    cardBorder: 'border-indigo-500',
    cardBg: 'bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/40',
    barTrack: 'bg-indigo-100/70',
    barFill: 'bg-gradient-to-r from-indigo-500 to-violet-600',
    mascotImage: '/mascot/owl_excited.png',
    accentColor: '#4F46E5'
  },
  {
    theme: 'purple',
    avatarBg: 'bg-gradient-to-br from-purple-100 via-purple-50 to-pink-100',
    cardBorder: 'border-purple-300',
    cardBg: 'bg-gradient-to-r from-purple-50/70 via-white to-pink-50/40',
    barTrack: 'bg-purple-100/70',
    barFill: 'bg-gradient-to-r from-purple-500 to-pink-500',
    mascotImage: '/mascot/owl_celebrating.png',
    accentColor: '#7C3AED'
  },
  {
    theme: 'emerald',
    avatarBg: 'bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100',
    cardBorder: 'border-emerald-300',
    cardBg: 'bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40',
    barTrack: 'bg-emerald-100/70',
    barFill: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    mascotImage: '/mascot/owl_sleepy.png',
    accentColor: '#059669'
  },
  {
    theme: 'sky',
    avatarBg: 'bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100',
    cardBorder: 'border-sky-300',
    cardBg: 'bg-gradient-to-r from-sky-50/70 via-white to-blue-50/40',
    barTrack: 'bg-sky-100/70',
    barFill: 'bg-gradient-to-r from-sky-500 to-blue-600',
    mascotImage: '/mascot/owl_excited.png',
    accentColor: '#0284C7'
  }
]

export function DashboardQuickSetsWidget({
  quizzes,
  allQuizzesCount,
  onOpenStudyModal,
  navigate
}: DashboardQuickSetsWidgetProps) {
  const [selectedQuizId, setSelectedQuizId] = useState<number | string | null>(null)

  // Auto-select first quiz if none selected or if list updates
  useEffect(() => {
    if (quizzes && quizzes.length > 0) {
      const firstId = quizzes[0].quiz_id ?? quizzes[0].id
      if (!selectedQuizId || !quizzes.some(q => (q.quiz_id ?? q.id) === selectedQuizId)) {
        setSelectedQuizId(firstId)
      }
    }
  }, [quizzes])

  const currentSelectedQuiz = quizzes.find(
    q => (q.quiz_id ?? q.id) === selectedQuizId
  ) || quizzes[0]

  return (
    <div className="h-full w-full flex flex-col justify-between overflow-hidden text-left select-none relative">
      {/* ═══════════ TOP HEADER: SETS TITLE & EXPLORE SHORTCUT ═══════════ */}
      <div className="flex items-center justify-between px-1 pt-1 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200/70 text-indigo-600 flex items-center justify-center shadow-2xs">
            <BookOpen className="w-5 h-5 stroke-[2.4]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
              Sets
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
              <span>Choose a set to practice</span>
              <span className="text-indigo-500">✨</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/quizzes')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100/80 hover:bg-indigo-50 border border-slate-200/70 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
          title="View all sets in library"
        >
          <span>Library</span>
          {allQuizzesCount !== undefined && allQuizzesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-600 text-[9.5px] font-black leading-none">
              {allQuizzesCount}
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ═══════════ SCROLLABLE SET SELECTION LIST (Vocaburn Card Style) ═══════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5 pb-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
        {quizzes.length === 0 ? (
          <div className="py-12 text-center bg-white/90 backdrop-blur-xs rounded-3xl border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center gap-2.5 p-5 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-100 via-violet-100 to-purple-100 text-indigo-600 flex items-center justify-center text-2xl shadow-sm">
              📚
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">
                No sets available yet ✨
              </h4>
              <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">
                Explore the public library or import new sets to start studying!
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/quizzes')}
              className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              Explore Library
            </button>
          </div>
        ) : (
          quizzes.map((quiz, idx) => {
            const quizId = quiz.quiz_id ?? quiz.id
            const isSelected = (currentSelectedQuiz?.quiz_id ?? currentSelectedQuiz?.id) === quizId
            
            const total = quiz.questions_count || quiz.total_questions || quiz.total_cards || 0
            const learned = quiz.learned_count || quiz.learned_questions || quiz.learned_cards || 0
            const mastered = quiz.mastered_count || 0
            const unlearned = Math.max(0, total - learned)
            const pct = quiz.progress_percent !== undefined
              ? quiz.progress_percent
              : (total > 0 ? Math.min(100, Math.round((learned / total) * 100)) : 0)

            const palette = SET_PALETTES[idx % SET_PALETTES.length]
            const coverSrc = quiz.cover_image || palette.mascotImage

            return (
              <div
                key={quizId}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(6)
                  setSelectedQuizId(quizId)
                }}
                className={cn(
                  "relative rounded-[28px] p-3.5 sm:p-4.5 flex items-center gap-3.5 sm:gap-4 transition-all duration-200 cursor-pointer select-none",
                  isSelected
                    ? "border-2 border-indigo-600 bg-gradient-to-r from-indigo-50/95 via-white to-violet-50/60 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-400/25"
                    : cn("border border-slate-200/90 hover:border-slate-300 shadow-xs", palette.cardBg)
                )}
              >
                {/* Set Mascot / Avatar */}
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-16 h-16 sm:w-18 sm:h-18 rounded-[22px] flex items-center justify-center overflow-hidden shadow-xs border-2 border-white",
                    palette.avatarBg
                  )}>
                    <img
                      src={coverSrc}
                      alt={quiz.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = palette.mascotImage
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Set Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[14px] sm:text-base font-black text-slate-900 tracking-tight leading-tight truncate">
                      {quiz.title}
                    </h4>

                    {/* Right Indicator: Checkmark if selected, Chevron if not */}
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-300 stroke-[2.5] shrink-0" />
                    )}
                  </div>

                  {/* High-density inline metrics */}
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-500 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>{total} questions</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>Mastered: <strong className={cn("font-black", isSelected ? "text-indigo-600" : "text-slate-700")}>{mastered}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>New: <strong className={cn("font-black", isSelected ? "text-violet-600" : "text-slate-700")}>{unlearned}</strong></span>
                  </div>

                  {/* Progress Bar with Percentage */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className={cn(
                      "flex-1 h-2 rounded-full overflow-hidden p-0.5 shadow-inner",
                      isSelected ? "bg-indigo-100" : palette.barTrack
                    )}>
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isSelected ? "bg-gradient-to-r from-indigo-500 to-violet-600" : palette.barFill
                        )}
                        style={{ width: `${Math.max(pct, total > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-black shrink-0 leading-none",
                      isSelected ? "text-indigo-600" : "text-slate-400"
                    )}>
                      {pct}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ═══════════ BOTTOM ACTION PANEL: "START PRACTICING NOW!" ═══════════ */}
      {currentSelectedQuiz && (
        <div className="relative z-20 pt-3 pb-2 bg-gradient-to-b from-white/95 via-white to-white backdrop-blur-md rounded-t-[28px] border-t border-indigo-100 shadow-[0_-10px_30px_rgba(99,102,241,0.08)] flex flex-col gap-2 -mx-1 px-3 sm:px-4 flex-shrink-0">
          {/* Peeking Mascot & Decorative Sparkles */}
          <div className="absolute -top-7 left-4 z-30 flex items-end select-none pointer-events-none">
            <div className="relative">
              <img
                src="/mascot/owl_excited.png"
                alt="QuizMind Mascot"
                className="w-11 h-11 object-contain drop-shadow-md -rotate-6"
              />
              <span className="absolute -top-1 -right-2 text-xs text-amber-400 animate-pulse select-none">✨</span>
            </div>
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-800 tracking-wide select-none">
            <span className="text-indigo-600 font-black text-sm">≥</span>
            <span>Start Practicing Now!</span>
            <span className="text-indigo-600 font-black text-sm">≤</span>
          </div>

          {/* 2 Big Action Launch Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Button 1: Practice Now */}
            <button
              type="button"
              onClick={() => {
                if (currentSelectedQuiz) {
                  onOpenStudyModal(currentSelectedQuiz)
                }
              }}
              className="h-13 sm:h-14 px-3 sm:px-3.5 rounded-[22px] bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/25 active:scale-[0.97] transition-all flex items-center justify-between cursor-pointer border-b-[3px] border-indigo-900"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 text-white">
                  <Play className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-white stroke-[2.5]" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-xs font-black text-white leading-tight truncate">
                    Start Practice
                  </span>
                  <span className="block text-[9.5px] font-bold text-indigo-100 leading-tight mt-0.5 truncate">
                    Adaptive session
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white shrink-0 stroke-[3]" />
            </button>

            {/* Button 2: Set Roadmap & Details */}
            <button
              type="button"
              onClick={() => {
                if (currentSelectedQuiz) {
                  const id = currentSelectedQuiz.quiz_id ?? currentSelectedQuiz.id
                  navigate(`/quiz/${id}/roadmap`)
                }
              }}
              className="h-13 sm:h-14 px-3 sm:px-3.5 rounded-[22px] bg-white hover:bg-indigo-50/40 text-slate-800 border-2 border-indigo-100 hover:border-indigo-300 shadow-sm active:scale-[0.97] transition-all flex items-center justify-between cursor-pointer border-b-[3px] border-indigo-200"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-200/60 text-indigo-600">
                  <Compass className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-xs font-black text-slate-900 leading-tight truncate">
                    Set Roadmap
                  </span>
                  <span className="block text-[9.5px] font-bold text-slate-400 leading-tight mt-0.5 truncate">
                    Pipeline & stats
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0 stroke-[3]" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
