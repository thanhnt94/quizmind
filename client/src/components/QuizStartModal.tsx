import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, 
  Clock, 
  Sparkles, 
  RotateCcw, 
  Shuffle, 
  Play, 
  X, 
  HelpCircle, 
  BookOpen, 
  CheckCircle2, 
  Flame,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface QuizStartModalProps {
  isOpen: boolean
  onClose: () => void
  quizId: number | string
  quizTitle: string
  totalQuestions?: number
  timeLimitMinutes?: number | null
  initialFormat?: 'practice' | 'exam'
  initialScope?: 'mix' | 'new' | 'review'
  initialCount?: number | 'all'
  countsSummary?: {
    newCount?: number
    reviewCount?: number
    totalCount?: number
  }
}

export function QuizStartModal({
  isOpen,
  onClose,
  quizId,
  quizTitle,
  totalQuestions = 0,
  timeLimitMinutes = null,
  initialFormat = 'practice',
  initialScope = 'mix',
  initialCount = 10,
  countsSummary
}: QuizStartModalProps) {
  const navigate = useNavigate()

  const [format, setFormat] = useState<'practice' | 'exam'>(initialFormat)
  const [scope, setScope] = useState<'mix' | 'new' | 'review'>(initialScope)
  const [count, setCount] = useState<number | 'all'>(initialCount)

  // Sync initial settings when opened
  useEffect(() => {
    if (isOpen) {
      setFormat(initialFormat)
      setScope(initialScope)
      setCount(initialCount)
    }
  }, [isOpen, initialFormat, initialScope, initialCount])

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  // Calculate available quotas based on totalQuestions
  const maxTotal = totalQuestions || countsSummary?.totalCount || 0
  const quotaOptions: Array<{ val: number | 'all'; label: string; desc?: string }> = [
    { val: 5, label: '5 Questions' },
    { val: 10, label: '10 Questions' },
    { val: 20, label: '20 Questions' },
    { val: 50, label: '50 Questions' },
    { val: 'all' as const, label: maxTotal > 0 ? `All (${maxTotal})` : 'All Questions' },
  ].filter(opt => {
    if (opt.val === 'all') return true
    if (typeof opt.val === 'number') {
      if (maxTotal <= 5) return opt.val === 5
      if (maxTotal <= 10) return opt.val <= 10
      if (maxTotal <= 20) return opt.val <= 20
      if (maxTotal <= 50) return opt.val <= 50
    }
    return true
  })

  const handleStart = () => {
    if (navigator.vibrate) navigator.vibrate(10)
    onClose()
    const countParam = count === 'all' ? 'all' : String(count)
    navigate(`/quiz/${quizId}/play?mode=${format}&scope=${scope}&count=${countParam}`)
  }

  const newCount = countsSummary?.newCount
  const reviewCount = countsSummary?.reviewCount

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex flex-col justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Bottom Sheet Card */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative bg-white rounded-t-[2.5rem] border-t border-slate-200 shadow-2xl p-5 sm:p-7 max-h-[90vh] overflow-y-auto z-10 space-y-5 max-w-xl mx-auto w-full select-none text-left"
        >
          {/* Pull Handle */}
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto -mt-1 mb-1" />

          {/* Sheet Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block">
                  Study Session Setup
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 truncate leading-tight mt-0.5">
                  {quizTitle}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center active:scale-90 transition-all cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ═══════════ SECTION 1: SESSION FORMAT ═══════════ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>1. Session Format</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {format === 'practice' ? 'Instant Feedback' : 'Batch Exam'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
              {/* Option 1: Practice Mode */}
              <button
                type="button"
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(6)
                  setFormat('practice')
                }}
                className={cn(
                  "p-3 rounded-xl flex flex-col items-start gap-1 text-left transition-all cursor-pointer relative",
                  format === 'practice'
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/90 ring-2 ring-indigo-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black",
                    format === 'practice' ? "bg-indigo-50 text-indigo-600" : "bg-slate-200/70 text-slate-500"
                  )}>
                    <Target className="w-4 h-4" />
                  </div>
                  {format === 'practice' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <div className="mt-1">
                  <span className="text-xs font-black block leading-tight">Practice</span>
                  <span className="text-[10px] text-slate-400 font-medium block leading-tight mt-0.5">
                    Instant explanations
                  </span>
                </div>
              </button>

              {/* Option 2: Exam Mode */}
              <button
                type="button"
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(6)
                  setFormat('exam')
                }}
                className={cn(
                  "p-3 rounded-xl flex flex-col items-start gap-1 text-left transition-all cursor-pointer relative",
                  format === 'exam'
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/90 ring-2 ring-emerald-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black",
                    format === 'exam' ? "bg-emerald-50 text-emerald-600" : "bg-slate-200/70 text-slate-500"
                  )}>
                    <Clock className="w-4 h-4" />
                  </div>
                  {format === 'exam' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="mt-1">
                  <span className="text-xs font-black block leading-tight">Exam Mode</span>
                  <span className="text-[10px] text-slate-400 font-medium block leading-tight mt-0.5">
                    {timeLimitMinutes ? `${timeLimitMinutes}m countdown` : 'Timed & submit at once'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* ═══════════ SECTION 2: QUESTION SOURCE (SCOPE) ═══════════ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 tracking-tight">
                2. Question Source
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {scope === 'mix' ? 'Smart Interleaving' : scope === 'new' ? 'Unlearned Only' : 'Review Due'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Scope 1: Smart Mix */}
              <button
                type="button"
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(6)
                  setScope('mix')
                }}
                className={cn(
                  "p-2.5 sm:p-3 rounded-2xl border flex flex-col items-start justify-between text-left transition-all cursor-pointer relative",
                  scope === 'mix'
                    ? "bg-gradient-to-b from-indigo-50/90 to-violet-50/40 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-slate-50/70 border-slate-200/80 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center",
                    scope === 'mix' ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                  )}>
                    <Shuffle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                    Recommended
                  </span>
                </div>
                <div className="mt-2">
                  <h4 className={cn("text-xs font-black leading-tight", scope === 'mix' ? "text-indigo-900" : "text-slate-800")}>
                    Smart Mix
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                    New + Review
                  </p>
                </div>
              </button>

              {/* Scope 2: New Only */}
              <button
                type="button"
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(6)
                  setScope('new')
                }}
                className={cn(
                  "p-2.5 sm:p-3 rounded-2xl border flex flex-col items-start justify-between text-left transition-all cursor-pointer relative",
                  scope === 'new'
                    ? "bg-gradient-to-b from-purple-50/90 to-pink-50/40 border-purple-300 ring-2 ring-purple-500/20 shadow-xs"
                    : "bg-slate-50/70 border-slate-200/80 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center",
                    scope === 'new' ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-600"
                  )}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  {newCount !== undefined && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700">
                      {newCount}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <h4 className={cn("text-xs font-black leading-tight", scope === 'new' ? "text-purple-900" : "text-slate-800")}>
                    New Only
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                    Unseen questions
                  </p>
                </div>
              </button>

              {/* Scope 3: Review */}
              <button
                type="button"
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(6)
                  setScope('review')
                }}
                className={cn(
                  "p-2.5 sm:p-3 rounded-2xl border flex flex-col items-start justify-between text-left transition-all cursor-pointer relative",
                  scope === 'review'
                    ? "bg-gradient-to-b from-amber-50/90 to-orange-50/40 border-amber-300 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-slate-50/70 border-slate-200/80 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center",
                    scope === 'review' ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-600"
                  )}>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  {reviewCount !== undefined && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">
                      {reviewCount}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <h4 className={cn("text-xs font-black leading-tight", scope === 'review' ? "text-amber-900" : "text-slate-800")}>
                    Review Due
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                    Missed & spaced
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* ═══════════ SECTION 3: QUESTION QUOTA ═══════════ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 tracking-tight">
                3. Question Batch Size
              </span>
              <span className="text-[10px] font-black text-indigo-600">
                {count === 'all' ? 'All Questions' : `${count} Questions`}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {quotaOptions.map((opt) => {
                const isSelected = count === opt.val
                return (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(6)
                      setCount(opt.val)
                    }}
                    className={cn(
                      "flex-1 min-w-[70px] py-2.5 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer text-center border active:scale-95",
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm shadow-slate-900/20"
                        : "bg-slate-100/90 text-slate-700 border-slate-200/80 hover:bg-slate-200/80"
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ═══════════ PRIMARY START BUTTON ═══════════ */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStart}
              className={cn(
                "w-full py-3.5 px-5 rounded-2xl text-white font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98]",
                format === 'exam'
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25"
                  : "bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-700 hover:via-purple-700 hover:to-violet-700 shadow-indigo-500/25"
              )}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>
                {format === 'exam' ? 'Start Exam' : 'Start Practice'} ({count === 'all' ? 'All' : `${count} Qs`})
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}

export default QuizStartModal
