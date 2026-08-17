import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Clock, Flame, Trophy, Zap, X, Target, Gauge, ArrowRightLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { PipelineStepStatus } from '@/hooks/useRoadmapStatus'

export interface RoadmapHeaderTrackerProps {
  pipeline: PipelineStepStatus[]
  currentStepIndex: number
  allDone: boolean
  quizId?: string | number
  deckId?: string | number
  quizTitle?: string
  deckTitle?: string
  className?: string
  subProgressCurr?: number
  subProgressTotal?: number
  streakCount?: number
  onSurgeChange?: (isSurging: boolean) => void
  onViewModeChange?: (viewMode: 0 | 1) => void

  // Navigation & Exit
  onExit?: () => void

  // Timer Props
  timeMode?: 'card' | 'today' | 'all'
  onToggleTimeMode?: () => void
  initialTodayTime?: number
  initialAllTimeTime?: number
  showFeedback?: boolean
  hasRated?: boolean
  currentIndex?: number
  timeLeftRef?: React.MutableRefObject<number>
  sessionStudyTimeRef?: React.MutableRefObject<number>
  formatHeaderTime?: (secs: number) => string

  // XP & Gamification Props
  scoreMode?: 'all' | 'today'
  onToggleScoreMode?: () => void
  xp?: number
  todayXP?: number
  sessionXP?: number

  // Live Study Performance Stats
  answeredCount?: number
  correctCount?: number
  totalCards?: number
  cardsRemaining?: number
}

const STEP_META: Record<string, { emoji: string; label: string; short: string; style: string }> = {
  new_cards: { 
    emoji: '📝', 
    label: 'Học Câu Mới', 
    short: 'NW',
    style: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
  },
  review: { 
    emoji: '🔄', 
    label: 'Ôn Tập Củng Cố', 
    short: 'REV',
    style: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
  },
  mcq: { 
    emoji: '🎯', 
    label: 'Trắc Nghiệm MCQ', 
    short: 'MCQ',
    style: 'bg-rose-500/15 border-rose-500/30 text-rose-300'
  },
  typing: { 
    emoji: '⌨️', 
    label: 'Gõ Đáp Án', 
    short: 'TYP',
    style: 'bg-purple-500/15 border-purple-500/30 text-purple-300'
  },
  study_time: { 
    emoji: '⏱️', 
    label: 'Thời Gian Học', 
    short: 'TIME',
    style: 'bg-amber-500/15 border-amber-500/30 text-amber-300'
  }
}

const OVERACHIEVE_PRAISES = [
  "⚡ NỖ LỰC PHI THƯỜNG!",
  "🚀 VƯỢT CHỈ TIÊU BỨT PHÁ!",
  "👑 BỨT PHÁ GIỚI HẠN BẢN THÂN!",
  "🔥 CHĂM CHỈ XUẤT SẮC!"
]

export const RoadmapHeaderTracker: React.FC<RoadmapHeaderTrackerProps> = ({
  pipeline,
  currentStepIndex,
  allDone,
  quizId,
  deckId,
  quizTitle,
  deckTitle,
  className,
  subProgressCurr,
  subProgressTotal,
  streakCount = 0,
  onSurgeChange,
  onViewModeChange,
  onExit,
  timeMode = 'card',
  onToggleTimeMode,
  initialTodayTime = 0,
  initialAllTimeTime = 0,
  showFeedback = false,
  hasRated = false,
  currentIndex = 0,
  timeLeftRef,
  sessionStudyTimeRef,
  formatHeaderTime,
  scoreMode = 'today',
  onToggleScoreMode,
  xp = 0,
  todayXP = 0,
  sessionXP = 0,
  answeredCount = 0,
  correctCount = 0,
  totalCards = 0,
  cardsRemaining = 0
}) => {
  // 0 = Mặt 1 (Tên bộ đề & Chế độ học), 1 = Mặt 2 (Toàn bộ các thông số chi tiết HUD)
  const [viewMode, setViewMode] = useState<0 | 1>(0)
  const [isSurging, setIsSurging] = useState(false)
  const prevCurrRef = useRef(subProgressCurr)

  // Local Timer tracking
  const [localCardTime, setLocalCardTime] = useState(0)
  const [localSessionStudyTime, setLocalSessionStudyTime] = useState(0)

  useEffect(() => {
    setLocalCardTime(0)
    if (timeLeftRef) timeLeftRef.current = 0
  }, [currentIndex, timeLeftRef])

  useEffect(() => {
    if (timeLeftRef) timeLeftRef.current = localCardTime
  }, [localCardTime, timeLeftRef])

  useEffect(() => {
    if (sessionStudyTimeRef) sessionStudyTimeRef.current = localSessionStudyTime
  }, [localSessionStudyTime, sessionStudyTimeRef])

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden || !document.hasFocus()) return
      if (showFeedback || hasRated) return

      setLocalCardTime(prev => prev + 1)
      setLocalSessionStudyTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [showFeedback, hasRated])

  const defaultFormatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`
    const m = Math.floor(secs / 60)
    const s = secs % 60
    if (m < 60) return `${m}m ${s < 10 ? '0' : ''}${s}s`
    const h = Math.floor(m / 60)
    const remM = m % 60
    return `${h}h ${remM}m`
  }

  const formatTime = formatHeaderTime || defaultFormatTime

  const displayCardTime = useMemo(() => `${localCardTime}s`, [localCardTime])
  const displayTodayTime = useMemo(() => formatTime(initialTodayTime + localSessionStudyTime), [initialTodayTime, localSessionStudyTime, formatTime])

  const displayTotalXP = useMemo(() => {
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`
    if (xp >= 10000) return `${(xp / 1000).toFixed(1)}k`
    return xp.toLocaleString()
  }, [xp])

  // Accuracy calculation
  const accuracyPercent = useMemo(() => {
    if (answeredCount === 0) return null
    return Math.round((correctCount / answeredCount) * 100)
  }, [answeredCount, correctCount])

  // Average speed (seconds per question)
  const avgSpeed = useMemo(() => {
    if (answeredCount === 0 || localSessionStudyTime === 0) return null
    const secPerCard = (localSessionStudyTime / answeredCount).toFixed(1)
    return `${secPerCard}s`
  }, [answeredCount, localSessionStudyTime])

  if (!pipeline || pipeline.length === 0) return null

  const currentStep = pipeline[currentStepIndex] || null
  const meta = currentStep ? (STEP_META[currentStep.type] || STEP_META.new_cards) : STEP_META.new_cards
  const effectiveTitle = quizTitle || deckTitle || 'Phiên Học Lộ Trình'

  const hasSubProg = typeof subProgressCurr === 'number' && typeof subProgressTotal === 'number' && subProgressTotal > 0
  const subPercent = hasSubProg ? Math.min(100, Math.round((subProgressCurr / subProgressTotal) * 100)) : 0
  const isGoalReached = hasSubProg && subProgressCurr >= subProgressTotal
  const extraCount = hasSubProg && subProgressCurr > subProgressTotal ? subProgressCurr - subProgressTotal : 0
  const isOverachieved = extraCount > 0

  const praiseMsg = isOverachieved 
    ? OVERACHIEVE_PRAISES[(extraCount - 1) % OVERACHIEVE_PRAISES.length] 
    : (isGoalReached ? 'ĐÃ ĐẠT GOAL HÔM NAY!' : 'TIẾN BỘ TỐT LẮM!')

  useEffect(() => {
    if (
      typeof subProgressCurr === 'number' &&
      typeof prevCurrRef.current === 'number' &&
      subProgressCurr > prevCurrRef.current
    ) {
      setIsSurging(true)
      onSurgeChange?.(true)
      const t = setTimeout(() => {
        setIsSurging(false)
        onSurgeChange?.(false)
      }, 2000)
      return () => {
        clearTimeout(t)
        onSurgeChange?.(false)
      }
    }
    prevCurrRef.current = subProgressCurr
  }, [subProgressCurr, onSurgeChange])

  const toggleViewMode = () => {
    setViewMode((prev) => {
      const next = prev === 0 ? 1 : 0
      onViewModeChange?.(next)
      return next
    })
  }

  return (
    <div className={cn("relative w-full flex items-center gap-2 select-none min-w-0 h-9", className)}>
      {/* POWER SURGE EXPANSION OVERLAY */}
      <AnimatePresence>
        {isSurging && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.1 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed inset-x-0 top-0 h-[48px] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center overflow-hidden z-[250] border-b shadow-2xl",
              isOverachieved
                ? "border-cyan-400/70 shadow-cyan-950/50"
                : isGoalReached 
                  ? "border-emerald-400/60 shadow-emerald-950/40" 
                  : "border-amber-500/50 shadow-amber-950/40"
            )}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${subPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn(
                "absolute inset-y-0 left-0",
                isOverachieved
                  ? "bg-gradient-to-r from-emerald-600 via-teal-400 to-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.9)]"
                  : isGoalReached 
                    ? "bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400 shadow-[0_0_30px_rgba(16,185,129,0.9)]" 
                    : "bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.9)]"
              )}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.2, ease: "easeInOut", repeat: 1, repeatType: "reverse" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.9, 1.08, 1], opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="relative z-10 font-black text-white text-xs sm:text-sm tracking-wider flex items-center gap-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
            >
              {isOverachieved ? (
                <Zap className="w-4 h-4 text-cyan-300 fill-cyan-300 animate-bounce" />
              ) : isGoalReached ? (
                <Trophy className="w-4 h-4 text-emerald-300 fill-emerald-300 animate-bounce" />
              ) : (
                <Flame className="w-4 h-4 text-amber-300 fill-amber-300 animate-bounce" />
              )}
              <span>{praiseMsg}</span>
              {hasSubProg && (
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full border text-xs font-black shadow-md",
                  isOverachieved
                    ? "bg-cyan-950/90 border-cyan-400/80 text-cyan-200"
                    : isGoalReached 
                      ? "bg-emerald-950/80 border-emerald-400/60 text-emerald-200" 
                      : "bg-black/70 border-amber-300/50 text-amber-300"
                )}>
                  {isOverachieved ? `+${extraCount}` : `${subProgressCurr} / ${subProgressTotal}`}
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. LEFT: Exit button */}
      <div className="flex items-center shrink-0 z-[140]">
        {onExit && (
          <button
            onClick={onExit}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-slate-700 flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-sm"
            title="Thoát phiên học"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. FULL BAR FLIP CONTAINER */}
      <div 
        onClick={toggleViewMode}
        className="flex-1 flex items-center min-w-0 h-full cursor-pointer z-[140]"
        title="Bấm vào thanh để chuyển đổi giữa (Tên bộ đề & Chế độ) ⇄ (Toàn bộ Thông số chi tiết)"
      >
        <div className="w-full h-full flex items-center rounded-full bg-slate-900/80 hover:bg-slate-900/95 border border-slate-800 hover:border-slate-700/80 px-2.5 sm:px-3.5 backdrop-blur-md shadow-sm transition-all overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            {viewMode === 0 ? (
              /* ========================================================================= */
              /* MẶT 1: TÊN BỘ ĐỀ & CHẾ ĐỘ HỌC                                            */
              /* ========================================================================= */
              <motion.div
                key="face-deck-title"
                initial={{ opacity: 0, rotateX: 90 }}
                animate={{ opacity: 1, rotateX: 0 }}
                exit={{ opacity: 0, rotateX: -90 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="w-full flex items-center justify-between gap-2 min-w-0"
              >
                {/* Left side of Face 1: Title */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs shrink-0">📝</span>
                  <h1 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight truncate" title={effectiveTitle}>
                    {effectiveTitle}
                  </h1>
                </div>

                {/* Right side of Face 1: Mode + Step Dots + Progress + Flip Hint */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  {/* Step Stepper Dots */}
                  <div className="flex items-center gap-1 shrink-0" title={`Bước ${currentStepIndex + 1}/${pipeline.length}`}>
                    {pipeline.map((_, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300",
                          idx === currentStepIndex
                            ? "w-3 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                            : idx < currentStepIndex
                              ? "w-1.5 bg-emerald-400"
                              : "w-1.5 bg-slate-700"
                        )}
                      />
                    ))}
                  </div>

                  {/* Mode Badge (Ultra-clean acronym: NW, REV, MCQ, TYP, TIME) */}
                  <div 
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-xs font-black shrink-0 tracking-wide shadow-sm",
                      meta.style || "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    )}
                    title={currentStep?.label || meta.label}
                  >
                    <span className="text-[10px] sm:text-xs">{meta.emoji}</span>
                    <span className="text-[10px] sm:text-[11px] font-black">
                      {meta.short}
                    </span>
                  </div>

                  {/* Sub Progress Counter */}
                  {hasSubProg && (
                    <div className="flex items-center gap-0.5 font-bold font-mono text-[11px] text-slate-300 shrink-0">
                      <span className={isGoalReached ? "text-emerald-400 font-extrabold" : "text-amber-400 font-extrabold"}>
                        {isOverachieved ? `+${extraCount}` : subProgressCurr}
                      </span>
                      {!isOverachieved && (
                        <>
                          <span className="text-slate-600">/</span>
                          <span>{subProgressTotal}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Flip Action Indicator Pill */}
                  <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[10px] font-bold text-slate-400 hover:text-slate-200 shrink-0">
                    <ArrowRightLeft className="w-2.5 h-2.5" />
                    <span>Thông số</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ========================================================================= */
              /* MẶT 2: TOÀN BỘ CÁC THÔNG SỐ CHI TIẾT (Full Live HUD Dashboard)             */
              /* ========================================================================= */
              <motion.div
                key="face-stats-hud"
                initial={{ opacity: 0, rotateX: -90 }}
                animate={{ opacity: 1, rotateX: 0 }}
                exit={{ opacity: 0, rotateX: 90 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="w-full flex items-center justify-between gap-1.5 sm:gap-3 text-xs min-w-0 font-mono"
              >
                {/* 1. Timer: Câu này & Tổng hôm nay */}
                <div className="flex items-center gap-1 shrink-0" title="Thời gian câu hỏi hiện tại & Tổng thời gian học">
                  <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
                  <span className="text-emerald-300 font-black text-[11px]">{displayCardTime}</span>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="text-slate-400 text-[10px] hidden sm:inline" title="Thời gian học hôm nay">{displayTodayTime}</span>
                </div>

                <div className="w-[1px] h-3 bg-slate-800 shrink-0" />

                {/* 2. Tiến độ & Còn lại */}
                <div className="flex items-center gap-1 shrink-0" title="Tiến độ câu hỏi hiện tại">
                  <Target className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-slate-200 font-black text-[11px]">
                    {hasSubProg ? `${subProgressCurr}/${subProgressTotal}` : `${currentIndex + 1}/${totalCards || '--'}`}
                  </span>
                  {cardsRemaining > 0 && (
                    <span className="text-slate-500 text-[10px] hidden md:inline">({cardsRemaining} còn)</span>
                  )}
                </div>

                {/* 3. Độ chính xác (Accuracy %) */}
                {accuracyPercent !== null && (
                  <>
                    <div className="w-[1px] h-3 bg-slate-800 shrink-0 hidden sm:block" />
                    <div className="hidden sm:flex items-center gap-1 shrink-0" title={`Độ chính xác: ${correctCount}/${answeredCount} câu đúng`}>
                      <Gauge className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className={cn(
                        "font-black text-[11px]",
                        accuracyPercent >= 80 ? "text-emerald-400" : accuracyPercent >= 60 ? "text-amber-400" : "text-rose-400"
                      )}>
                        {accuracyPercent}%
                      </span>
                    </div>
                  </>
                )}

                {/* 4. Tốc độ trung bình (Avg Speed) */}
                {avgSpeed && (
                  <>
                    <div className="w-[1px] h-3 bg-slate-800 shrink-0 hidden lg:block" />
                    <div className="hidden lg:flex items-center gap-1 shrink-0 text-slate-400 text-[10px]" title="Tốc độ trả lời trung bình mỗi câu">
                      <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>{avgSpeed}/câu</span>
                    </div>
                  </>
                )}

                <div className="w-[1px] h-3 bg-slate-800 shrink-0" />

                {/* 5. XP Score */}
                <div className="flex items-center gap-1 shrink-0 text-amber-300" title={`Điểm phiên: +${sessionXP} XP | Tổng: ${xp.toLocaleString()} XP`}>
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-black text-[11px]">
                    {sessionXP > 0 ? `+${sessionXP}` : displayTotalXP}
                  </span>
                  <span className="text-[10px] text-amber-400/80 font-semibold">XP</span>
                </div>

                {/* 6. Streak Flame */}
                {streakCount > 0 && (
                  <>
                    <div className="w-[1px] h-3 bg-slate-800 shrink-0" />
                    <div className="flex items-center gap-1 shrink-0 text-orange-400" title={`Chuỗi học ${streakCount} ngày liên tục`}>
                      <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0 animate-pulse" />
                      <span className="font-black text-[11px]">{streakCount}d</span>
                    </div>
                  </>
                )}

                {/* Flip Back Hint */}
                <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[10px] font-bold text-slate-400 hover:text-slate-200 shrink-0 ml-auto">
                  <ArrowRightLeft className="w-2.5 h-2.5" />
                  <span>Tên đề</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
