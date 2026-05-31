import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trophy, ChevronRight, LayoutGrid, Users, Zap, Flame, BrainCircuit, X, Play, Crown, Medal, Swords, Settings, Info } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

interface ActiveGoal {
  goal_id: number
  quiz_id: number
  quiz_title: string
  cover_image: string | null
  total_questions: number
  total_learned: number
  daily_target: number
  done_today: number
  is_target_met: boolean
  streak_count: number
  days_remaining_est: number
}

interface DashboardData {
  user: { id: number, username: string, email: string }
  gamify: { level: number, xp: number, streak: number }
  stats_summary: { avg_accuracy: number, total_time_hours: number, total_questions: number }
}

interface HeatmapDay {
  date: string;
  count: number;
}

interface LeaderboardEntry {
  rank: number
  user_id: number
  username: string
  xp: number
  level: number
  streak: number
  is_current_user: boolean
  out_of_top_10?: boolean
}

interface BadgeProgress {
  id: string
  name: string
  description: string
  icon: string
  criteria_type: string
  target_value: number
  current_value: number
  percentage: number
}

// ─── Mini Contribution Heatmap ────────────────────────────────────────────────
function MiniHeatmap({ data }: { data: HeatmapDay[] }) {
  const WEEKS = 15 // show 15 weeks = ~3.5 months
  const today = new Date()
  
  const dayMap = useMemo(() => {
    const m: Record<string, number> = {}
    data.forEach(d => { m[d.date] = d.count })
    return m
  }, [data])

  const cells: { date: string; count: number }[][] = useMemo(() => {
    const cols: { date: string; count: number }[][] = []
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - (WEEKS * 7 - 1))
    const dayOfWeek = startDate.getDay()
    startDate.setDate(startDate.getDate() - dayOfWeek)

    for (let w = 0; w < WEEKS; w++) {
      const weekCells: { date: string; count: number }[] = []
      for (let d = 0; d < 7; d++) {
        const cell = new Date(startDate)
        cell.setDate(startDate.getDate() + w * 7 + d)
        const ds = cell.toISOString().split('T')[0]
        weekCells.push({ date: ds, count: dayMap[ds] || 0 })
      }
      cols.push(weekCells)
    }
    return cols
  }, [dayMap])

  const getColor = (count: number) => {
    if (count === 0) return 'bg-slate-100'
    if (count < 5) return 'bg-indigo-200'
    if (count < 15) return 'bg-indigo-400'
    if (count < 30) return 'bg-indigo-600'
    return 'bg-indigo-800'
  }

  const totalThisMonth = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    return data.filter(d => d.date >= monthStart).reduce((sum, d) => sum + d.count, 0)
  }, [data])

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-sm flex flex-col gap-3 text-left flex-shrink-0">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lịch sử học tập</span>
        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
          {totalThisMonth} câu tháng này
        </span>
      </div>
      <div className="flex justify-center gap-[3px] py-2 overflow-x-auto scrollbar-none">
        {cells.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell, di) => (
              <div
                key={di}
                title={`${cell.date}: ${cell.count} câu`}
                className={cn(
                  'w-3 h-3 rounded-[3px] transition-all hover:scale-125 cursor-default',
                  getColor(cell.count)
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-0.5 border-t border-slate-50 pt-2.5">
        <span className="text-[8px] font-bold text-slate-400">Ít</span>
        {['bg-slate-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-600', 'bg-indigo-800'].map((c, i) => (
          <div key={i} className={cn('w-2.5 h-2.5 rounded-[2px]', c)} />
        ))}
        <span className="text-[8px] font-bold text-slate-400">Nhiều</span>
      </div>
    </div>
  )
}

// ─── Leaderboard Widget ────────────────────────────────────────────────────────
function LeaderboardWidget({ data, activeFilter, onFilterChange }: { 
  data: { 
    leaderboard: any[], 
    current_user_rank: number | null,
    time_leaderboard?: any[],
    current_user_time_rank?: number | null
  },
  activeFilter: string,
  onFilterChange: (f: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'xp' | 'time'>('xp')

  const rankIcons: Record<number, React.ReactNode> = {
    1: <Crown className="w-4 h-4 text-amber-500" />,
    2: <Medal className="w-4 h-4 text-slate-400" />,
    3: <Medal className="w-4 h-4 text-amber-700" />,
  }
  const rankColors: Record<number, string> = {
    1: 'from-amber-50 to-orange-50 border-amber-200/80',
    2: 'from-slate-50 to-slate-50/80 border-slate-200/60',
    3: 'from-amber-50/50 to-orange-50/30 border-amber-100/60',
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const hours = Math.floor(mins / 60)
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`
    }
    return `${mins}m`
  }

  const currentList = activeTab === 'xp' ? data.leaderboard : (data.time_leaderboard || [])
  const currentRank = activeTab === 'xp' ? data.current_user_rank : data.current_user_time_rank

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-sm flex flex-col gap-4 text-left flex-shrink-0">
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">🏆 Bảng xếp hạng</span>
          
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('xp')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                activeTab === 'xp' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              XP
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                activeTab === 'time' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Thời gian
            </button>
          </div>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-1.5 self-start">
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'week', label: 'Tuần này' },
            { id: 'all_time', label: 'Toàn bộ' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                activeFilter === filter.id
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {currentList.map((entry, index) => {
          const isOutOfTop5 = (entry as any).out_of_top_5 || (entry as any).out_of_top_10
          
          return (
            <React.Fragment key={entry.user_id}>
              {isOutOfTop5 && index > 0 && (
                <div className="flex justify-center py-1">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                  </div>
                </div>
              )}
              
              <div
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl border bg-gradient-to-r transition-all',
                  entry.is_current_user
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300/50'
                    : rankColors[entry.rank as number] || 'border-slate-100 bg-slate-50/50',
                  isOutOfTop5 && 'border-dashed'
                )}
              >
                <div className="w-6 flex items-center justify-center flex-shrink-0">
                  {rankIcons[entry.rank as number] || (
                    <span className="text-[9px] font-black text-slate-400">#{entry.rank}</span>
                  )}
                </div>

                <div className={cn(
                  'w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0',
                  entry.is_current_user
                    ? 'bg-indigo-600 text-white'
                    : entry.rank === 1
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                )}>
                  {entry.username.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <span className={cn(
                    'text-[10px] font-black truncate block',
                    entry.is_current_user ? 'text-indigo-700' : 'text-slate-700'
                  )}>
                    {entry.username} {entry.is_current_user && '(Bạn)'}
                  </span>
                  {activeTab === 'xp' ? (
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      Lvl {entry.level} · 🔥 {entry.streak}d
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1">
                      Tổng thời gian học
                    </span>
                  )}
                </div>

                <div className="flex-shrink-0 text-right">
                  <span className={cn(
                    'text-[10px] font-black',
                    entry.rank === 1 ? 'text-amber-600' : entry.is_current_user ? 'text-indigo-600' : 'text-slate-600'
                  )}>
                    {activeTab === 'xp' ? entry.xp.toLocaleString() : formatTime(entry.total_time || 0)}
                  </span>
                  <span className="text-[7px] font-black text-slate-400 block">
                    {activeTab === 'xp' ? 'XP' : 'Đã học'}
                  </span>
                </div>
              </div>
            </React.Fragment>
          )
        })}
      </div>

      {currentRank && (
        <div className="pt-1 border-t border-slate-100 text-center">
          <span className="text-[9px] font-black text-slate-400">
            Hạng của bạn: <span className="text-indigo-600 font-extrabold">#{currentRank}</span> toàn hệ thống
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Badge Progress Widget ─────────────────────────────────────────────────────
function BadgeProgressWidget({ data }: { data: BadgeProgress[] }) {
  return (
    <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-sm flex flex-col gap-3.5 text-left flex-shrink-0">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Hành trình danh hiệu</span>
          <span className="text-[8px] font-black text-indigo-600 uppercase tracking-wider block mt-0.5">
            🏆 Sắp đạt được
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {data.map(badge => (
          <div key={badge.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/30">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 flex-shrink-0 text-lg">
              {badge.icon === 'Zap' ? '⚡' : badge.icon === 'Flame' ? '🔥' : '🏆'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black text-slate-800 truncate">{badge.name}</span>
                <span className="text-[9px] font-black text-indigo-600">{badge.percentage}%</span>
              </div>
              <p className="text-[8px] font-medium text-slate-400 truncate mt-0.5">{badge.description}</p>
              <div className="h-1 bg-slate-100 rounded-full mt-2 overflow-hidden w-full relative">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${badge.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface GlobalGoals {
  daily_time_target: number
  daily_card_target: number
  daily_new_card_target: number
  actual_time_minutes: number
  actual_cards_completed: number
  actual_new_cards_completed?: number
}

// ─── Today Focus Widget ────────────────────────────────────────────────────────
function TodayFocusWidget({
  data,
  activeGoals,
  todayReview,
  onOpenSettings,
  onStartPractice,
  navigate
}: {
  data: GlobalGoals;
  activeGoals: ActiveGoal[] | undefined;
  todayReview: any | undefined;
  onOpenSettings: () => void;
  onStartPractice: (quiz: any) => void;
  navigate: any;
}) {
  const timePercentage = Math.min(100, Math.round((data.actual_time_minutes / (data.daily_time_target || 1)) * 100))
  const cardPercentage = Math.min(100, Math.round((data.actual_cards_completed / (data.daily_card_target || 1)) * 100))
  const newCardPercentage = Math.min(100, Math.round(((data.actual_new_cards_completed || 0) / (data.daily_new_card_target || 1)) * 100))

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 shadow-sm relative overflow-hidden text-left mb-5 flex-shrink-0">
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-indigo-50/30 blur-md pointer-events-none" />
      
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">🎯 TODAY'S FOCUS</span>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-1">Mục tiêu ngày của bạn</h3>
        </div>
        <button
          onClick={onOpenSettings}
          className="w-8.5 h-8.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 shadow-sm active:scale-90 hover:bg-slate-100 transition-all"
          title="Cài đặt mục tiêu"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 relative z-10 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 bg-slate-50/60 p-2 sm:p-3.5 rounded-2xl sm:rounded-[1.5rem] border border-slate-100">
          <div className="relative w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm">
            <svg className="w-10 h-10 sm:w-14 sm:h-14 transform -rotate-90">
              <circle cx="50%" cy="50%" r="40%" className="stroke-slate-100 fill-none" strokeWidth="3" />
              <circle
                cx="50%" cy="50%" r="40%"
                className="stroke-indigo-600 fill-none transition-all duration-500 ease-out"
                strokeWidth="3"
                strokeDasharray="250%"
                strokeDashoffset={`${250 - (timePercentage / 100) * 250}%`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[8px] sm:text-[10px] font-black text-indigo-600">
              {timePercentage}%
            </span>
          </div>
          <div className="text-center sm:text-left mt-1 sm:mt-0">
            <span className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-none sm:leading-normal">Thời gian học</span>
            <span className="text-[9px] sm:text-xs font-black text-slate-850 block mt-0.5 whitespace-nowrap">
              {data.actual_time_minutes} / {data.daily_time_target}m
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 bg-slate-50/60 p-2 sm:p-3.5 rounded-2xl sm:rounded-[1.5rem] border border-slate-100">
          <div className="relative w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm">
            <svg className="w-10 h-10 sm:w-14 sm:h-14 transform -rotate-90">
              <circle cx="50%" cy="50%" r="40%" className="stroke-slate-100 fill-none" strokeWidth="3" />
              <circle
                cx="50%" cy="50%" r="40%"
                className="stroke-emerald-500 fill-none transition-all duration-500 ease-out"
                strokeWidth="3"
                strokeDasharray="250%"
                strokeDashoffset={`${250 - (cardPercentage / 100) * 250}%`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[8px] sm:text-[10px] font-black text-emerald-600">
              {cardPercentage}%
            </span>
          </div>
          <div className="text-center sm:text-left mt-1 sm:mt-0">
            <span className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-none sm:leading-normal">Câu đã trả lời</span>
            <span className="text-[9px] sm:text-xs font-black text-slate-850 block mt-0.5 whitespace-nowrap">
              {data.actual_cards_completed} / {data.daily_card_target}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 bg-slate-50/60 p-2 sm:p-3.5 rounded-2xl sm:rounded-[1.5rem] border border-slate-100">
          <div className="relative w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm">
            <svg className="w-10 h-10 sm:w-14 sm:h-14 transform -rotate-90">
              <circle cx="50%" cy="50%" r="40%" className="stroke-slate-100 fill-none" strokeWidth="3" />
              <circle
                cx="50%" cy="50%" r="40%"
                className="stroke-rose-500 fill-none transition-all duration-500 ease-out"
                strokeWidth="3"
                strokeDasharray="250%"
                strokeDashoffset={`${250 - (newCardPercentage / 100) * 250}%`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[8px] sm:text-[10px] font-black text-rose-600">
              {newCardPercentage}%
            </span>
          </div>
          <div className="text-center sm:text-left mt-1 sm:mt-0">
            <span className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-none sm:leading-normal">Câu hỏi mới</span>
            <span className="text-[9px] sm:text-xs font-black text-slate-850 block mt-0.5 whitespace-nowrap">
              {data.actual_new_cards_completed || 0} / {data.daily_new_card_target || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3.5">Mục tiêu theo từng bộ đề:</span>
        
        {!activeGoals || activeGoals.length === 0 ? (
          <div className="text-center py-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400">Chưa thiết lập mục tiêu cho bộ đề nào.</span>
            <Link to="/library" className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block mt-1 hover:underline">📚 Đi đến thư viện</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeGoals.map(goal => {
              const deckReview = todayReview?.decks_summary?.find((d: any) => d.quiz_id === goal.quiz_id)
              const dueReviews = deckReview ? deckReview.due_count : 0
              const isGoalMet = goal.done_today >= goal.daily_target
              const goalPercentage = goal.daily_target > 0 ? Math.min(100, Math.round((goal.done_today / goal.daily_target) * 100)) : 0

              return (
                <div key={goal.goal_id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
                      <svg className="w-11 h-11 transform -rotate-90">
                        <circle cx="22" cy="22" r="17" className="stroke-slate-50 fill-none" strokeWidth="2.5" />
                        <circle
                          cx="22" cy="22" r="17"
                          className={cn("fill-none transition-all duration-500 ease-out", isGoalMet ? "stroke-amber-400" : "stroke-indigo-600")}
                          strokeWidth="2.5"
                          strokeDasharray={2 * Math.PI * 17}
                          strokeDashoffset={2 * Math.PI * 17 - (goalPercentage / 100) * 2 * Math.PI * 17}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className={cn("absolute text-[8px] font-black", isGoalMet ? "text-amber-500" : "text-indigo-600")}>
                        {goal.done_today}/{goal.daily_target}
                      </span>
                    </div>

                    <div className="min-w-0 text-left">
                      <h4 className="text-xs font-black text-slate-800 truncate leading-snug">{goal.quiz_title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100/60">
                          🔥 {goal.streak_count}D
                        </span>
                        {dueReviews > 0 ? (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100/60 animate-pulse">
                            ⚠️ {dueReviews} câu cần học lại
                          </span>
                        ) : (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100/60">
                            ✅ Đã thuộc hết
                          </span>
                        )}
                        <span className="text-[8px] font-bold text-slate-400">
                          {isGoalMet ? "Đạt mục tiêu học mới ⚡" : `Còn lại ${goal.daily_target - goal.done_today} câu mới`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => navigate(`/quiz/${goal.quiz_id}/play`)}
                      className={cn(
                        "h-8.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all",
                        dueReviews > 0 || !isGoalMet
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      )}
                      title="Spaced Repetition"
                    >
                      <BrainCircuit className="w-3.5 h-3.5" />
                      Học lại {dueReviews > 0 && `(${dueReviews})`}
                    </button>
                    <button
                      onClick={() => onStartPractice({ id: goal.quiz_id, title: goal.quiz_title, questions_count: goal.total_questions })}
                      className="h-8.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shadow-emerald-100 active:scale-95 transition-all"
                      title="Luyện tập tự do"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      Luyện tập
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Goal Settings Modal ───────────────────────────────────────────────────────
function GoalSettingsModal({
  isOpen,
  onClose,
  initialTime,
  initialCard,
  initialNewCard,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTime: number;
  initialCard: number;
  initialNewCard: number;
  onSave: (time: number, card: number, newCard: number) => Promise<void>;
}) {
  const [timeTarget, setTimeTarget] = useState(initialTime)
  const [cardTarget, setCardTarget] = useState(initialCard)
  const [newCardTarget, setNewCardTarget] = useState(initialNewCard)
  const [isSaving, setIsSaving] = useState(false)

  const timePresets = [10, 20, 30, 60]
  const cardPresets = [10, 20, 30, 50]
  const newCardPresets = [5, 10, 20, 30]

  useEffect(() => {
    if (isOpen) {
      setTimeTarget(initialTime)
      setCardTarget(initialCard)
      setNewCardTarget(initialNewCard)
    }
  }, [isOpen, initialTime, initialCard, initialNewCard])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(timeTarget, cardTarget, newCardTarget)
      onClose()
    } catch (e) {
      alert("Lỗi khi lưu mục tiêu")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100 text-left"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Cài đặt mục tiêu học</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Mục tiêu thời gian học (phút/ngày)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {timePresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTimeTarget(preset)}
                      className={cn(
                        "py-2.5 rounded-xl text-[10px] font-black tracking-wider transition-all border",
                        timeTarget === preset
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={timeTarget}
                  onChange={(e) => setTimeTarget(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-750 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="Nhập số phút tùy chọn..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Mục tiêu số câu học (câu/ngày)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {cardPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCardTarget(preset)}
                      className={cn(
                        "py-2.5 rounded-xl text-[10px] font-black tracking-wider transition-all border",
                        cardTarget === preset
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {preset} Câu
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={cardTarget}
                  onChange={(e) => setCardTarget(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-750 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="Nhập số câu tùy chọn..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Mục tiêu câu hỏi mới (câu/ngày)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {newCardPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewCardTarget(preset)}
                      className={cn(
                        "py-2.5 rounded-xl text-[10px] font-black tracking-wider transition-all border",
                        newCardTarget === preset
                          ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {preset} Câu
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newCardTarget}
                  onChange={(e) => setNewCardTarget(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-750 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="Nhập số câu mới tùy chọn..."
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-150 transition-all flex items-center justify-center"
              >
                {isSaving ? "ĐANG LƯU..." : "LƯU MỤC TIÊU"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export default function Dashboard() {
  const { setUser, setGamify } = useAppStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [selectedPracticeQuiz, setSelectedPracticeQuiz] = useState<any | null>(null)
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [timeFilter, setTimeFilter] = useState('all_time')

  const { data: globalGoals, refetch: refetchGlobalGoals } = useQuery<GlobalGoals>({
    queryKey: ['globalGoals'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/quiz/goals/global')
      return res.data
    }
  })

  const handleSaveGlobalGoals = async (timeTarget: number, cardTarget: number, newCardTarget: number) => {
    await axios.post('/api/v1/quiz/goals/global', {
      daily_time_target: timeTarget,
      daily_card_target: cardTarget,
      daily_new_card_target: newCardTarget
    })
    refetchGlobalGoals()
  }

  const { data: activeGoals } = useQuery<ActiveGoal[]>({
    queryKey: ['activeGoals'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/quiz/goals/active')
      return res.data
    }
  })

  const { data: todayReview } = useQuery({
    queryKey: ['todayReview'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/quiz/today-review')
      return res.data
    }
  })

  const { data: heatmapData } = useQuery<HeatmapDay[]>({
    queryKey: ['stats-heatmap'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/quiz/stats/heatmap')
      return res.data
    }
  })

  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard', timeFilter],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/gamification/leaderboard?time_filter=${timeFilter}`)
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: badgesProgress } = useQuery<BadgeProgress[]>({
    queryKey: ['badgesProgress'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/gamification/badges/progress')
      return res.data
    }
  })

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      setUser(res.data.user)
      setGamify(res.data.gamify)
      return res.data
    },
    retry: false
  })

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        document.body.style.overflow = 'hidden'
        document.body.style.height = '100vh'
        document.documentElement.style.overflow = 'hidden'
        document.documentElement.style.height = '100vh'
      } else {
        document.body.style.overflow = ''
        document.body.style.height = ''
        document.documentElement.style.overflow = ''
        document.documentElement.style.height = ''
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      document.body.style.overflow = ''
      document.body.style.height = ''
      document.documentElement.style.overflow = ''
      document.documentElement.style.height = ''
    }
  }, [])

  const handleJoinRoom = async () => {
    if (!roomCode) return
    setIsJoining(true)
    try {
      await axios.post('/api/v1/quiz/room/join', { room_code: roomCode })
      navigate(`/room/${roomCode.toUpperCase()}`)
    } catch (e) {
      alert("Room not found or expired")
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading || !data) return (
    <div className="h-screen flex items-center justify-center font-black animate-pulse text-indigo-600 tracking-widest uppercase italic bg-[#fafbfd]">
      🚀 NEURAL SYNCING...
    </div>
  )

  return (
    <div className="flex flex-col bg-gradient-to-br from-[#f8fafc] via-[#f1f6fa] to-[#f8fafc] min-h-[calc(100vh-6rem)] relative overflow-x-hidden md:overflow-hidden md:min-h-0 md:h-full">
      
      {/* Soft blobs */}
      <div className="absolute top-[20%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-200/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-pink-200/10 blur-[130px] pointer-events-none" />

      {/* MOBILE HEADER */}
      <div className="sticky top-0 z-[150] bg-white/80 backdrop-blur-xl border-b border-slate-100 md:hidden flex-shrink-0">
         <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-100 flex-shrink-0">
                  <BrainCircuit className="w-6 h-6 animate-pulse" />
               </div>
               <div>
                  <h1 className="text-[13px] font-black text-slate-800 leading-none mb-1">Hello {data.user?.username}! 👋</h1>
                  <div className="flex items-center gap-1.5">
                     <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-lg border border-indigo-100/50">LVL {data.gamify?.level}</span>
                     <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-lg border border-orange-100/50 flex items-center gap-0.5">
                       🔥 {data.gamify?.streak}D
                     </span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <button 
                  onClick={() => setIsJoinModalOpen(true)}
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 shadow-sm active:scale-90 transition-all"
               >
                  <Users className="w-5 h-5" />
               </button>
            </div>
         </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex w-full h-full overflow-hidden px-8 py-6 gap-8">
        
        {/* LEFT COLUMN: Sidebar (Contribution History, Profile stats, Arena shortcut) */}
        <aside className="w-80 flex-shrink-0 flex flex-col gap-5 h-full overflow-y-auto pr-2 pb-6 scrollbar-thin">
          
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4 text-left relative overflow-hidden flex-shrink-0">
            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-indigo-50/40 blur-md pointer-events-none" />
            
            <div className="flex items-center gap-3.5 z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md text-2xl shadow-indigo-100">
                👋
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Welcome back</span>
                <h2 className="text-base font-black text-slate-800 leading-tight mt-0.5 truncate max-w-[170px]">
                  {data.user?.username}
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50/50 border border-orange-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Streak</span>
                </div>
                <span className="text-xs font-black text-orange-600 bg-white px-2.5 py-1 rounded-xl border border-orange-200">{data.gamify?.streak} ngày 🔥</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50/50 border border-indigo-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Level</span>
                </div>
                <span className="text-xs font-black text-indigo-600 bg-white px-2.5 py-1 rounded-xl border border-indigo-200">Lvl {data.gamify?.level} ⭐</span>
              </div>
            </div>
          </div>

          {heatmapData && heatmapData.length > 0 && <MiniHeatmap data={heatmapData} />}

          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-sm flex flex-col gap-3 text-left flex-shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Đấu trường trí tuệ</span>
            <button 
              onClick={() => setIsJoinModalOpen(true)}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <Users className="w-4 h-4" />
              Vào phòng Arena
            </button>
          </div>
          
        </aside>

        {/* RIGHT COLUMN: Study target widgets & Leaderboard & Badges */}
        <section className="flex-1 h-full flex flex-col gap-5 overflow-y-auto pr-2 scrollbar-thin text-left pb-8">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight italic">Mục tiêu hôm nay</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Today's Study Targets & Goals</p>
            </div>
            <Link 
              to="/library"
              className="h-10 px-5 bg-white border border-slate-200/80 rounded-xl text-[10px] font-black text-indigo-600 uppercase tracking-wider hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              Thư Viện 📚
            </Link>
          </div>

          {globalGoals && (
            <TodayFocusWidget
              data={globalGoals}
              activeGoals={activeGoals}
              todayReview={todayReview}
              onOpenSettings={() => setIsGoalModalOpen(true)}
              onStartPractice={(quiz) => {
                setSelectedPracticeQuiz(quiz)
                setIsPracticeModalOpen(true)
              }}
              navigate={navigate}
            />
          )}

          {badgesProgress && <BadgeProgressWidget data={badgesProgress} />}

          {leaderboardData && leaderboardData.leaderboard?.length > 0 && (
            <LeaderboardWidget data={leaderboardData} activeFilter={timeFilter} onFilterChange={setTimeFilter} />
          )}
        </section>

      </div>

      {/* MOBILE FEED */}
      <div className="md:hidden px-4 w-full mt-4 flex-grow space-y-4 overflow-y-auto pb-24">
        {globalGoals && (
          <TodayFocusWidget
            data={globalGoals}
            activeGoals={activeGoals}
            todayReview={todayReview}
            onOpenSettings={() => setIsGoalModalOpen(true)}
            onStartPractice={(quiz) => {
              setSelectedPracticeQuiz(quiz)
              setIsPracticeModalOpen(true)
            }}
            navigate={navigate}
          />
        )}

        {badgesProgress && <BadgeProgressWidget data={badgesProgress} />}

        {leaderboardData && leaderboardData.leaderboard?.length > 0 && (
          <LeaderboardWidget data={leaderboardData} activeFilter={timeFilter} onFilterChange={setTimeFilter} />
        )}

        {heatmapData && heatmapData.length > 0 && <MiniHeatmap data={heatmapData} />}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Enter Arena Room</h3>
                <button onClick={() => setIsJoinModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                   <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Enter Arena Room Code</label>
                   <input 
                     type="text" 
                     placeholder="e.g. AZ78K"
                     value={roomCode}
                     onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                     className="w-full h-16 bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 text-2xl font-black tracking-[0.3em] text-center text-indigo-600 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-sm"
                   />
                </div>
                
                <button 
                  onClick={handleJoinRoom}
                  disabled={!roomCode || isJoining}
                  className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none"
                >
                  {isJoining ? 'CONNECTING...' : 'ENTER ROOM NOW'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isPracticeModalOpen && selectedPracticeQuiz && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsPracticeModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Practice Mode</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chọn chế độ luyện tập</p>
                  </div>
                </div>
                <button onClick={() => setIsPracticeModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100 mb-2">
                  <h4 className="text-xs font-black text-indigo-600 leading-snug line-clamp-1">{selectedPracticeQuiz.title}</h4>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-black mt-0.5">
                    {selectedPracticeQuiz.questions_count} câu hỏi
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => {
                      setIsPracticeModalOpen(false)
                      navigate(`/practice/${selectedPracticeQuiz.id}/mcq`)
                    }}
                    className="group w-full flex items-center gap-4 p-4 rounded-[1.75rem] border border-slate-200/60 bg-white hover:border-emerald-500 hover:bg-emerald-50/10 active:scale-[0.98] transition-all text-left shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all flex-shrink-0">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block mb-0.5 group-hover:text-indigo-600 transition-colors">Trắc nghiệm (MCQ)</span>
                      <span className="text-[9px] font-medium text-slate-400 block line-clamp-1">Luyện phản xạ nhanh với 4 lựa chọn</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-all" />
                  </button>

                  <button 
                    onClick={() => {
                      setIsPracticeModalOpen(false)
                      navigate(`/practice/${selectedPracticeQuiz.id}/typing`)
                    }}
                    className="group w-full flex items-center gap-4 p-4 rounded-[1.75rem] border border-slate-200/60 bg-white hover:border-emerald-500 hover:bg-emerald-50/10 active:scale-[0.98] transition-all text-left shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100/50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all flex-shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block mb-0.5 group-hover:text-rose-600 transition-colors">Tự luận (Typing)</span>
                      <span className="text-[9px] font-medium text-slate-400 block line-clamp-1">Gõ trực tiếp câu trả lời để ghi nhớ sâu sắc</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-all" />
                  </button>

                  <button 
                    onClick={() => {
                      setIsPracticeModalOpen(false)
                      navigate(`/practice/${selectedPracticeQuiz.id}/listening`)
                    }}
                    className="group w-full flex items-center gap-4 p-4 rounded-[1.75rem] border border-slate-200/60 bg-white hover:border-emerald-500 hover:bg-emerald-50/10 active:scale-[0.98] transition-all text-left shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100/50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all flex-shrink-0">
                      <Play className="w-5 h-5 fill-amber-600 group-hover:fill-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block mb-0.5 group-hover:text-amber-600 transition-colors">Luyện nghe (Listening)</span>
                      <span className="text-[9px] font-medium text-slate-400 block line-clamp-1">Lắng nghe phát âm và chọn đáp án chính xác</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {globalGoals && (
          <GoalSettingsModal
            isOpen={isGoalModalOpen}
            onClose={() => setIsGoalModalOpen(false)}
            initialTime={globalGoals.daily_time_target}
            initialCard={globalGoals.daily_card_target}
            initialNewCard={globalGoals.daily_new_card_target}
            onSave={handleSaveGlobalGoals}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
