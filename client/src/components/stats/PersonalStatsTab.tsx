import React, { useState, useMemo } from 'react'
import { Target, Activity, Clock, CheckCircle2, Flame, Award, Calendar, Layers, Timer, Zap, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import HeatmapWidget, { type HeatmapDay } from './HeatmapWidget'
import SpeedAccuracyWidget from './SpeedAccuracyWidget'
import DailyComparisonChart from '@/components/DailyComparisonChart'

export type PersonalPeriod = 'day' | 'week' | 'month' | 'year' | 'all'

interface PersonalStatsTabProps {
  personalStats: {
    daily_activity: Array<{ date: string, attempted: number, correct: number, accuracy: number, time_minutes: number }>
    category_performance: Array<{ category: string, total: number, correct: number, accuracy: number, avg_time: number }>
    hourly_distribution: Array<{ hour: string, count: number, average?: number }>
    recent_sessions: Array<{ title: string, score: number, total: number, date: string }>
    summary: { total_questions: number, total_correct: number, total_time_hours: number, global_accuracy: number }
  } | undefined
  heatmapData: HeatmapDay[] | undefined
  weeklyReport: any
  speedAccuracyStats: any
  dailyComparisonData: any
  dailyComparisonAvg: any
  isDailyComparisonLoading?: boolean
}

export default function PersonalStatsTab({
  personalStats,
  heatmapData,
  weeklyReport,
  speedAccuracyStats,
  dailyComparisonData,
  dailyComparisonAvg,
  isDailyComparisonLoading
}: PersonalStatsTabProps) {
  const [personalPeriod, setPersonalPeriod] = useState<PersonalPeriod>('week')
  const [activeChartTab, setActiveChartTab] = useState<'activity' | 'time' | 'hours'>('activity')

  // Filter daily activity based on chosen period
  const filteredDailyActivity = useMemo(() => {
    const dailyAct = personalStats?.daily_activity
    if (!dailyAct) return []
    if (personalPeriod === 'day') return dailyAct.slice(-1)
    if (personalPeriod === 'week') return dailyAct.slice(-7)
    if (personalPeriod === 'month') return dailyAct.slice(-30)
    if (personalPeriod === 'year') return dailyAct.slice(-365)
    return dailyAct
  }, [personalStats, personalPeriod])

  // Synchronized KPIs based on period
  const periodSummary = useMemo(() => {
    if (personalPeriod === 'all' && personalStats?.summary) {
      return {
        total_questions: personalStats.summary.total_questions || 0,
        total_correct: personalStats.summary.total_correct || 0,
        total_time_hours: (personalStats.summary.total_time_hours || 0).toFixed(1),
        total_time_minutes: Math.round((personalStats.summary.total_time_hours || 0) * 60),
        global_accuracy: personalStats.summary.global_accuracy || 0,
        best_day: weeklyReport?.best_day || 'N/A'
      }
    }

    if (!filteredDailyActivity || filteredDailyActivity.length === 0) {
      return {
        total_questions: personalStats?.summary?.total_questions || 0,
        total_correct: personalStats?.summary?.total_correct || 0,
        total_time_hours: (personalStats?.summary?.total_time_hours || 0).toFixed(1),
        total_time_minutes: Math.round((personalStats?.summary?.total_time_hours || 0) * 60),
        global_accuracy: personalStats?.summary?.global_accuracy || 0,
        best_day: weeklyReport?.best_day || 'N/A'
      }
    }

    const total_questions = filteredDailyActivity.reduce((acc, c) => acc + (c.attempted || 0), 0)
    const total_correct = filteredDailyActivity.reduce((acc, c) => acc + (c.correct || 0), 0)
    const total_time_minutes = Math.round(filteredDailyActivity.reduce((acc, c) => acc + (c.time_minutes || 0), 0))
    const total_time_hours = (total_time_minutes / 60).toFixed(1)
    const global_accuracy = total_questions > 0 ? Math.round((total_correct / total_questions) * 1000) / 10 : 0

    let bestDayObj = filteredDailyActivity[0]
    filteredDailyActivity.forEach(day => {
      if ((day.correct || 0) > (bestDayObj?.correct || 0)) {
        bestDayObj = day
      }
    })

    let best_day = 'N/A'
    if (bestDayObj?.date) {
      const d = new Date(bestDayObj.date)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      best_day = dayNames[d.getDay()] || bestDayObj.date
    }

    return {
      total_questions,
      total_correct,
      total_time_hours,
      total_time_minutes,
      global_accuracy,
      best_day
    }
  }, [filteredDailyActivity, personalStats, weeklyReport, personalPeriod])

  const periodLabels: Record<PersonalPeriod, string> = {
    day: 'Today',
    week: '7 Days',
    month: '30 Days',
    year: 'Year',
    all: 'All Time'
  }

  return (
    <div className="space-y-6 text-left w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto">
      {/* 📅 Sticky Top Synchronized Time Horizon Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3 relative overflow-hidden">
        <div className="h-1 absolute top-0 inset-x-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <Target className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">
                Personal Performance Stats
              </h2>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                Select a time horizon to synchronize all learning metrics
              </p>
            </div>
          </div>

          {/* Time Filter Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/70 overflow-x-auto no-scrollbar shrink-0 w-full sm:w-auto justify-center gap-1">
            {(['day', 'week', 'month', 'year', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPersonalPeriod(period)}
                className={cn(
                  "flex-1 sm:flex-none px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap text-center",
                  personalPeriod === period
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-black"
                    : "text-slate-500 hover:text-slate-900 font-bold hover:bg-white/50"
                )}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Hero KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100/60">
            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wider block">Questions Practiced</span>
            <div className="text-lg sm:text-xl font-black text-indigo-600 mt-0.5">
              {periodSummary.total_questions.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">q's</span>
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">In {periodLabels[personalPeriod].toLowerCase()}</p>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100/60">
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider block">Accuracy Rate</span>
            <div className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5">
              {periodSummary.global_accuracy}%
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">{periodSummary.total_correct} correct answers</p>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100/60">
            <span className="text-[8px] font-black text-amber-500 uppercase tracking-wider block">Study Time</span>
            <div className="text-lg sm:text-xl font-black text-amber-600 mt-0.5">
              {periodSummary.total_time_hours} <span className="text-[10px] font-bold text-slate-400">hrs</span>
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">~{periodSummary.total_time_minutes} mins focused</p>
          </div>

          <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100/60">
            <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider block">Peak Day</span>
            <div className="text-sm sm:text-base font-black text-purple-700 mt-1 truncate">
              {periodSummary.best_day}
            </div>
            <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-0.5">Highest practice volume</p>
          </div>
        </div>
      </div>

      {/* 🤖 Weekly AI Progress Insights Banner (if available) */}
      {weeklyReport && (
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white border border-indigo-800/50 shadow-md space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Weekly Learning Insights
                </h3>
                <span className="text-[9px] font-bold text-indigo-300">
                  Compared to previous 7 days ({weeklyReport.deltas?.questions_change_pct > 0 ? `+${weeklyReport.deltas.questions_change_pct}%` : `${weeklyReport.deltas?.questions_change_pct || 0}%`} volume)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-400 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-full text-[10px]">
                {weeklyReport.current_week?.questions || 0} questions this week
              </span>
            </div>
          </div>

          {Array.isArray(weeklyReport.ai_insights) && weeklyReport.ai_insights.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/10">
              {weeklyReport.ai_insights.map((insight: string, idx: number) => (
                <div key={idx} className="text-xs font-medium text-indigo-100/90 leading-relaxed flex items-start gap-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-amber-400 text-sm leading-none">•</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 📈 Activity & Focus Trend Chart Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-7 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">
                Learning Trend Chart
              </h3>
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                Track question volume and focused time ({periodLabels[personalPeriod]})
              </p>
            </div>
          </div>

          {/* Chart View Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start sm:self-auto">
            <button
              onClick={() => setActiveChartTab('activity')}
              className={cn(
                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                activeChartTab === 'activity' ? "bg-white text-indigo-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Questions
            </button>
            <button
              onClick={() => setActiveChartTab('time')}
              className={cn(
                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                activeChartTab === 'time' ? "bg-white text-emerald-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Time
            </button>
            <button
              onClick={() => setActiveChartTab('hours')}
              className={cn(
                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                activeChartTab === 'hours' ? "bg-white text-amber-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Hourly
            </button>
          </div>
        </div>

        {/* Chart View Content */}
        <div className="h-[220px] w-full -ml-4 pr-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeChartTab === 'activity' ? (
              <AreaChart data={filteredDailyActivity}>
                <defs>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }} 
                />
                <Area type="monotone" dataKey="attempted" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#actGrad)" name="Questions attempted" />
                <Area type="monotone" dataKey="correct" stroke="#10b981" strokeWidth={2} fillOpacity={0} name="Correct answers" />
              </AreaChart>
            ) : activeChartTab === 'time' ? (
              <AreaChart data={filteredDailyActivity}>
                <defs>
                  <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }} 
                />
                <Area type="monotone" dataKey="time_minutes" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#timeGrad)" name="Minutes focused" />
              </AreaChart>
            ) : (
              <BarChart data={personalStats?.hourly_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }} 
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Questions practiced">
                  {(personalStats?.hourly_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry.count || 0) > 0 ? "#f59e0b" : "#e2e8f0"} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 📊 Daily Comparison Chart (Today vs Historical Average) */}
      {dailyComparisonData && (
        <DailyComparisonChart 
          data={dailyComparisonData} 
          allTimeAvg={dailyComparisonAvg} 
          isLoading={isDailyComparisonLoading} 
        />
      )}

      {/* ⚡ Speed vs Accuracy Correlation */}
      <SpeedAccuracyWidget speedAccuracyStats={speedAccuracyStats} />

      {/* 🗓️ 365-Day Streak Heatmap Consistency */}
      <HeatmapWidget data={heatmapData} />
    </div>
  )
}
