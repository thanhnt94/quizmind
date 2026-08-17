import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Trophy, ChevronRight, LayoutGrid, Users, Zap, Flame, BrainCircuit, X, Play, Crown, 
  Medal, Star, CheckCircle2, Circle, Swords, Settings, Target, RefreshCw, User, 
  BookOpen, Sparkles, TrendingUp, Clock, Layers, Compass, ArrowRight, FileText, 
  RotateCcw, Search, Plus, Calendar 
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import DailyComparisonChart from '@/components/DailyComparisonChart'
import { TelegramRoadmapReminderToggle } from '@/components/TelegramRoadmapReminderToggle'

interface DashboardData {
  user: { id: number; username: string; email: string; role?: string }
  gamify: { level: number; xp: number; streak: number }
  stats_summary: { avg_accuracy: number; total_time_hours: number; total_questions: number }
  my_quizzes?: any[]
  discover_quizzes?: any[]
}

interface HeatmapDay {
  date: string
  count: number
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

// ─── Mini Contribution Heatmap ────────────────────────────────────────────────
function MiniHeatmap({ data = [] }: { data?: HeatmapDay[] }) {
  const WEEKS = 15
  const today = new Date()
  const safeData = Array.isArray(data) ? data : []
  
  const dayMap = useMemo(() => {
    const m: Record<string, number> = {}
    safeData.forEach(d => { 
      if (d && d.date) {
        m[d.date] = d.count || 0
      }
    })
    return m
  }, [safeData])

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
    return safeData.filter(d => d && d.date >= monthStart).reduce((sum, d) => sum + (d.count || 0), 0)
  }, [safeData])

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
  data?: { 
    leaderboard?: any[], 
    current_user_rank?: number | null,
    time_leaderboard?: any[],
    current_user_time_rank?: number | null
  },
  activeFilter: string,
  onFilterChange: (f: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'xp' | 'time'>('xp')

  const rankColors: Record<number, string> = {
    1: 'from-amber-50 to-orange-50 border-amber-200/80',
    2: 'from-slate-50 to-slate-50/80 border-slate-200/60',
    3: 'from-amber-50/50 to-orange-50/30 border-amber-100/60',
  }

  const rawList = activeTab === 'xp' ? data?.leaderboard : data?.time_leaderboard
  const currentList = Array.isArray(rawList) ? rawList : []

  return (
    <div className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-sm flex flex-col gap-4 text-left flex-shrink-0">
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">🏆 Bảng xếp hạng</span>
          
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('xp')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                activeTab === 'xp' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              XP
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={cn(
                "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
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
                "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
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
        {currentList.slice(0, 5).map((entry) => (
          <div
            key={entry.user_id}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-xl border bg-gradient-to-r transition-all',
              entry.is_current_user
                ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300/50'
                : rankColors[entry.rank as number] || 'border-slate-100 bg-slate-50/50'
            )}
          >
            <div className="w-6 flex items-center justify-center flex-shrink-0">
              {entry.rank === 1 ? <Crown className="w-4 h-4 text-amber-500" /> : <span className="text-xs font-black text-slate-400">#{entry.rank}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-slate-800 truncate block">{entry.username}</span>
            </div>
            <span className="text-xs font-black text-indigo-600">{entry.xp || entry.study_seconds || 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user: authUser } = useAppStore()
  const [mobileTab, setMobileTab] = useState<'roadmap' | 'decks' | 'stats' | 'rank'>('roadmap')
  const [lbFilter, setLbFilter] = useState('today')
  const [remainingTime, setRemainingTime] = useState('')

  // 1. Fetch Dashboard Stats & User Data
  const { data: dashData } = useQuery<DashboardData>({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      return res.data
    }
  })

  // 2. Fetch Active Roadmap Quizzes (Decks)
  const { data: roadmapData, isLoading: isRoadmapLoading } = useQuery({
    queryKey: ['roadmap-global-decks'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/quiz/roadmap/decks')
      return res.data
    }
  })

  // 3. Fetch Leaderboard
  const { data: lbData } = useQuery({
    queryKey: ['leaderboard', lbFilter],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/stats/leaderboard?time_filter=${lbFilter}`)
      return res.data
    }
  })

  // 4. Fetch Heatmap
  const { data: heatmapData } = useQuery({
    queryKey: ['stats-heatmap'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/heatmap')
      return res.data?.heatmap || []
    }
  })

  // 5. Fetch Daily Comparison
  const { data: dailyComparisonData, isLoading: isDailyCompLoading } = useQuery({
    queryKey: ['stats-daily-comparison'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/daily-comparison')
      return res.data
    }
  })

  // 6. Fetch Badges
  const { data: badgesData } = useQuery({
    queryKey: ['badges-progress'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/gamification/badges/progress')
      return res.data?.badges || []
    }
  })

  // Countdown timer to midnight (UTC+7)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      const diff = Math.max(0, midnight.getTime() - now.getTime())
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)
      setRemainingTime(`${h}h ${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`)
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [])

  const roadmapQuizzes: any[] = Array.isArray(roadmapData?.decks) 
    ? roadmapData.decks 
    : (Array.isArray(roadmapData?.quizzes) ? roadmapData.quizzes : [])
  const user = dashData?.user || authUser || { username: 'Học Viên', email: '', role: 'user' }
  const gamify = dashData?.gamify || { level: 1, xp: 0, streak: 0 }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-800 selection:bg-indigo-100">
      
      {/* ========================================================================= */}
      {/* MOBILE TOP HEADER & 4-TAB NAVIGATION                                      */}
      {/* ========================================================================= */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-orange-500 flex items-center justify-center text-white font-black text-sm shadow-xs">
              ⚡
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-none">QuizMind</h1>
              <span className="text-[9px] font-bold text-slate-400">Gamified Learning Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Streak Pill */}
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white text-xs font-black shadow-xs">
              <span>🔥</span>
              <span>{gamify.streak || 0}d</span>
            </div>

            {/* User Level */}
            <div className="w-7 h-7 rounded-xl bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center shadow-xs">
              {gamify.level || 1}
            </div>
          </div>
        </div>

        {/* 4 Tabs */}
        <div className="grid grid-cols-4 border-t border-slate-100 text-center">
          {[
            { id: 'roadmap', label: 'Lộ Trình', icon: Compass },
            { id: 'decks', label: 'Bộ Đề', icon: BookOpen },
            { id: 'stats', label: 'Thống Kê', icon: TrendingUp },
            { id: 'rank', label: 'Xếp Hạng', icon: Trophy }
          ].map(tab => {
            const Icon = tab.icon
            const isActive = mobileTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id as any)}
                className={cn(
                  "py-2.5 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer",
                  isActive
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP SPLIT VIEW & MOBILE TAB CONTENT                                    */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ─── LEFT SIDEBAR (DESKTOP) ────────────────────────────────────────── */}
          <div className="hidden lg:flex lg:col-span-4 flex-col gap-5 sticky top-6">
            {/* User Profile Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden">
              <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500" />
              
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-indigo-100">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 truncate">{user.username}</h3>
                    {user.role === 'admin' && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[9px] font-black uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium truncate">{user.email || 'Học viên QuizMind'}</p>
                </div>
              </div>

              {/* Level & XP Progress Bar */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-slate-700">Level {gamify.level || 1}</span>
                  <span className="text-indigo-600">{gamify.xp || 0} XP</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((gamify.xp || 0) % 100))}%` }}
                  />
                </div>
              </div>

              {/* Streak Counter */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shadow-sm shadow-orange-200">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-6 h-6 fill-white" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-100 block leading-none">Chuỗi Học</span>
                    <span className="text-lg font-black leading-tight">{gamify.streak || 0} Ngày Liên Tục</span>
                  </div>
                </div>
                <span className="text-xl">🔥</span>
              </div>

              {/* Telegram Reminder Quick Toggle */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Telegram Bot</span>
                <TelegramRoadmapReminderToggle />
              </div>
            </div>

            {/* Mini Contribution Heatmap */}
            <MiniHeatmap data={heatmapData} />

            {/* Leaderboard Widget */}
            {lbData && (
              <LeaderboardWidget 
                data={lbData} 
                activeFilter={lbFilter} 
                onFilterChange={setLbFilter} 
              />
            )}
          </div>

          {/* ─── MAIN CONTENT AREA (DESKTOP & MOBILE) ─────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">

            {/* MOBILE: ROADMAP TAB OR DESKTOP HERO */}
            <div className={cn("space-y-6", mobileTab !== 'roadmap' && "hidden lg:block")}>
                
                {/* 1. ROADMAP QUIZZES SECTION */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                          Lộ Trình Học Tập ({roadmapQuizzes.length})
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">Pipeline luyện tập câu hỏi hàng ngày</p>
                      </div>
                    </div>
                    
                    <Link
                      to="/library"
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs flex items-center gap-1 active:scale-95 transition-all shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm bộ đề</span>
                    </Link>
                  </div>

                  {isRoadmapLoading ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-sm space-y-3">
                      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-400">Đang tải Lộ Trình của bạn...</p>
                    </div>
                  ) : roadmapQuizzes.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/90 shadow-sm space-y-4">
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto text-2xl shadow-inner">
                        🗺️
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-slate-900">Chưa Kích Hoạt Lộ Trình Nào</h3>
                        <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                          Chọn bộ đề bạn muốn ôn luyện để thiết lập mục tiêu hàng ngày, làm bài kiểm tra và duy trì chuỗi Streak ngọn lửa!
                        </p>
                      </div>
                      <Link
                        to="/library"
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-200 transition-all inline-block active:scale-95"
                      >
                        Vào Thư Viện Chọn Bộ Đề 📚
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {roadmapQuizzes.map((item, idx) => {
                        const st = item.status || {}
                        const isDone = Boolean(st.all_done)
                        const pipeline = st.pipeline || []
                        const deckStreak = st.streak || 0
                        const currentStepIdx = st.current_step_index ?? 0

                        // Mascot calculation
                        let mascotImg = '/mascot/sleepy.png'
                        let mascotLine1 = 'Hôm nay bạn chưa làm câu nào,'
                        let mascotLine2 = 'bắt đầu thôi! 🚀'

                        if (isDone) {
                          mascotImg = '/mascot/celebrating.png'
                          mascotLine1 = 'Xuất sắc!'
                          mascotLine2 = 'Đã hoàn thành lộ trình hôm nay! 🎉'
                        } else if (st.stage_1_done) {
                          mascotImg = '/mascot/excited.png'
                          mascotLine1 = 'Đang bùng cháy!'
                          mascotLine2 = 'Tiếp tục giữ vững tiến độ nhé 🔥'
                        } else if ((st.new_learned_today || 0) > 0 || (st.review_completed_today || 0) > 0) {
                          mascotImg = '/mascot/excited.png'
                          mascotLine1 = 'Khởi đầu tốt lắm!'
                          mascotLine2 = 'Cố gắng hoàn thành các bước hôm nay 💪'
                        }

                        return (
                          <div
                            key={item.quiz_id || item.deck_id || idx}
                            className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md"
                          >
                            {/* Subheader bar */}
                            <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-700">Roadmap</span>
                                <span className="text-slate-400">{idx + 1} / {roadmapQuizzes.length}</span>
                                <TelegramRoadmapReminderToggle />
                              </div>
                              <Link
                                to={`/quiz/${item.quiz_id || item.deck_id}/roadmap`}
                                className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer shrink-0"
                              >
                                <span>Chi tiết</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>

                            {/* HERO MASCOT CARD */}
                            <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-amber-100/50 relative overflow-hidden flex flex-row items-center justify-between min-h-[160px]">
                              
                              <div className="relative z-20 flex-1 max-w-[68%] sm:max-w-[72%] min-w-0 flex flex-col justify-center gap-2.5 py-1">
                                
                                {/* TOP BADGES */}
                                <div className="flex flex-col gap-2">
                                  {/* DÒNG 1: 🔥 Streak & ⏱️ Thời gian còn lại */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white rounded-full text-xs font-black shadow-xs shrink-0">
                                      <span>🔥</span>
                                      <span>{deckStreak} ngày streak</span>
                                    </div>
                                    {isDone ? (
                                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-950 border border-emerald-300/80 rounded-full text-xs font-black shadow-2xs shrink-0">
                                        <span>✓</span>
                                        <span>Đã xong hôm nay</span>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-900 border border-amber-300/80 rounded-full text-xs font-black shadow-2xs shrink-0">
                                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>Còn {remainingTime}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* DÒNG 2: 📖 Tên bộ đề */}
                                  <div className="flex items-center max-w-full">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900/95 text-white rounded-xl text-xs font-bold shadow-xs max-w-full">
                                      <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span className="truncate max-w-[280px] sm:max-w-[400px] font-extrabold text-white">
                                        {item.title}
                                      </span>
                                    </div>
                                  </div>

                                  {/* DÒNG 3: 🎓 Thẻ đã học & 📅 Ngày dự kiến xong */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div 
                                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-950 border border-emerald-300/80 rounded-full text-xs font-black shadow-2xs shrink-0"
                                      title="Số câu hỏi đã hoàn thành / Tổng số câu"
                                    >
                                      <span>🎓</span>
                                      <span>{st.learned_questions || 0}/{st.total_questions || 0} câu</span>
                                    </div>
                                    <div 
                                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/15 text-indigo-950 border border-indigo-300/80 rounded-full text-xs font-black shadow-2xs shrink-0"
                                      title="Ngày dự kiến hoàn thành lộ trình bộ đề"
                                    >
                                      <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span>Dự kiến: {st.estimated_completion_date || '—'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Mascot Motivation Text */}
                                <div className="flex flex-col gap-0.5 mt-1">
                                  <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                                    {mascotLine1}
                                  </h4>
                                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                                    {mascotLine2}
                                  </p>
                                </div>
                              </div>

                              {/* Right Column: Mascot Character */}
                              <div className="w-[38%] sm:w-[32%] max-w-[200px] absolute right-2 bottom-0 top-0 flex items-end justify-center pointer-events-none z-10">
                                <motion.img
                                  key={mascotImg}
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                  src={mascotImg}
                                  alt="QuizMind Mascot"
                                  className="h-[95%] max-h-[190px] w-auto max-w-none object-contain object-bottom drop-shadow-xl translate-y-1"
                                />
                              </div>
                            </div>

                            {/* PIPELINE STEPS LIST & CTA */}
                            <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex flex-col gap-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                  <span>🗺️</span>
                                  <span>Các bước hôm nay</span>
                                </span>
                                <span className="text-xs font-bold text-slate-400">
                                  Bước {(st.current_step_index ?? 0) + 1}/{pipeline.length}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {pipeline.map((step: any, sIdx: number) => {
                                  const isCurrent = sIdx === currentStepIdx && !isDone
                                  const stepDone = step.done
                                  return (
                                    <div
                                      key={step.id || sIdx}
                                      className={cn(
                                        "p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 transition-all",
                                        stepDone
                                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                          : isCurrent
                                            ? "bg-indigo-50 text-indigo-800 border-indigo-300 ring-2 ring-indigo-500/20 animate-pulse"
                                            : "bg-slate-50 text-slate-400 border-slate-200"
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span>{stepDone ? '✓' : `${sIdx + 1}.`}</span>
                                        <span className="truncate">{step.label}</span>
                                      </div>
                                      {stepDone && <span className="text-[10px] font-black text-emerald-600 shrink-0">Xong</span>}
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Big Continue CTA Button */}
                              <button
                                onClick={() => navigate(st.next_action_url || `/quiz/${item.quiz_id || item.deck_id}/play?mode=roadmap`)}
                                className={cn(
                                  "w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98",
                                  isDone
                                    ? "bg-slate-900 hover:bg-slate-800 text-white"
                                    : "bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 hover:from-indigo-700 hover:to-rose-600 text-white shadow-indigo-200"
                                )}
                              >
                                <Play className="w-4 h-4 fill-white" />
                                <span>{st.next_action_label || 'Tiếp Tục Lộ Trình 🚀'}</span>
                              </button>
                            </div>

                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 2. DAILY COMPARISON CHART */}
                <DailyComparisonChart 
                  data={dailyComparisonData?.days} 
                  allTimeAvg={dailyComparisonData?.all_time_avg} 
                  isLoading={isDailyCompLoading} 
                />

                {/* 3. ACHIEVEMENTS & BADGES */}
                {Array.isArray(badgesData) && badgesData.length > 0 && (
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-slate-900">Huy Hiệu Thành Tích 🏆</h3>
                        <p className="text-xs text-slate-400 font-medium">Hoàn thành thử thách để mở khóa huy hiệu</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {badgesData.map(badge => (
                        <div 
                          key={badge.id} 
                          className={cn(
                            "p-3.5 rounded-2xl border flex items-center gap-3 transition-all",
                            badge.percentage >= 100 
                              ? "bg-amber-50/50 border-amber-200 shadow-2xs" 
                              : "bg-slate-50/50 border-slate-200/60 opacity-80"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                            badge.percentage >= 100 ? "bg-amber-500 text-white shadow-xs shadow-amber-200" : "bg-slate-200 text-slate-400"
                          )}>
                            {badge.percentage >= 100 ? '🏅' : '🔒'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-slate-900 truncate">{badge.name}</h4>
                              <span className="text-[10px] font-black text-amber-600">{badge.percentage || 0}%</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{badge.description}</p>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                                style={{ width: `${Math.min(100, badge.percentage || 0)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* MOBILE: BỘ ĐỀ TAB */}
            <div className={cn("space-y-4 lg:hidden", mobileTab !== 'decks' && "hidden")}>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900">Khám Phá Bộ Đề 📚</h2>
                <Link to="/library" className="text-xs font-bold text-indigo-600 hover:underline">Vào Thư Viện</Link>
              </div>
              <p className="text-xs text-slate-500">Tìm kiếm và luyện tập các bộ đề trắc nghiệm đa dạng chủ đề.</p>
              <Link
                to="/library"
                className="block p-6 rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md text-center space-y-2"
              >
                <BookOpen className="w-8 h-8 mx-auto" />
                <h3 className="text-base font-black">Khám Phá Tất Cả Bộ Đề</h3>
                <p className="text-xs text-indigo-100">Chọn đề thi JLPT, IT, Tiếng Anh và bắt đầu học ngay!</p>
              </Link>
            </div>

            {/* MOBILE: THỐNG KÊ TAB */}
            <div className={cn("space-y-5 lg:hidden", mobileTab !== 'stats' && "hidden")}>
              <MiniHeatmap data={heatmapData} />
              <DailyComparisonChart 
                data={dailyComparisonData?.days} 
                allTimeAvg={dailyComparisonData?.all_time_avg} 
                isLoading={isDailyCompLoading} 
              />
            </div>

            {/* MOBILE: XẾP HẠNG TAB */}
            <div className={cn("space-y-4 lg:hidden", (mobileTab !== 'rank' || !lbData) && "hidden")}>
              {lbData && (
                <LeaderboardWidget 
                  data={lbData} 
                  activeFilter={lbFilter} 
                  onFilterChange={setLbFilter} 
                />
              )}
            </div>

          </div>

        </div>
      </div>

    </div>
  )
}
