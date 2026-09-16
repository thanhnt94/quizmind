import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { 
  Clock, 
  HelpCircle, 
  Target, 
  Zap, 
  RotateCcw, 
  ChevronRight, 
  Activity, 
  History, 
  X,
  BookOpen
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DashboardDailyDrawerProps {
  isOpen: boolean
  onClose: () => void
  navigate: (url: string) => void
  onSwitchTab?: (tab: 'roadmap' | 'quizzes') => void
}

const MODE_META: Record<string, { label: string; emoji: string; color: string; badgeBg: string }> = {
  mcq: { label: '4-Choice Quiz', emoji: '🎯', color: 'text-indigo-600', badgeBg: 'bg-indigo-50 border-indigo-200/80 text-indigo-700' },
  missed: { label: 'Practice Missed', emoji: '🔄', color: 'text-amber-600', badgeBg: 'bg-amber-50 border-amber-200/80 text-amber-700' },
  new: { label: 'New Questions', emoji: '✨', color: 'text-purple-600', badgeBg: 'bg-purple-50 border-purple-200/80 text-purple-700' },
  typing: { label: 'Spelling Recall', emoji: '⌨️', color: 'text-violet-600', badgeBg: 'bg-violet-50 border-violet-200/80 text-violet-700' },
  listening: { label: 'Audio Quiz', emoji: '🎧', color: 'text-sky-600', badgeBg: 'bg-sky-50 border-sky-200/80 text-sky-700' },
  exam: { label: 'Timed Exam', emoji: '📝', color: 'text-emerald-600', badgeBg: 'bg-emerald-50 border-emerald-200/80 text-emerald-700' },
  sequential: { label: 'Sequential', emoji: '📋', color: 'text-slate-600', badgeBg: 'bg-slate-50 border-slate-200 text-slate-700' },
  random: { label: 'Random Shuffle', emoji: '🔀', color: 'text-rose-600', badgeBg: 'bg-rose-50 border-rose-200 text-rose-700' }
}

export function DashboardDailyDrawer({
  isOpen,
  onClose,
  navigate,
  onSwitchTab
}: DashboardDailyDrawerProps) {
  const tzOffset = new Date().getTimezoneOffset()
  const touchStartY = useRef<number | null>(null)

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['daily-summary', tzOffset],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/stats/daily-summary?tz_offset=${tzOffset}`)
      return res.data
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    enabled: isOpen
  })

  const summary = data?.summary || {
    total_questions: 0,
    new_questions: 0,
    reviewed_questions: 0,
    correct_count: 0,
    wrong_count: 0,
    accuracy: 0,
    total_time_seconds: 0,
    total_time_minutes: 0,
    total_sessions: 0,
    first_session_time: null,
    last_session_time: null,
    xp_earned: 0,
    streak_count: 0,
    streak_completed_today: false
  }

  const sessions = data?.sessions || []
  const hourlyActivity: number[] = data?.hourly_activity || Array(24).fill(0)
  const quizzesStudied = data?.quizzes_studied || []
  const roadmapGoals = data?.roadmap_goals || []

  const maxHourlyCount = Math.max(1, ...hourlyActivity)

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[280] select-none font-sans">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(6)
              onClose()
            }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Drawer Sheet Container */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "fixed z-[290] bg-[#f8fafc] flex flex-col overflow-hidden text-left shadow-2xl",
              // Mobile styles: bottom sheet
              "inset-x-0 bottom-0 h-[88vh] max-h-[88vh] rounded-t-[2.5rem] border-t border-slate-200/90",
              // Desktop styles: centered modal
              "md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:h-[86vh] md:max-h-[800px] md:rounded-[2.5rem] md:border md:border-slate-200/90"
            )}
          >
            {/* Mobile Drag Handle Bar */}
            <div 
              className="md:hidden pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing shrink-0"
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY
              }}
              onTouchEnd={(e) => {
                if (touchStartY.current !== null) {
                  const diffY = e.changedTouches[0].clientY - touchStartY.current
                  if (diffY > 60) {
                    if (navigator.vibrate) navigator.vibrate(8)
                    onClose()
                  }
                }
                touchStartY.current = null
              }}
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* TOP HEADER */}
            <div className="bg-white px-4 sm:px-6 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/20 shrink-0">
                  📊
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                      Today's Activity
                    </h2>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border uppercase tracking-wider",
                      summary.streak_completed_today
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    )}>
                      {summary.streak_completed_today ? "🔥 Streak Active" : "⚡ In Progress"}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
                    {data?.date_str || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Header Actions: Refresh & Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Refresh statistics"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", isFetching && "animate-spin text-indigo-500")} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(6)
                    onClose()
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SCROLLABLE CONTENT BODY */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Loading today's stats...</p>
                </div>
              ) : (
                <>
                  {/* 4 CORE METRIC HUD CARDS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Card 1: Study Time */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Study Time</span>
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Clock className="w-3 h-3" />
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                            {summary.total_time_minutes > 0 ? summary.total_time_minutes : (summary.total_time_seconds > 0 ? Math.ceil(summary.total_time_seconds / 60) : 0)}
                          </span>
                          <span className="text-[11px] font-black text-slate-500">mins</span>
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-bold truncate mt-0.5">
                          {summary.first_session_time 
                            ? `${summary.first_session_time} → ${summary.last_session_time || summary.first_session_time}`
                            : 'No session yet'}
                        </p>
                      </div>
                    </div>

                    {/* Card 2: Questions Practiced */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Questions</span>
                        <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <HelpCircle className="w-3 h-3" />
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                            {summary.total_questions}
                          </span>
                          <span className="text-[11px] font-black text-slate-500">questions</span>
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-bold truncate mt-0.5">
                          +{summary.new_questions} new • {summary.reviewed_questions} review
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Accuracy */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Accuracy</span>
                        <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Target className="w-3 h-3" />
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                            {summary.accuracy}%
                          </span>
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-bold truncate mt-0.5">
                          {summary.correct_count} correct • {summary.wrong_count} wrong
                        </p>
                      </div>
                    </div>

                    {/* Card 4: XP Earned */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">XP Earned</span>
                        <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Zap className="w-3 h-3 fill-current" />
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg sm:text-xl font-black text-amber-600 tabular-nums">
                            +{summary.xp_earned}
                          </span>
                          <span className="text-[11px] font-black text-slate-500">XP</span>
                        </div>
                        <p className="text-[9.5px] text-slate-400 font-bold truncate mt-0.5">
                          {summary.total_sessions} session{summary.total_sessions !== 1 ? 's' : ''} completed
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* HOURLY FOCUS HEATMAP (00:00 - 23:00) */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-600 stroke-[2.2]" />
                        <h3 className="text-xs sm:text-sm font-black text-slate-800">Hourly Study Pulse</h3>
                      </div>
                      <span className="text-[10px] font-black text-slate-400">
                        Peak: <span className="text-indigo-600 font-bold">{Math.max(...hourlyActivity)} questions</span>
                      </span>
                    </div>

                    {/* 24 Bars with Hour Tooltips */}
                    <div className="pt-2 pb-1">
                      <div className="h-20 sm:h-24 flex items-end gap-[3px] sm:gap-1 px-1">
                        {hourlyActivity.map((count, hour) => {
                          const heightPct = count === 0 ? 6 : Math.max(14, Math.round((count / maxHourlyCount) * 100))
                          const isPeak = count > 0 && count === maxHourlyCount
                          const isNow = hour === new Date().getHours()

                          return (
                            <div
                              key={hour}
                              className="flex-1 flex flex-col items-center h-full justify-end group relative"
                            >
                              {/* Hover Floating Tooltip */}
                              <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 absolute -top-8 z-30 bg-slate-900 text-white text-[9.5px] font-black px-1.5 py-0.5 rounded-md shadow-md whitespace-nowrap">
                                {hour.toString().padStart(2, '0')}:00 • {count} q
                              </div>

                              {/* Vertical Bar */}
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={cn(
                                  "w-full rounded-t-sm transition-all duration-300",
                                  count === 0 
                                    ? "bg-slate-100 group-hover:bg-slate-200" 
                                    : isPeak 
                                      ? "bg-gradient-to-t from-indigo-600 to-purple-500 shadow-xs shadow-indigo-500/30" 
                                      : "bg-indigo-400 group-hover:bg-indigo-500"
                                )}
                              />

                              {/* Active Hour Indicator dot */}
                              {isNow && (
                                <div className="w-1 h-1 rounded-full bg-indigo-600 mt-1" />
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Hour Axis Labels */}
                      <div className="flex justify-between text-[8.5px] font-black text-slate-400 mt-1 px-1 uppercase tracking-wider">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>23:00</span>
                      </div>
                    </div>
                  </div>

                  {/* RECENT SESSIONS FEED */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-600 stroke-[2.2]" />
                        <h3 className="text-xs sm:text-sm font-black text-slate-800">Today's Session Feed</h3>
                      </div>
                      <span className="text-[10px] font-black text-slate-400">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
                    </div>

                    {sessions.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-xs font-bold text-slate-400">No practice sessions completed yet today.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Start a quiz from the roadmap or library to begin!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sessions.map((sess: any) => {
                          const meta = MODE_META[sess.mode] || MODE_META['mcq']

                          return (
                            <div
                              key={sess.attempt_id}
                              onClick={() => {
                                onClose()
                                navigate(`/quiz/${sess.quiz_id}`)
                              }}
                              className="p-3 bg-slate-50/80 hover:bg-indigo-50/40 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-sm shadow-2xs shrink-0">
                                  {meta.emoji}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                    {sess.quiz_title}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-slate-400">
                                    <span>{sess.time_str}</span>
                                    <span>•</span>
                                    <span>{sess.total_questions} questions</span>
                                    <span>•</span>
                                    <span className={cn(
                                      "font-black",
                                      sess.accuracy >= 80 ? "text-emerald-600" : sess.accuracy >= 50 ? "text-amber-600" : "text-rose-600"
                                    )}>
                                      {sess.accuracy}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md text-[9px] font-black border uppercase",
                                  meta.badgeBg
                                )}>
                                  {meta.label}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* QUIZZES STUDIED BREAKDOWN */}
                  {quizzesStudied.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs space-y-2.5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-600 stroke-[2.2]" />
                        <h3 className="text-xs sm:text-sm font-black text-slate-800">Quizzes Practiced Today</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {quizzesStudied.map((q: any) => (
                          <div 
                            key={q.quiz_id}
                            onClick={() => {
                              onClose()
                              navigate(`/quiz/${q.quiz_id}`)
                            }}
                            className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between hover:bg-purple-50/30 hover:border-purple-200/60 transition-all cursor-pointer"
                          >
                            <span className="text-xs font-black text-slate-700 truncate min-w-0 pr-2">{q.title}</span>
                            <span className="text-[10px] font-black text-purple-600 bg-purple-100/60 px-2 py-0.5 rounded-md shrink-0">
                              {q.questions_count} q
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* BOTTOM DOCKED ACTION BAR */}
            <div className="bg-white p-3.5 sm:p-4 border-t border-slate-200/80 flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  if (onSwitchTab) onSwitchTab('roadmap')
                }}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue Today's Roadmap</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
