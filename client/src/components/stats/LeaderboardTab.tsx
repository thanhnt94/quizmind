import React from 'react'
import { Trophy, Crown, Zap, Flame, Target, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type LeaderboardCategory = 'xp' | 'streak' | 'questions' | 'time'
export type LeaderboardTimeFilter = 'today' | 'week' | 'month' | 'all_time'

export interface LeaderboardUser {
  rank: number
  user_id: number
  username: string
  full_name: string
  value: number
  level: number
  active_status?: 'online' | 'away' | 'offline'
  active_text?: string
}

export interface LeaderboardCategoryData {
  list: LeaderboardUser[]
  user_rank: number
  user_value: number
}

export interface LeaderboardResponse {
  xp?: LeaderboardCategoryData
  streak?: LeaderboardCategoryData
  questions?: LeaderboardCategoryData
  time?: LeaderboardCategoryData
}

export function formatStudyTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const totalMinutes = Math.floor(seconds / 60)
  if (totalMinutes < 60) {
    return totalMinutes === 0 ? `${seconds}s` : `${totalMinutes}m`
  }
  const hours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}m`
}

interface LeaderboardTabProps {
  data: LeaderboardResponse | undefined
  isLoading: boolean
  activeCategory: LeaderboardCategory
  onSelectCategory: (category: LeaderboardCategory) => void
  timeFilter: LeaderboardTimeFilter
  onSelectTimeFilter: (filter: LeaderboardTimeFilter) => void
}

export default function LeaderboardTab({
  data,
  isLoading,
  activeCategory,
  onSelectCategory,
  timeFilter,
  onSelectTimeFilter
}: LeaderboardTabProps) {
  const currentLeaderboard = data?.[activeCategory] || { list: [], user_rank: -1, user_value: 0 }
  const topThree = currentLeaderboard.list.slice(0, 3)
  const remainingUsers = currentLeaderboard.list.slice(3)

  const categoryLabels: Record<LeaderboardCategory, { label: string, icon: any, unit: string, sub: string, activeColor: string }> = {
    xp: { label: 'XP', icon: Zap, unit: 'XP', sub: 'Total experience', activeColor: 'text-indigo-600' },
    streak: { label: 'Streak', icon: Flame, unit: 'days', sub: 'Daily study streak', activeColor: 'text-violet-600' },
    questions: { label: 'Questions', icon: Target, unit: 'questions', sub: 'Questions answered', activeColor: 'text-purple-600' },
    time: { label: 'Time', icon: Clock, unit: '', sub: 'Study time', activeColor: 'text-emerald-500' },
  }

  return (
    <div className="space-y-2 text-left w-full mx-auto flex flex-col h-full min-h-0 overflow-hidden">
      {/* 🌟 Your Rank Banner (Compact Luxury Glass) */}
      {currentLeaderboard.user_rank > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl px-3.5 sm:px-4 py-2 text-white border border-indigo-900/60 shadow-md flex items-center justify-between gap-3 w-full shrink-0 select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-2xs">
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wider">Your Position:</span>
              <span className="text-sm sm:text-base font-black text-indigo-400 leading-none">#{currentLeaderboard.user_rank}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs sm:text-sm font-black text-indigo-300 tracking-tight">
              {activeCategory === 'time'
                ? formatStudyTime(currentLeaderboard.user_value)
                : `${currentLeaderboard.user_value.toLocaleString()} ${categoryLabels[activeCategory].unit}`}
            </span>
            <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-400 block -mt-0.5">
              {categoryLabels[activeCategory].sub}
            </span>
          </div>
        </motion.div>
      )}

      {/* 🏆 Full-Width Unified Leaderboard Card */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/80 p-3 sm:p-4 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Integrated Category & Time Filters Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2.5 border-b border-slate-100 shrink-0">
          {/* Category Tabs */}
          <div className="grid grid-flow-col auto-cols-fr w-full sm:w-auto bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/60 shadow-2xs gap-0.5">
            {(['xp', 'streak', 'questions', 'time'] as const).map((cat) => {
              const isActive = activeCategory === cat
              const catConfig = categoryLabels[cat]
              const Icon = catConfig.icon
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onSelectCategory(cat)}
                  className={cn(
                    "relative flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-xs font-bold transition-all select-none cursor-pointer",
                    isActive ? "text-slate-900 font-black" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeLeadCatPill"
                      className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <Icon className={cn("w-3.5 h-3.5 relative z-10 shrink-0", isActive ? catConfig.activeColor : "text-slate-400")} />
                  <span className="relative z-10 text-[11px] sm:text-xs truncate">{catConfig.label}</span>
                </button>
              )
            })}
          </div>

          {/* Timeframe Tabs */}
          <div className="grid grid-flow-col auto-cols-fr w-full sm:w-auto bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/60 shadow-2xs gap-0.5">
            {(['all_time', 'month', 'week', 'today'] as const).map((tf) => {
              const isActive = timeFilter === tf
              const tfLabels: Record<string, string> = {
                all_time: 'All Time',
                month: 'Month',
                week: 'Week',
                today: 'Today'
              }
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onSelectTimeFilter(tf)}
                  className={cn(
                    "relative flex items-center justify-center py-1 px-2.5 rounded-lg text-[10.5px] sm:text-xs font-bold transition-all select-none cursor-pointer",
                    isActive ? "text-indigo-600 font-black" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeLeadTimePill"
                      className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10 truncate">{tfLabels[tf]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2.5 my-auto">
            <Zap className="w-7 h-7 text-indigo-600 animate-pulse" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Loading leaderboard data...
            </span>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length > 0 && (
              <div className="w-full grid grid-cols-3 gap-2 sm:gap-4 items-end pt-3 pb-2 px-1 sm:px-4 shrink-0 border-b border-slate-100/80">
                {(() => {
                  const podiums = [
                    {
                      item: topThree[1],
                      pos: 2,
                      height: 'h-13 sm:h-16',
                      bg: 'from-slate-200/60 via-slate-100/40 to-white/40 border-slate-200/80',
                      text: 'text-slate-700',
                      ring: 'ring-2 ring-slate-300 border-slate-200',
                      badgeBg: 'bg-gradient-to-tr from-slate-400 to-slate-500 text-white',
                      crown: false
                    },
                    {
                      item: topThree[0],
                      pos: 1,
                      height: 'h-18 sm:h-22',
                      bg: 'from-indigo-100/80 via-violet-50/60 to-white border-indigo-200/90',
                      text: 'text-indigo-950',
                      ring: 'ring-2 ring-indigo-500 border-indigo-300',
                      badgeBg: 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white',
                      crown: true
                    },
                    {
                      item: topThree[2],
                      pos: 3,
                      height: 'h-10 sm:h-13',
                      bg: 'from-purple-100/60 via-purple-50/40 to-white border-purple-200/80',
                      text: 'text-purple-950',
                      ring: 'ring-2 ring-purple-300 border-purple-200',
                      badgeBg: 'bg-gradient-to-tr from-purple-500 to-indigo-500 text-white',
                      crown: false
                    }
                  ].filter(p => p.item)

                  return podiums.map((pod) => {
                    const user = pod.item
                    const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                    const isCurrentUser = user.rank === currentLeaderboard.user_rank

                    return (
                      <div key={user.user_id} className="w-full flex flex-col items-center text-center">
                        <div className="relative mb-1.5">
                          {pod.crown && (
                            <Crown className="w-5 h-5 text-amber-400 absolute -top-4 sm:-top-4.5 left-1/2 -translate-x-1/2 drop-shadow-sm animate-pulse" />
                          )}
                          <div className={cn(
                            "rounded-full border flex items-center justify-center font-black bg-white shadow-xs relative transition-transform",
                            pod.pos === 1 ? "w-11 h-11 sm:w-14 sm:h-14 text-sm sm:text-base" : "w-9 h-9 sm:w-11 sm:h-11 text-xs sm:text-sm",
                            pod.ring,
                            isCurrentUser && "ring-offset-2 ring-offset-indigo-100"
                          )}>
                            {initial}
                            {/* Rank Badge */}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full border-2 border-white flex items-center justify-center text-[8.5px] sm:text-[9.5px] font-black shadow-xs",
                              pod.badgeBg
                            )}>
                              {pod.pos}
                            </div>
                          </div>
                        </div>

                        <div className="text-center w-full px-0.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[11px] sm:text-xs font-black text-slate-900 truncate max-w-[85px] sm:max-w-[120px]">
                              {user.full_name || user.username}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[8px] font-black rounded-full leading-none shrink-0 border border-indigo-200/70">You</span>
                            )}
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <span className="text-[8px] sm:text-[8.5px] font-bold text-slate-400 uppercase">
                              Lv.{user.level || 1}
                            </span>
                            <span className="text-slate-300 text-[7px]">•</span>
                            <span className={cn(
                              "text-[8px] sm:text-[8.5px] font-bold",
                              user.active_status === 'online' ? "text-emerald-600" : "text-slate-400"
                            )}>
                              {user.active_status === 'online' ? 'Online' : user.active_text || 'Offline'}
                            </span>
                          </div>
                        </div>

                        {/* Pedestal Block */}
                        <div className={cn(
                          "w-full mt-1.5 rounded-t-2xl flex flex-col justify-center items-center py-1 bg-gradient-to-t border-t border-x shadow-2xs",
                          pod.height, pod.bg
                        )}>
                          <span className={cn("text-[10px] sm:text-xs font-black tracking-tight leading-none", pod.text)}>
                            {activeCategory === 'time' ? formatStudyTime(user.value) : user.value.toLocaleString()}
                          </span>
                          <span className="text-[7px] sm:text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 leading-none">
                            {categoryLabels[activeCategory].unit}
                          </span>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}

            {/* List Top 4 - 50 */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5 w-full space-y-1.5 pt-2">
              {remainingUsers.length === 0 && topThree.length === 0 ? (
                <div className="py-10 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                  No leaderboard data for this period.
                </div>
              ) : remainingUsers.length === 0 ? (
                <div className="py-3 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  All top members displayed above
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-1.5">
                  {remainingUsers.map((user) => {
                    const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                    const isCurrentUser = user.rank === currentLeaderboard.user_rank

                    return (
                      <div
                        key={user.user_id}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 sm:p-2.5 rounded-2xl border transition-all text-left",
                          isCurrentUser
                            ? "bg-indigo-50/80 border-indigo-200/90 shadow-xs ring-1 ring-indigo-300/60"
                            : "bg-slate-50/70 border-slate-100/90 hover:border-slate-200 hover:bg-slate-100/50"
                        )}
                      >
                        <div className="w-5 text-[11px] font-black text-slate-400 text-center shrink-0">
                          #{user.rank}
                        </div>
                        <div className="relative shrink-0">
                          <div className={cn(
                            "w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black shadow-2xs",
                            isCurrentUser ? "bg-indigo-100/80 border-indigo-300 text-indigo-900" : "bg-white border-slate-200 text-slate-700"
                          )}>
                            {initial}
                          </div>
                          {/* Active Status Badge Dot */}
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-xs",
                              user.active_status === 'online'
                                ? "bg-emerald-500"
                                : user.active_status === 'away'
                                  ? "bg-amber-400"
                                  : "bg-slate-300"
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-black text-slate-900 truncate">
                              {user.full_name || user.username}
                            </h4>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.2 bg-indigo-200/80 text-indigo-900 text-[8px] font-black rounded-full leading-none">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                              Lv.{user.level || 1}
                            </span>
                            <span className="text-slate-300 text-[7px]">•</span>
                            <span className={cn(
                              "text-[8px] font-semibold leading-none",
                              user.active_status === 'online'
                                ? "text-emerald-600 font-bold"
                                : user.active_status === 'away'
                                  ? "text-amber-600 font-bold"
                                  : "text-slate-400 font-medium"
                            )}>
                              {user.active_status === 'online' ? 'Active' : user.active_text || 'Offline'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs sm:text-sm font-black text-indigo-600 tracking-tight">
                            {activeCategory === 'time'
                              ? formatStudyTime(user.value)
                              : `${user.value.toLocaleString()} ${categoryLabels[activeCategory].unit}`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
