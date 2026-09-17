import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Trophy, ChevronRight, LayoutGrid, Users, Zap, Flame, BrainCircuit, X, Play, Crown, 
  Medal, Star, CheckCircle2, Circle, Swords, Settings, Target, RefreshCw, User, 
  BookOpen, Sparkles, TrendingUp, Clock, Layers, Compass, ArrowRight, FileText, 
  RotateCcw, Search, Plus, Calendar, Activity, ChevronLeft 
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import DailyComparisonChart from '@/components/DailyComparisonChart'
import { TelegramRoadmapReminderToggle } from '@/components/TelegramRoadmapReminderToggle'
import { DashboardDailyDrawer } from '@/components/dashboard/DashboardDailyDrawer'

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
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Study History</span>
        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
          {totalThisMonth} questions this month
        </span>
      </div>
      <div className="flex justify-center gap-[3px] py-2 overflow-x-auto scrollbar-none">
        {cells.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell, di) => (
              <div
                key={di}
                title={`${cell.date}: ${cell.count} questions`}
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
        <span className="text-[8px] font-bold text-slate-400">Less</span>
        {['bg-slate-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-600', 'bg-indigo-800'].map((c, i) => (
          <div key={i} className={cn('w-2.5 h-2.5 rounded-[2px]', c)} />
        ))}
        <span className="text-[8px] font-bold text-slate-400">More</span>
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
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">🏆 Leaderboard</span>
          
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
              Time
            </button>
          </div>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-1.5 self-start">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Week' },
            { id: 'all_time', label: 'All Time' }
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
        {currentList.length === 0 && (
          <div className="py-4 text-center text-xs text-slate-400 font-medium">
            No rankings yet for this period.
          </div>
        )}
      </div>
    </div>
  )
}

const CHEER_QUOTES = [
  "Keep it up! You're on fire with this streak! 🔥",
  "Every question mastered today is a major leap forward! 🚀",
  "With dedication like this, you'll ace every exam! 🌟",
  "I'm here cheering you on every single day! 💪",
  "Outstanding work! Let's conquer all today's steps! 🎉",
  "Your brain is absorbing knowledge at lightning speed! 🧠⚡"
]

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user: authUser, userSettings, updateUserSettings } = useAppStore()
  
  // 2-Tab Navigation State: 'roadmap' vs 'quizzes'
  const [activeHomeTab, setActiveHomeTab] = useState<'roadmap' | 'quizzes'>('roadmap')
  const [isDailyDrawerOpen, setIsDailyDrawerOpen] = useState(false)
  const [lbFilter, setLbFilter] = useState('today')
  const [remainingTime, setRemainingTime] = useState('')
  const [activeRoadmapIdx, setActiveRoadmapIdx] = useState(0)
  const [mascotCheer, setMascotCheer] = useState<string | null>(null)
  const [quizSearch, setQuizSearch] = useState('')

  const wheelCooldownRef = useRef(false)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  // Sync active tab from persisted user settings
  useEffect(() => {
    if (userSettings?.home_active_tab === 'roadmap' || userSettings?.home_active_tab === 'quizzes') {
      setActiveHomeTab(userSettings.home_active_tab)
    }
  }, [userSettings?.home_active_tab])

  // 1. Fetch Dashboard Stats & User Data
  const { data: dashData } = useQuery<DashboardData>({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      return res.data
    }
  })

  // 2. Fetch Active Roadmap Quizzes
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

  // Countdown timer to midnight UTC (UTC+0 directive)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const endOfUtcDay = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23, 59, 59, 999
      ))
      const diffMs = Math.max(0, endOfUtcDay.getTime() - now.getTime())
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
      setRemainingTime(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`)
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [])

  const roadmapQuizzes: any[] = Array.isArray(roadmapData?.decks) 
    ? roadmapData.decks 
    : (Array.isArray(roadmapData?.quizzes) ? roadmapData.quizzes : [])

  const allAvailableQuizzes = useMemo(() => {
    const my = Array.isArray(dashData?.my_quizzes) ? dashData.my_quizzes : []
    const disc = Array.isArray(dashData?.discover_quizzes) ? dashData.discover_quizzes : []
    const map = new Map<number, any>()
    my.forEach(q => map.set(q.id, q))
    disc.forEach(q => {
      if (!map.has(q.id)) map.set(q.id, q)
    })
    return Array.from(map.values())
  }, [dashData])

  const filteredQuizzes = useMemo(() => {
    if (!quizSearch.trim()) return allAvailableQuizzes
    const term = quizSearch.toLowerCase()
    return allAvailableQuizzes.filter(q => 
      (q.title && q.title.toLowerCase().includes(term)) ||
      (q.description && q.description.toLowerCase().includes(term))
    )
  }, [allAvailableQuizzes, quizSearch])

  const user = dashData?.user || authUser || { username: 'Learner', email: '', role: 'user' }
  const gamify = dashData?.gamify || { level: 1, xp: 0, streak: 0 }

  // Interactive Mascot cheer on tap
  const handleMascotTap = () => {
    if (navigator.vibrate) navigator.vibrate([15, 30, 15])
    const quote = CHEER_QUOTES[Math.floor(Math.random() * CHEER_QUOTES.length)]
    setMascotCheer(quote)
    setTimeout(() => {
      setMascotCheer(null)
    }, 4500)
  }

  // Switch Home Tab helper with haptic and backend sync
  const switchHomeTab = (tab: 'roadmap' | 'quizzes') => {
    if (activeHomeTab === tab) return
    setActiveHomeTab(tab)
    if (navigator.vibrate) navigator.vibrate(8)
    updateUserSettings({ home_active_tab: tab }).catch(console.error)
  }

  return (
    <div 
      className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-800 selection:bg-indigo-100 select-none font-sans"
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0].clientX
        touchStartYRef.current = e.touches[0].clientY
      }}
      onTouchEnd={(e) => {
        const startX = touchStartXRef.current
        const startY = touchStartYRef.current
        if (startX === null || startY === null) return
        const endX = e.changedTouches[0].clientX
        const endY = e.changedTouches[0].clientY
        const diffX = endX - startX
        const diffY = endY - startY

        // Pull to refresh detection
        if (diffY > 120 && Math.abs(diffX) < 50) {
          if (navigator.vibrate) navigator.vibrate(20)
          queryClient.invalidateQueries()
          return
        }

        // Horizontal Swipe detection (Swipe left: Roadmap -> Quizzes, Swipe right: Quizzes -> Roadmap)
        if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
          if (diffX < -40 && activeHomeTab === 'roadmap') {
            switchHomeTab('quizzes')
          } else if (diffX > 40 && activeHomeTab === 'quizzes') {
            switchHomeTab('roadmap')
          }
        }
        touchStartXRef.current = null
        touchStartYRef.current = null
      }}
    >
      
      {/* ========================================================================= */}
      {/* MOBILE TOP HEADER & 2-TAB SEGMENTED BAR                                  */}
      {/* ========================================================================= */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-orange-500 flex items-center justify-center text-white font-black text-sm shadow-xs">
              ⚡
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-none">QuizMind</h1>
              <span className="text-[9px] font-bold text-slate-400">Multiple Choice Mastery</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Today Activity Trigger Pill */}
            <button
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(8)
                setIsDailyDrawerOpen(true)
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-600 rounded-full text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Today's Activity Report"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600 stroke-[2.4]" />
              <span className="text-[11px]">Today</span>
            </button>

            {/* Streak Pill (Also triggers Daily Activity Drawer) */}
            <button
              type="button"
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(8)
                setIsDailyDrawerOpen(true)
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Study Streak"
            >
              <span>🔥</span>
              <span>{gamify.streak || 0}d</span>
            </button>

            {/* User Level */}
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              {gamify.level || 1}
            </div>
          </div>
        </div>

        {/* 2 Tabs: Roadmap vs Quizzes */}
        <div className="grid grid-cols-2 border-t border-slate-100 text-center h-11">
          {/* Tab 1: Roadmap */}
          <button
            type="button"
            onClick={() => switchHomeTab('roadmap')}
            className={cn(
              "relative h-full flex items-center justify-center gap-1.5 text-xs font-black tracking-tight transition-colors cursor-pointer select-none",
              activeHomeTab === 'roadmap' ? "text-indigo-600" : "text-slate-400 hover:text-slate-700"
            )}
          >
            <Layers className={cn("w-3.5 h-3.5", activeHomeTab === 'roadmap' ? "text-indigo-600" : "text-slate-400")} />
            <span>Roadmap</span>
            {roadmapQuizzes.length > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums",
                activeHomeTab === 'roadmap' ? "bg-indigo-50 text-indigo-600 border border-indigo-200/60" : "bg-slate-100 text-slate-400"
              )}>
                {roadmapQuizzes.length}
              </span>
            )}
            {activeHomeTab === 'roadmap' && (
              <motion.div
                layoutId="homeTabUnderlineMobile"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            )}
          </button>

          {/* Tab 2: Quizzes */}
          <button
            type="button"
            onClick={() => switchHomeTab('quizzes')}
            className={cn(
              "relative h-full flex items-center justify-center gap-1.5 text-xs font-black tracking-tight transition-colors cursor-pointer select-none",
              activeHomeTab === 'quizzes' ? "text-indigo-600" : "text-slate-400 hover:text-slate-700"
            )}
          >
            <BookOpen className={cn("w-3.5 h-3.5", activeHomeTab === 'quizzes' ? "text-indigo-600" : "text-slate-400")} />
            <span>Quizzes</span>
            {allAvailableQuizzes.length > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums",
                activeHomeTab === 'quizzes' ? "bg-indigo-50 text-indigo-600 border border-indigo-200/60" : "bg-slate-100 text-slate-400"
              )}>
                {allAvailableQuizzes.length}
              </span>
            )}
            {activeHomeTab === 'quizzes' && (
              <motion.div
                layoutId="homeTabUnderlineMobile"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
                transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP SPLIT VIEW & MAIN CONTENT                                         */}
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
                  <p className="text-xs text-slate-400 font-medium truncate">{user.email || 'QuizMind Learner'}</p>
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
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-100 block leading-none">Study Streak</span>
                    <span className="text-lg font-black leading-tight">{gamify.streak || 0} Days Active</span>
                  </div>
                </div>
                <span className="text-xl">🔥</span>
              </div>

              {/* Today Activity Report Button */}
              <button
                type="button"
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(8)
                  setIsDailyDrawerOpen(true)
                }}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/40 hover:from-indigo-100/80 hover:to-purple-100/50 border border-indigo-200/70 rounded-2xl transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Activity className="w-4 h-4 stroke-[2.4]" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-black text-slate-800 block leading-tight">Today's Activity</span>
                    <span className="text-[9.5px] font-bold text-indigo-600">Daily study & accuracy pulse</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

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

            {/* DESKTOP 2-TAB SEGMENTED BAR */}
            <div className="hidden md:flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => switchHomeTab('roadmap')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                    activeHomeTab === 'roadmap'
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Roadmap Pipeline ({roadmapQuizzes.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchHomeTab('quizzes')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                    activeHomeTab === 'quizzes'
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>All Quizzes ({allAvailableQuizzes.length})</span>
                </button>
              </div>

              <Link
                to="/library"
                className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 font-black text-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Explore Library</span>
              </Link>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* VIEW 1: ROADMAP TAB CONTENT                                        */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeHomeTab === 'roadmap' && (
              <div className="space-y-6">
                
                {/* 1. ROADMAP QUIZZES SECTION */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                          Active Roadmap ({roadmapQuizzes.length})
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">Daily scheduled question pipeline</p>
                      </div>
                    </div>
                    
                    <Link
                      to="/library"
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs flex items-center gap-1 active:scale-95 transition-all shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Quiz</span>
                    </Link>
                  </div>

                  {isRoadmapLoading ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-sm space-y-3">
                      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-400">Loading your roadmap...</p>
                    </div>
                  ) : roadmapQuizzes.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/90 shadow-sm space-y-4">
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto text-2xl shadow-inner">
                        🗺️
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-slate-900">No Active Roadmaps Yet</h3>
                        <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                          Select a quiz from the library and enable Roadmap to set daily study targets, track missed questions, and maintain your flame streak!
                        </p>
                      </div>
                      <Link
                        to="/library"
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-200 transition-all inline-block active:scale-95"
                      >
                        Explore Library Quizzes 📚
                      </Link>
                    </div>
                  ) : (() => {
                    const safeIndex = Math.min(activeRoadmapIdx, Math.max(0, roadmapQuizzes.length - 1))
                    const item = roadmapQuizzes[safeIndex]
                    if (!item) return null

                    const st = item.status || {}
                    const isDone = Boolean(st.all_done)
                    const pipeline = st.pipeline || []
                    const deckStreak = st.streak || 0
                    const currentStepIdx = st.current_step_index ?? 0

                    // Mascot calculation
                    let mascotImg = `${import.meta.env.BASE_URL}mascot/sleepy.png`
                    let mascotLine1 = 'Ready for today?'
                    let mascotLine2 = "Let's conquer today's questions! 🚀"

                    if (isDone) {
                      mascotImg = `${import.meta.env.BASE_URL}mascot/celebrating.png`
                      mascotLine1 = 'Outstanding!'
                      mascotLine2 = 'Completed today’s roadmap! 🎉'
                    } else if (st.stage_1_done) {
                      mascotImg = `${import.meta.env.BASE_URL}mascot/excited.png`
                      mascotLine1 = 'On Fire!'
                      mascotLine2 = 'Keep up the blazing momentum 🔥'
                    } else if ((st.new_learned_today || 0) > 0 || (st.review_completed_today || 0) > 0) {
                      mascotImg = `${import.meta.env.BASE_URL}mascot/excited.png`
                      mascotLine1 = 'Great start!'
                      mascotLine2 = 'Finish all remaining steps today 💪'
                    }

                    const handleRoadmapWheel = (e: React.WheelEvent) => {
                      if (roadmapQuizzes.length <= 1) return
                      if (wheelCooldownRef.current) return
                      if (Math.abs(e.deltaY) > 20 || Math.abs(e.deltaX) > 20) {
                        wheelCooldownRef.current = true
                        if (e.deltaY > 0 || e.deltaX > 0) {
                          setActiveRoadmapIdx(prev => (prev + 1) % roadmapQuizzes.length)
                        } else {
                          setActiveRoadmapIdx(prev => (prev - 1 + roadmapQuizzes.length) % roadmapQuizzes.length)
                        }
                        setTimeout(() => {
                          wheelCooldownRef.current = false
                        }, 350)
                      }
                    }

                    return (
                      <div 
                        onWheel={handleRoadmapWheel}
                        className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md select-none"
                      >
                        {/* Subheader bar with Navigation & Telegram */}
                        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-extrabold text-slate-800">Roadmap Pipeline</span>
                            {roadmapQuizzes.length > 1 ? (
                              <div className="flex items-center gap-1 bg-white border border-slate-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveRoadmapIdx(prev => (prev - 1 + roadmapQuizzes.length) % roadmapQuizzes.length)
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 active:scale-90 font-black cursor-pointer"
                                  title="Previous Quiz"
                                >
                                  ‹
                                </button>
                                <span className="text-xs font-black text-indigo-600 px-1">
                                  {safeIndex + 1} / {roadmapQuizzes.length}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActiveRoadmapIdx(prev => (prev + 1) % roadmapQuizzes.length)
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 active:scale-90 font-black cursor-pointer"
                                  title="Next Quiz"
                                >
                                  ›
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">1 / 1</span>
                            )}
                            <TelegramRoadmapReminderToggle />
                          </div>

                          <div className="flex items-center gap-2">
                            {roadmapQuizzes.length > 1 && (
                              <div className="hidden sm:flex items-center gap-1 mr-1">
                                {roadmapQuizzes.map((_, dotIdx) => (
                                  <button
                                    key={dotIdx}
                                    onClick={() => setActiveRoadmapIdx(dotIdx)}
                                    className={cn(
                                      "h-1.5 rounded-full transition-all cursor-pointer",
                                      dotIdx === safeIndex ? "bg-indigo-600 w-4" : "bg-slate-300 hover:bg-slate-400 w-1.5"
                                    )}
                                    title={`Switch to quiz ${dotIdx + 1}`}
                                  />
                                ))}
                              </div>
                            )}
                            <Link
                              to={`/quiz/${item.quiz_id || item.deck_id}/roadmap`}
                              className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer shrink-0"
                            >
                              <span>Details</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>

                        {/* HERO MASCOT CARD WITH ANIMATION */}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={item.quiz_id || item.deck_id || safeIndex}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="flex flex-col"
                          >
                            <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-amber-100/50 relative overflow-hidden flex flex-row items-center justify-between min-h-[165px]">
                              
                              {/* Left Column */}
                              <div className="relative z-20 flex-1 max-w-[68%] sm:max-w-[72%] min-w-0 flex flex-col justify-center gap-2.5 py-1">
                                
                                {/* TOP BADGES: 3 DISTINCT CLEAN ROWS */}
                                <div className="flex flex-col gap-2">
                                  {/* ROW 1: Streak & UTC Countdown */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white rounded-full text-xs font-black shadow-xs shrink-0">
                                      <span>🔥</span>
                                      <span>{deckStreak} days streak</span>
                                    </div>
                                    {isDone ? (
                                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-950 border border-emerald-300/80 rounded-full text-xs font-black shadow-2xs shrink-0">
                                        <span>✓</span>
                                        <span>Done for today</span>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-900 border border-amber-300/80 rounded-full text-xs font-black shadow-2xs shrink-0">
                                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>{remainingTime} left</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* ROW 2: Quiz Title */}
                                  <div className="flex items-center max-w-full">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/80 border border-indigo-100/90 text-indigo-950 rounded-xl text-xs font-bold shadow-2xs max-w-full">
                                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span className="truncate max-w-[280px] sm:max-w-[400px] font-extrabold text-indigo-950">
                                        {item.title}
                                      </span>
                                    </div>
                                  </div>

                                  {/* ROW 3: Progress & Est Date */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div 
                                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-950 border border-emerald-300/80 rounded-full text-xs font-black shadow-2xs shrink-0"
                                      title="Learned questions / Total questions"
                                    >
                                      <span>🎓</span>
                                      <span>{st.learned_questions || 0}/{st.total_questions || 0} questions</span>
                                    </div>
                                    <div 
                                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/15 text-indigo-950 border border-indigo-300/80 rounded-full text-xs font-black shadow-2xs shrink-0"
                                      title="Estimated completion date"
                                    >
                                      <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span>Est: {st.estimated_completion_date || '—'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Mascot Motivation Text with Cheer Support */}
                                <div className="flex flex-col gap-0.5 mt-1">
                                  <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                                    {mascotCheer || mascotLine1}
                                  </h4>
                                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                                    {mascotCheer ? "QuizMind Mascot is rooting for you! ⭐" : mascotLine2}
                                  </p>
                                </div>
                              </div>

                              {/* Right Column: Mascot Character (Tap to cheer) */}
                              <div 
                                onClick={handleMascotTap}
                                className="w-[38%] sm:w-[32%] max-w-[200px] absolute right-2 bottom-0 top-0 flex items-end justify-center z-10 cursor-pointer group"
                                title="Tap mascot for encouragement!"
                              >
                                <motion.img
                                  key={mascotImg}
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  transition={{ duration: 0.3 }}
                                  src={mascotImg}
                                  alt="QuizMind Mascot"
                                  className="h-[95%] max-h-[190px] w-auto max-w-none object-contain object-bottom drop-shadow-xl translate-y-1 transition-transform"
                                />
                              </div>
                            </div>

                            {/* PIPELINE STEPS LIST & CTA */}
                            <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex flex-col gap-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                  <span>🗺️</span>
                                  <span>Today's Steps</span>
                                </span>
                                <span className="text-xs font-bold text-slate-400">
                                  Step {(st.current_step_index ?? 0) + 1}/{pipeline.length}
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
                                      {stepDone && <span className="text-[10px] font-black text-emerald-600 shrink-0">Done</span>}
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
                                <span>{st.next_action_label || 'Continue Roadmap 🚀'}</span>
                              </button>
                            </div>
                          </motion.div>
                        </AnimatePresence>

                      </div>
                    )
                  })()}
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
                        <h3 className="text-base font-black text-slate-900">Achievements & Badges 🏆</h3>
                        <p className="text-xs text-slate-400 font-medium">Complete study challenges to unlock badges</p>
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
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* VIEW 2: QUIZZES TAB CONTENT                                        */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeHomeTab === 'quizzes' && (
              <div className="space-y-5">
                
                {/* Search & Actions Bar */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={quizSearch}
                      onChange={(e) => setQuizSearch(e.target.value)}
                      placeholder="Search quizzes by title or topic..."
                      className="w-full h-9 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link
                      to="/quizzes"
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>All Quizzes</span>
                    </Link>
                    <Link
                      to="/manage/import"
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Import</span>
                    </Link>
                  </div>
                </div>

                {/* Quizzes Grid */}
                {filteredQuizzes.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/90 shadow-sm space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl">
                      🔍
                    </div>
                    <h3 className="text-sm font-black text-slate-800">No quizzes match your search</h3>
                    <p className="text-xs text-slate-400">Try searching for other keywords or explore the public library.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredQuizzes.map(quiz => (
                      <div
                        key={quiz.id}
                        className="bg-white border border-slate-200/90 hover:border-indigo-200 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-base shrink-0 group-hover:scale-105 transition-transform">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
                              {quiz.questions_count || 0} questions
                            </span>
                          </div>

                          <div>
                            <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                              {quiz.title}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium line-clamp-2 mt-1">
                              {quiz.description || "Practice multiple choice questions and track your accuracy."}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => navigate(`/quiz/${quiz.id}/play`)}
                            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Practice</span>
                          </button>
                          <button
                            onClick={() => navigate(`/quiz/${quiz.id}`)}
                            className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      </div>

      {/* ─── DAILY ACTIVITY DRAWER PORTAL ─────────────────────────────────────── */}
      <DashboardDailyDrawer 
        isOpen={isDailyDrawerOpen} 
        onClose={() => setIsDailyDrawerOpen(false)} 
        navigate={navigate}
        onSwitchTab={switchHomeTab}
      />

    </div>
  )
}
