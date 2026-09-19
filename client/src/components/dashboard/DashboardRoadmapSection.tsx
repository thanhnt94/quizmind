import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Layers, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  BookOpen, 
  Flame, 
  Trophy, 
  Sparkles, 
  RotateCcw, 
  Play, 
  Compass,
  ArrowRight,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuizStartModal } from '@/components/QuizStartModal'

interface DashboardRoadmapSectionProps {
  roadmapQuizzes: any[] | undefined
  remainingTime: string
  selectedRoadmapIdx: number
  onSelectRoadmapIdx: (idx: number) => void
  navigate: (url: string) => void
  isDesktop?: boolean
}

const CHEER_QUOTES = [
  "Keep it up! You're on fire with this streak! 🔥",
  "Every question conquered today is a major leap forward! 🚀",
  "With dedication like this, you'll master this quiz in no time! 🌟",
  "I'm here cheering you on every single day! 💪",
  "Outstanding work! Let's conquer all today's questions! 🎉",
  "Your brain is absorbing knowledge at lightning speed! ⚡"
]

// ─── Single Detailed Roadmap Card Body ────────────────────────────────────────
function DetailedRoadmapCard({
  quiz,
  idx,
  totalDecks,
  navigate,
  onMascotTap,
  mascotCheer,
  remainingTime,
  onOpenStartModal
}: {
  quiz: any
  idx: number
  totalDecks: number
  navigate: (url: string) => void
  onMascotTap: () => void
  mascotCheer: string | null
  remainingTime: string
  onOpenStartModal: (cfg?: { format?: 'practice' | 'exam'; scope?: 'mix' | 'new' | 'review'; count?: number | 'all' }) => void
}) {
  const st = quiz?.status || {}
  const isDone = Boolean(st.all_done)
  const pipeline = st.pipeline || []
  const deckStreak = st.streak || quiz.streak || 0
  const currentStepIdx = st.current_step_index ?? 0

  const totalQuestions = st.total_questions || quiz.questions_count || 0
  const learnedQuestions = st.learned_questions || 0
  const pct = totalQuestions > 0 ? Math.min(100, Math.round((learnedQuestions / totalQuestions) * 100)) : 0

  // Mascot calculation
  let mascotImg = `${import.meta.env.BASE_URL || '/static/dist/'}mascot/owl_sleepy.png?v=20260917c`
  let mascotLine1 = 'Ready for today?'
  let mascotLine2 = "Let's conquer today's questions! 🚀"

  if (isDone) {
    mascotImg = `${import.meta.env.BASE_URL || '/static/dist/'}mascot/owl_celebrating.png?v=20260917c`
    mascotLine1 = 'Outstanding!'
    mascotLine2 = 'Completed today’s roadmap! 🎉'
  } else if (st.stage_1_done) {
    mascotImg = `${import.meta.env.BASE_URL || '/static/dist/'}mascot/owl_excited.png?v=20260917c`
    mascotLine1 = 'On Fire!'
    mascotLine2 = 'Keep up the blazing momentum 🔥'
  } else if ((st.new_learned_today || 0) > 0 || (st.review_completed_today || 0) > 0) {
    mascotImg = `${import.meta.env.BASE_URL || '/static/dist/'}mascot/owl_excited.png?v=20260917c`
    mascotLine1 = 'Great start!'
    mascotLine2 = 'Finish all remaining steps today 💪'
  }

  const stepsCompletedCount = pipeline.filter((p: any) => p.done).length

  return (
    <div className="flex-1 flex flex-col justify-between gap-2 sm:gap-2.5 min-h-0 w-full select-none">
      {/* ═══════════ HERO MASCOT CARD ═══════════ */}
      <div className="bg-gradient-to-br from-indigo-100/90 via-violet-50/70 to-purple-100/40 border border-indigo-200/90 rounded-3xl p-3.5 sm:p-5 relative overflow-hidden shadow-xs flex flex-row items-center justify-between flex-1 min-h-[175px] shrink-0">
        {/* Left Side: Title, Badges & Motivation */}
        <div className="relative z-20 flex-1 max-w-[62%] sm:max-w-[66%] min-w-0 flex flex-col justify-center gap-2 py-0.5">
          {/* Quiz Title Button */}
          <Link
            to={`/quiz/${quiz.quiz_id || quiz.id}/roadmap`}
            className="inline-flex items-center gap-2 max-w-full text-left group cursor-pointer"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-500/15 border border-indigo-300/70 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-sm sm:text-base font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
              {quiz.title}
            </span>
          </Link>

          {/* Prominent Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-xs font-black shadow-xs shrink-0">
              <Flame className="w-3.5 h-3.5 fill-amber-200 text-amber-200" />
              <span>{deckStreak} Day Streak</span>
            </div>

            <div className="inline-flex items-center gap-1.5 shrink-0">
              <div className="relative h-6 sm:h-6.5 min-w-[130px] sm:min-w-[145px] bg-white/90 backdrop-blur-xs border border-indigo-200/90 rounded-full p-0.5 shadow-2xs overflow-hidden flex items-center">
                <div 
                  className="absolute inset-y-0.5 left-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 shadow-2xs"
                  style={{ width: `${Math.max(0, Math.min(100, (learnedQuestions / (totalQuestions || 1)) * 100))}%` }}
                />
                <span className="relative z-10 font-black text-[11px] sm:text-xs text-slate-900 px-2.5 truncate">
                  {learnedQuestions.toLocaleString()}/{totalQuestions.toLocaleString()} questions
                </span>
              </div>
              <span className="font-black text-xs sm:text-sm text-emerald-600 tabular-nums shrink-0">
                {pct}%
              </span>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/80 backdrop-blur-xs text-slate-600 border border-indigo-200/70 rounded-full text-[11px] sm:text-xs font-semibold shadow-2xs shrink-0">
              <span>Est: {st.estimated_completion_date || '—'}</span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 pt-0.5">
            <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug">
              {mascotCheer || mascotLine1}
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed">
              {mascotCheer ? "QuizMind Mascot is rooting for you! ⭐" : mascotLine2}
            </p>
          </div>
        </div>

        {/* Right Side: Cute Chibi Mascot Image (100% transparent background) */}
        <div 
          onClick={onMascotTap}
          title="Tap mascot for encouragement!"
          className="w-[40%] sm:w-[32%] max-w-[220px] absolute right-1 sm:right-2 bottom-0 top-0 flex items-end justify-center z-10 cursor-pointer group"
        >
          <AnimatePresence>
            {mascotCheer && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.85 }}
                className="absolute top-2 right-2 bg-white/95 backdrop-blur-md border border-indigo-200 text-slate-900 text-[11px] font-black p-2.5 rounded-2xl shadow-xl z-30 max-w-[180px] pointer-events-none text-center"
              >
                <div className="relative">
                  {mascotCheer}
                  <div className="absolute -bottom-4 right-6 w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.img
            key={mascotImg}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3 }}
            src={mascotImg}
            alt="QuizMind Mascot"
            className="h-[98%] max-h-[220px] w-auto max-w-none object-contain object-bottom drop-shadow-xl translate-y-1 transition-transform select-none"
          />
        </div>

        {/* 2 Action Buttons (Luyện tập / Thi thử) in bottom right of hero card */}
        {!isDone && (
          <div className="absolute right-3 bottom-3 z-30 flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (navigator.vibrate) navigator.vibrate(8)
                onOpenStartModal({ format: 'practice', scope: 'mix', count: 10 })
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-500/25 border border-white/40 active:scale-95 transition-all cursor-pointer text-xs font-black"
              title="Luyện tập từng câu (Instant Feedback)"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Luyện tập</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (navigator.vibrate) navigator.vibrate(8)
                onOpenStartModal({ format: 'exam', scope: 'mix', count: 20 })
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-500/25 border border-white/40 active:scale-95 transition-all cursor-pointer text-xs font-black"
              title="Thi thử 1 lượt (Mock Exam / Batch)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Thi thử</span>
            </button>
          </div>
        )}
      </div>

      {/* Section Title: Today's Steps */}
      <div className="px-1 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
            Today's Steps
          </h3>
        </div>

        <div className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70 text-[10px] sm:text-[11px] font-bold">
          <span>{stepsCompletedCount}/{pipeline.length || 2} completed</span>
        </div>
      </div>

      {/* Connected Vertical Timeline Steps */}
      <div className="flex flex-col gap-2 relative pt-0.5 shrink-0">
        {pipeline.map((step: any, sIdx: number) => {
          const isCurrent = sIdx === currentStepIdx && !isDone
          const stepDone = step.done
          const stepTarget = step.daily_count || step.max_count || 10
          const stepDoneCount = step.type === 'new_cards' 
            ? (st.new_learned_today || 0) 
            : (st.review_completed_today || 0)
          const stepPct = stepDone ? 100 : (stepTarget > 0 ? Math.min(100, Math.round((stepDoneCount / stepTarget) * 100)) : 0)

          return (
            <div key={step.id || sIdx} className="flex items-center gap-3 relative">
              {/* Step Circle Badge with active glowing ring */}
              <div className={cn(
                "w-8.5 h-8.5 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-2xs text-white z-10 transition-all",
                stepDone 
                  ? "bg-emerald-500" 
                  : isCurrent 
                    ? "bg-gradient-to-tr from-indigo-600 to-purple-600 scale-105 ring-2 ring-indigo-200 animate-pulse" 
                    : "bg-slate-200 text-slate-400"
              )}>
                {stepDone ? '✓' : `${sIdx + 1}`}
              </div>

              {/* Step Card with triangle pointer pointing left */}
              <div 
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(8)
                  onOpenStartModal({
                    format: 'practice',
                    scope: step.type === 'new_cards' ? 'new' : 'review',
                    count: step.daily_count || step.max_count || 10
                  })
                }}
                className={cn(
                  "flex-1 bg-white border rounded-2xl p-2.5 sm:p-3 shadow-2xs flex items-center gap-3 relative transition-all cursor-pointer hover:shadow-sm active:scale-[0.99]",
                  stepDone 
                    ? "border-emerald-200/90 bg-emerald-50/20" 
                    : isCurrent 
                      ? "border-indigo-300/90 bg-indigo-50/20 hover:border-indigo-400" 
                      : "border-slate-200/70 bg-slate-50/30"
                )}
              >
                {/* Pointer triangle */}
                <div className={cn(
                  "absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] z-20",
                  stepDone ? "border-r-emerald-100" : isCurrent ? "border-r-indigo-200" : "border-r-slate-200/60"
                )} />

                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                  stepDone 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                    : isCurrent 
                      ? "bg-indigo-50 border-indigo-100 text-indigo-600" 
                      : "bg-slate-100 border-slate-200/60 text-slate-400"
                )}>
                  {step.type === 'new_cards' ? <BookOpen className="w-4.5 h-4.5" /> : <RotateCcw className="w-4.5 h-4.5" />}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {step.label}
                    </span>
                    {stepDone && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold rounded-full shrink-0">
                        ✓ Done
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-500 flex items-baseline gap-1">
                    <span className={cn("text-xs sm:text-sm font-black", !stepDone ? "text-indigo-600" : "text-slate-500")}>
                      {stepDoneCount}
                    </span>
                    <span className="text-slate-400 font-medium text-xs">
                      / {stepTarget} {step.type === 'new_cards' ? 'new questions' : 'questions'}
                    </span>
                  </div>

                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full my-0.5">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        stepDone 
                          ? "bg-emerald-500" 
                          : "bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"
                      )} 
                      style={{ width: `${stepPct}%` }} 
                    />
                  </div>
                </div>

                <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Big Action CTA Button */}
      <button
        type="button"
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(10)
          const isReviewStep = pipeline[currentStepIdx]?.type === 'review_cards'
          onOpenStartModal({
            format: 'practice',
            scope: isReviewStep ? 'review' : 'new',
            count: 10
          })
        }}
        className={cn(
          "w-full h-12 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98",
          isDone
            ? "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-300"
            : "bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 hover:from-indigo-700 hover:to-rose-600 text-white shadow-indigo-200"
        )}
      >
        <Play className="w-4 h-4 fill-white" />
        <span>{st.next_action_label || 'CONTINUE ROADMAP 🚀'}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Main Roadmap Section Component with Real Vertical Snap Scroll & Mouse Wheel ─
export function DashboardRoadmapSection({
  roadmapQuizzes,
  remainingTime,
  selectedRoadmapIdx,
  onSelectRoadmapIdx,
  navigate,
  isDesktop = false
}: DashboardRoadmapSectionProps) {
  const [mascotCheer, setMascotCheer] = useState<string | null>(null)
  const isScrollingRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [startModalConfig, setStartModalConfig] = useState<{
    isOpen: boolean
    quiz: any
    format: 'practice' | 'exam'
    scope: 'mix' | 'new' | 'review'
    count: number | 'all'
  }>({
    isOpen: false,
    quiz: null,
    format: 'practice',
    scope: 'mix',
    count: 10
  })

  const handleMascotTap = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([15, 30, 15])
    }
    const randomQuote = CHEER_QUOTES[Math.floor(Math.random() * CHEER_QUOTES.length)]
    setMascotCheer(randomQuote)
    setTimeout(() => {
      setMascotCheer(null)
    }, 4000)
  }

  const safeQuizzes = roadmapQuizzes || []
  const totalDecks = safeQuizzes.length
  const safeIdx = totalDecks > 0 ? Math.min(Math.max(0, selectedRoadmapIdx), totalDecks - 1) : 0
  const quiz = safeQuizzes[safeIdx] || null
  const st = quiz?.status || {}

  const scrollToDeck = useCallback((targetIdx: number, smooth: boolean = true) => {
    const container = scrollContainerRef.current
    if (!container || totalDecks === 0) return
    const clamped = Math.max(0, Math.min(totalDecks - 1, targetIdx))
    const targetTop = clamped * container.clientHeight
    container.scrollTo({
      top: targetTop,
      behavior: smooth ? 'smooth' : 'auto'
    })
    onSelectRoadmapIdx(clamped)
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(8)
    }
  }, [totalDecks, onSelectRoadmapIdx])

  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    if (!container || container.clientHeight <= 0 || totalDecks === 0) return
    const idx = Math.round(container.scrollTop / container.clientHeight)
    const clamped = Math.max(0, Math.min(totalDecks - 1, idx))
    if (clamped !== safeIdx) {
      onSelectRoadmapIdx(clamped)
    }
  }

  // Smooth wheel handling on desktop & touchpads to scroll exactly 1 quiz per wheel notch
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (totalDecks <= 1) return
    if (isScrollingRef.current) return
    if (Math.abs(e.deltaY) < 25) return

    if (e.deltaY > 0 && safeIdx < totalDecks - 1) {
      isScrollingRef.current = true
      scrollToDeck(safeIdx + 1)
      setTimeout(() => {
        isScrollingRef.current = false
      }, 350)
    } else if (e.deltaY < 0 && safeIdx > 0) {
      isScrollingRef.current = true
      scrollToDeck(safeIdx - 1)
      setTimeout(() => {
        isScrollingRef.current = false
      }, 350)
    }
  }

  // Sync scroll position if safeIdx changes externally
  useEffect(() => {
    if (totalDecks === 0) return
    const container = scrollContainerRef.current
    if (!container || container.clientHeight <= 0) return
    const targetTop = safeIdx * container.clientHeight
    if (Math.abs(container.scrollTop - targetTop) > 15) {
      container.scrollTo({
        top: targetTop,
        behavior: 'smooth'
      })
    }
  }, [totalDecks, safeIdx])

  if (totalDecks === 0) {
    return (
      <div className={cn(
        "flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto",
        isDesktop ? "h-full justify-center" : ""
      )}>
        <div className="relative mb-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-indigo-100 via-purple-50 to-indigo-50 flex items-center justify-center border-2 border-indigo-200/80 shadow-md">
            <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-500 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-md text-sm font-bold">
            ✨
          </div>
        </div>

        <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight italic leading-tight">
          Activate Learning Roadmap
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mt-1.5 mb-6 max-w-xs">
          Dashboard is your daily study hub. Activate a roadmap to automatically schedule new questions and spaced repetition each day!
        </p>

        <button
          onClick={() => {
            if (window.navigator?.vibrate) window.navigator.vibrate(10)
            navigate('/quizzes')
          }}
          className="w-full h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 hover:from-indigo-700 hover:to-rose-600 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Layers className="w-4 h-4" />
          <span>Explore Quizzes & Activate Roadmap →</span>
        </button>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-left select-none">
      {/* Subheader Bar with Stepper & Links */}
      <div className={cn(
        "px-3.5 sm:px-4 py-2 flex items-center justify-between flex-shrink-0 text-xs font-semibold text-slate-500 gap-2",
        isDesktop ? "bg-white/95 backdrop-blur-xs border-b border-slate-100/90" : "bg-transparent"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {/* Deck Stepper Pill */}
          {totalDecks > 1 ? (
            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => scrollToDeck(safeIdx - 1)}
                disabled={safeIdx === 0}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                  safeIdx === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-90 font-black"
                )}
                title="Previous quiz"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <span className="text-[11px] font-black text-indigo-600 px-1 tabular-nums">
                {safeIdx + 1}/{totalDecks}
              </span>
              <button
                type="button"
                onClick={() => scrollToDeck(safeIdx + 1)}
                disabled={safeIdx === totalDecks - 1}
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                  safeIdx === totalDecks - 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-90 font-black"
                )}
                title="Next quiz"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-900 font-black tracking-tight text-xs shrink-0 bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Daily Roadmap</span>
            </div>
          )}

          {!st.all_done ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50/90 text-indigo-700 border border-indigo-200/70 rounded-full text-[10px] sm:text-[11px] font-black shadow-2xs shrink-0">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-600 shrink-0" />
              <span className="tabular-nums font-extrabold">{remainingTime} left</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-full text-[10px] sm:text-[11px] font-black shadow-2xs shrink-0">
              <span className="text-xs">✓</span>
              <span>Completed today</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <Link
            to="/roadmap"
            className="text-xs font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
            title="Open Roadmap Hub"
          >
            <Compass className="w-3 h-3" />
            <span>Roadmap Hub</span>
          </Link>

          <Link 
            to={`/quiz/${quiz.quiz_id || quiz.id}/roadmap`}
            className="text-xs font-black text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>
      </div>

      {/* Roadmap Reel Body with Real Vertical Snap Scroll & Mouse Wheel */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleContainerScroll}
        onWheel={handleWheel}
        className="flex-1 overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth min-h-0 w-full [&::-webkit-scrollbar]:hidden touch-pan-y"
      >
        {safeQuizzes.map((q: any, i: number) => (
          <div 
            key={q.quiz_id || q.id || i}
            className="h-full min-h-full w-full snap-start snap-always shrink-0 p-2.5 sm:p-3 flex flex-col justify-between"
          >
            <DetailedRoadmapCard
              quiz={q}
              idx={i}
              totalDecks={totalDecks}
              navigate={navigate}
              onMascotTap={handleMascotTap}
              mascotCheer={i === safeIdx ? mascotCheer : null}
              remainingTime={remainingTime}
              onOpenStartModal={(cfg) => {
                setStartModalConfig({
                  isOpen: true,
                  quiz: q,
                  format: cfg?.format || 'practice',
                  scope: cfg?.scope || 'mix',
                  count: cfg?.count || 10
                })
              }}
            />
          </div>
        ))}
      </div>

      {/* Quiz Start Modal (Vocaburn Bottom Sheet Style) */}
      {startModalConfig.quiz && (
        <QuizStartModal
          isOpen={startModalConfig.isOpen}
          onClose={() => setStartModalConfig(prev => ({ ...prev, isOpen: false }))}
          quizId={startModalConfig.quiz.quiz_id || startModalConfig.quiz.id}
          quizTitle={startModalConfig.quiz.title}
          totalQuestions={startModalConfig.quiz.status?.total_questions || startModalConfig.quiz.questions_count || 0}
          timeLimitMinutes={startModalConfig.quiz.time_limit}
          initialFormat={startModalConfig.format}
          initialScope={startModalConfig.scope}
          initialCount={startModalConfig.count}
          countsSummary={{
            totalCount: startModalConfig.quiz.status?.total_questions || startModalConfig.quiz.questions_count || 0,
            newCount: Math.max(0, (startModalConfig.quiz.status?.total_questions || startModalConfig.quiz.questions_count || 0) - (startModalConfig.quiz.status?.learned_questions || 0)),
            reviewCount: startModalConfig.quiz.status?.learned_questions || 0
          }}
        />
      )}
    </div>
  )
}

export default DashboardRoadmapSection
