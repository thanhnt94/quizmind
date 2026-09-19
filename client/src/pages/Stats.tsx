import React, { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, User, Globe, TrendingUp, Zap, BrainCircuit } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'
import LeaderboardTab from '@/components/stats/LeaderboardTab'
import type { LeaderboardCategory, LeaderboardTimeFilter, LeaderboardResponse } from '@/components/stats/LeaderboardTab'
import PersonalStatsTab from '@/components/stats/PersonalStatsTab'
import GlobalStatsTab from '@/components/stats/GlobalStatsTab'
import type { HeatmapDay } from '@/components/stats/HeatmapWidget'

export type StatsMainTab = 'leaderboard' | 'personal' | 'global'

export default function Stats() {
  const [activeTab, setActiveTab] = useState<StatsMainTab>('leaderboard')
  
  // Leaderboard filters state
  const [leaderboardCategory, setLeaderboardCategory] = useState<LeaderboardCategory>('xp')
  const [leaderboardTimeFilter, setLeaderboardTimeFilter] = useState<LeaderboardTimeFilter>('all_time')

  // Touch swipe handling for horizontal thumb navigation
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    const diffY = touchStartY.current - e.changedTouches[0].clientY
    
    // Swipe left/right with minimum distance and horizontal dominance
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      const tabOrder: StatsMainTab[] = ['leaderboard', 'personal', 'global']
      const currentIndex = tabOrder.indexOf(activeTab)
      if (diffX > 0 && currentIndex < tabOrder.length - 1) {
        // Swiped left -> Next tab
        if (navigator.vibrate) navigator.vibrate(8)
        setActiveTab(tabOrder[currentIndex + 1])
      } else if (diffX < 0 && currentIndex > 0) {
        // Swiped right -> Previous tab
        if (navigator.vibrate) navigator.vibrate(8)
        setActiveTab(tabOrder[currentIndex - 1])
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // 1. Detailed stats (Personal + Global summary)
  const { data: detailedStatsData, isLoading: isDetailedLoading } = useQuery({
    queryKey: ['detailed-stats'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/detailed')
      return res.data
    },
    staleTime: 30 * 1000
  })

  // 2. Leaderboard data
  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery<LeaderboardResponse>({
    queryKey: ['stats-leaderboard', leaderboardTimeFilter],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/leaderboard', {
        params: { time_filter: leaderboardTimeFilter }
      })
      return res.data
    },
    staleTime: 30 * 1000
  })

  // 3. Daily comparison data
  const { data: dailyComparisonRaw, isLoading: isDailyComparisonLoading } = useQuery({
    queryKey: ['dailyComparison'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/daily-comparison')
      return res.data
    },
    staleTime: 30 * 1000
  })

  // 4. Heatmap data
  const { data: heatmapData } = useQuery<HeatmapDay[]>({
    queryKey: ['stats-heatmap'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/heatmap')
      return res.data
    },
    staleTime: 60 * 1000
  })

  // 5. Weekly report
  const { data: weeklyReport } = useQuery({
    queryKey: ['stats-weekly-report'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/weekly-report')
      return res.data
    },
    staleTime: 60 * 1000
  })

  // 6. Speed vs Accuracy
  const { data: speedAccuracyStats } = useQuery({
    queryKey: ['stats-speed-accuracy'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/speed-accuracy')
      return res.data
    },
    staleTime: 60 * 1000
  })

  if (isDetailedLoading) {
    return (
      <div className="min-h-[80vh] bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-white rounded-3xl border border-slate-100 flex items-center justify-center shadow-xl shadow-indigo-100 mb-4">
          <Zap className="w-8 h-8 text-indigo-600 animate-pulse" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Syncing stats data...
        </p>
      </div>
    )
  }

  if (!detailedStatsData || (detailedStatsData as any).error) {
    return (
      <div className="min-h-[80vh] bg-[#F8FAFC] flex flex-col items-center justify-center p-8 text-center">
        <BrainCircuit className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">
          Unable to load stats
        </h3>
        <p className="text-[10px] font-medium text-slate-400 mt-2">
          {(detailedStatsData as any)?.error || "Please refresh the page."}
        </p>
      </div>
    )
  }

  const { personal, global } = detailedStatsData

  const tabs: Array<{ id: StatsMainTab, label: string, shortLabel: string, icon: any, color: string, badgeBg: string }> = [
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      shortLabel: 'Leaderboard',
      icon: Trophy,
      color: 'text-indigo-600',
      badgeBg: 'bg-indigo-50'
    },
    {
      id: 'personal',
      label: 'Personal Stats',
      shortLabel: 'Personal',
      icon: User,
      color: 'text-violet-600',
      badgeBg: 'bg-violet-50'
    },
    {
      id: 'global',
      label: 'Global Stats',
      shortLabel: 'Global',
      icon: Globe,
      color: 'text-emerald-600',
      badgeBg: 'bg-emerald-50'
    }
  ]

  return (
    <div className="fixed inset-0 top-0 bottom-[calc(56px+env(safe-area-inset-bottom))] md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] overflow-hidden text-left select-none">
      {/* ═══════════ TOP UNIFIED HEADER ═══════════ */}
      <div className="shrink-0 z-30 bg-white/95 md:backdrop-blur-md border-b border-slate-200/80 shadow-2xs md:shadow-none px-3.5 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-2.5">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 text-left">
          {/* Left: Branding with Indigo/Violet Squircle & Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shadow-2xs shrink-0">
              <TrendingUp className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none truncate">
                  Stats & Leaderboard
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-[10px] font-black shrink-0 leading-none">
                  Rankings
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1 leading-none truncate">
                <span>Track personal progress & global rankings</span>
                <span className="text-indigo-500">✨</span>
              </p>
            </div>
          </div>

          {/* Unified Responsive Segmented Tab Switcher */}
          <div className="w-full sm:w-auto">
            <div className="grid grid-cols-3 sm:flex sm:items-center p-1 rounded-2xl bg-slate-100/90 border border-slate-200/70 shadow-inner gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(8)
                      setActiveTab(tab.id)
                    }}
                    className={cn(
                      "relative py-1.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 min-w-0",
                      isActive
                        ? "text-slate-900 font-black shadow-xs bg-white"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Icon className={cn(
                      "w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors",
                      isActive ? "text-indigo-600 stroke-[2.4]" : "text-slate-400"
                    )} />
                    <span className="truncate text-[11px] sm:text-xs leading-tight">{tab.shortLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ TAB CONTENT AREA WITH HORIZONTAL TOUCH SWIPE ═══════════ */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 min-h-0 flex flex-col overflow-hidden px-3.5 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-2.5"
      >
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto w-full flex-1 min-h-0 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'leaderboard' && (
              <motion.div
                key="tab-leaderboard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="h-full flex flex-col min-h-0"
              >
                <LeaderboardTab
                  data={leaderboardData}
                  isLoading={isLeaderboardLoading}
                  activeCategory={leaderboardCategory}
                  onSelectCategory={setLeaderboardCategory}
                  timeFilter={leaderboardTimeFilter}
                  onSelectTimeFilter={setLeaderboardTimeFilter}
                />
              </motion.div>
            )}

            {activeTab === 'personal' && (
              <motion.div
                key="tab-personal"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-y-auto custom-scrollbar space-y-4 pb-6"
              >
                <PersonalStatsTab
                  personalStats={personal}
                  heatmapData={heatmapData}
                  weeklyReport={weeklyReport}
                  speedAccuracyStats={speedAccuracyStats}
                  dailyComparisonData={dailyComparisonRaw?.days}
                  dailyComparisonAvg={dailyComparisonRaw?.all_time_avg}
                  isDailyComparisonLoading={isDailyComparisonLoading}
                />
              </motion.div>
            )}

            {activeTab === 'global' && (
              <motion.div
                key="tab-global"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="h-full overflow-y-auto custom-scrollbar space-y-4 pb-6"
              >
                <GlobalStatsTab
                  globalStats={global}
                  isLoading={isDetailedLoading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
