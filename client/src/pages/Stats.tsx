import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area } from 'recharts'
import { 
  TrendingUp, Clock, Target, Award, BrainCircuit, ChevronRight, Zap, 
  Flame, BarChart3, Layers, Calendar, Activity, ChevronLeft, 
  Target as TargetIcon, Users, Globe, BookOpen, ChevronDown, Timer,
  Sparkles, Lock, ArrowUpRight, ArrowDownRight, Info, Trophy, Crown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'

interface PersonalStats {
  daily_activity: Array<{ date: string, attempted: number, correct: number, accuracy: number, time_minutes: number }>
  category_performance: Array<{ category: string, total: number, correct: number, accuracy: number, avg_time: number }>
  hourly_distribution: Array<{ hour: string, count: number }>
  recent_sessions: Array<{ title: string, score: number, total: number, date: string }>
  summary: { total_questions: number, total_correct: number, total_time_hours: number, global_accuracy: number }
}

interface GlobalStats {
  total_questions: number
  total_quizzes: number
  total_users: number
  platform_accuracy: number
  avg_time_per_question: number
}

interface StatsData {
  personal: PersonalStats
  global: GlobalStats
}

interface HeatmapDay {
  date: string
  count: number
}

interface WeeklyReport {
  current_week: {
    questions: number
    accuracy: number
    time_minutes: number
  }
  previous_week: {
    questions: number
    accuracy: number
  }
  deltas: {
    questions_change_pct: number
    questions_change_absolute: number
    accuracy_change: number
  }
  best_day: string
  ai_insights: string[]
}

export default function Stats() {
  const [activeTab, setActiveTab] = useState<'personal' | 'global'>('personal')
  const [activeChart, setActiveChart] = useState(0)
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string, count: number, x: number, y: number } | null>(null)
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'xp' | 'streak' | 'questions' | 'accuracy'>('xp')
  
  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ['detailed-stats'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/detailed')
      return res.data
    }
  })

  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ['stats-leaderboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/leaderboard')
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

  const { data: weeklyReport } = useQuery<WeeklyReport>({
    queryKey: ['stats-weekly-report'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/quiz/stats/weekly-report')
      return res.data
    }
  })

  const { data: leitnerStats } = useQuery({
    queryKey: ['stats-leitner'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/quiz/stats/leitner')
      return res.data
    }
  })

  const { data: speedAccuracyStats } = useQuery({
    queryKey: ['stats-speed-accuracy'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/quiz/stats/speed-accuracy')
      return res.data
    }
  })

  const currentLeaderboard = leaderboardData?.[activeLeaderboardTab] || { list: [], user_rank: -1, user_value: 0 }
  const topThree = currentLeaderboard.list.slice(0, 3)
  const remainingUsers = currentLeaderboard.list.slice(3)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-white rounded-3xl border border-slate-100 flex items-center justify-center shadow-xl shadow-indigo-100 mb-6">
           <Zap className="w-8 h-8 text-indigo-600 animate-pulse" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Neural Data Link...</p>
      </div>
    )
  }
  
  if (!data || (data as any).error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8 text-center">
        <BrainCircuit className="w-12 h-12 text-slate-200 mb-4" />
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Connection Error</h3>
        <p className="text-[10px] font-medium text-slate-300 mt-2">{(data as any)?.error || "No analytics data available."}</p>
      </div>
    )
  }

  const { personal, global } = data

  const charts = [
    {
      title: "Question Flow",
      subtitle: "Questions answered per day",
      icon: Activity,
      data: personal.daily_activity,
      key: "attempted",
      color: "#4f46e5",
      type: "area"
    },
    {
      title: "Focus Time",
      subtitle: "Active minutes per day",
      icon: Timer,
      data: personal.daily_activity,
      key: "time_minutes",
      color: "#10b981",
      type: "area"
    },
    {
      title: "Peak Hours",
      subtitle: "Learning activity by hour",
      icon: Clock,
      data: personal.hourly_distribution,
      key: "count",
      color: "#f59e0b",
      type: "bar"
    }
  ]

  // Generates columns (weeks) for Streak Heatmap Grid
  const getHeatmapGrid = () => {
    const grid: Array<Array<{ date: Date, dateStr: string, count: number }>> = []
    const today = new Date()
    
    const startDate = new Date()
    startDate.setDate(today.getDate() - 364)
    const startDay = startDate.getDay() // 0 = Sunday, 1 = Monday, etc.
    startDate.setDate(startDate.getDate() - startDay) // Adjust to Sunday of that week
    
    const dateMap = new Map<string, number>()
    if (heatmapData) {
      heatmapData.forEach(item => {
        dateMap.set(item.date, item.count)
      })
    }
    
    const current = new Date(startDate)
    for (let w = 0; w < 53; w++) {
      const weekDays = []
      for (let d = 0; d < 7; d++) {
        const dateCopy = new Date(current)
        const yyyy = dateCopy.getFullYear()
        const mm = String(dateCopy.getMonth() + 1).padStart(2, '0')
        const dd = String(dateCopy.getDate()).padStart(2, '0')
        const dateStr = `${yyyy}-${mm}-${dd}`
        const count = dateMap.get(dateStr) || 0
        weekDays.push({
          date: dateCopy,
          dateStr,
          count
        })
        current.setDate(current.getDate() + 1)
      }
      grid.push(weekDays)
    }
    return grid
  }

  const getDayColorClass = (count: number) => {
    if (count === 0) return 'bg-slate-100/70 hover:bg-slate-200'
    if (count <= 3) return 'bg-indigo-100/80 hover:bg-indigo-200 hover:shadow-indigo-100 shadow-sm border border-indigo-200/10'
    if (count <= 7) return 'bg-indigo-300 hover:bg-indigo-400 hover:shadow-indigo-200 shadow-sm border border-indigo-300/10'
    if (count <= 12) return 'bg-indigo-500 hover:bg-indigo-600 hover:shadow-indigo-300 shadow-md border border-indigo-500/10'
    return 'bg-indigo-700 hover:bg-indigo-800 hover:shadow-indigo-500 shadow-lg shadow-indigo-600/40 border border-indigo-700/10 hover:scale-110'
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      {/* sticky compact header */}
      <div className="sticky top-0 z-[120] bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 py-3 md:px-6 md:py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
                <BarChart3 className="w-4 h-4" />
             </div>
             <h1 className="text-sm md:text-lg font-black text-slate-900 tracking-tighter uppercase italic leading-none truncate">
                Learning <span className="text-indigo-600">Insights</span>
             </h1>
          </div>
          
          <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-100 shrink-0 scale-90 md:scale-100 origin-right">
             <button 
                onClick={() => setActiveTab('personal')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'personal' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400"
                )}
             >
                Personal
             </button>
             <button 
                onClick={() => setActiveTab('global')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'global' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400"
                )}
             >
                Global
             </button>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-7xl mx-auto space-y-6 pt-6">
         <AnimatePresence mode="wait">
            {activeTab === 'personal' ? (
               <motion.div 
                 key="personal"
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="space-y-6"
               >
                  {/* Personal Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                     <MetricCard 
                       label="Accuracy" 
                       value={`${personal.summary.global_accuracy}%`} 
                       sub="Accuracy Rate"
                       icon={TargetIcon}
                       color="text-indigo-600"
                       bg="bg-indigo-50"
                     />
                     <MetricCard 
                       label="Time" 
                       value={`${personal.summary.total_time_hours}h`} 
                       sub="Study Duration"
                       icon={Clock}
                       color="text-emerald-600"
                       bg="bg-emerald-50"
                     />
                     <MetricCard 
                       label="Questions" 
                       value={personal.summary.total_questions} 
                       sub="Total Questions"
                       icon={Layers}
                       color="text-amber-600"
                       bg="bg-amber-50"
                     />
                     <MetricCard 
                       label="Score" 
                       value={personal.summary.total_correct} 
                       sub="Correct Answers"
                       icon={Zap}
                       color="text-rose-600"
                       bg="bg-rose-50"
                     />
                  </div>

                  {/* Weekly Progress Report & AI Insights */}
                  {weeklyReport && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Weekly Report details */}
                      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Weekly Performance</h3>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">Last 7 days compared to prior 7 days</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Completed</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-xl font-black text-slate-900 leading-none">
                                {weeklyReport.current_week.questions}
                              </span>
                              <span className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center leading-none",
                                weeklyReport.deltas.questions_change_pct >= 0 
                                  ? "bg-emerald-50 text-emerald-600" 
                                  : "bg-rose-50 text-rose-600"
                              )}>
                                {weeklyReport.deltas.questions_change_pct >= 0 ? '+' : ''}
                                {weeklyReport.deltas.questions_change_pct}%
                              </span>
                            </div>
                            <p className="text-[7px] font-medium text-slate-400 mt-1.5 uppercase">vs prior week</p>
                          </div>

                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Accuracy</span>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-xl font-black text-slate-900 leading-none">
                                {weeklyReport.current_week.accuracy}%
                              </span>
                              <span className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center leading-none",
                                weeklyReport.deltas.accuracy_change >= 0 
                                  ? "bg-emerald-50 text-emerald-600" 
                                  : "bg-rose-50 text-rose-600"
                              )}>
                                {weeklyReport.deltas.accuracy_change >= 0 ? '+' : ''}
                                {weeklyReport.deltas.accuracy_change}%
                              </span>
                            </div>
                            <p className="text-[7px] font-medium text-slate-400 mt-1.5 uppercase">vs prior week</p>
                          </div>

                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Focus Duration</span>
                            <div className="text-xl font-black text-slate-900 mt-1 leading-none">
                              {weeklyReport.current_week.time_minutes}m
                            </div>
                            <p className="text-[7px] font-medium text-slate-400 mt-1.5 uppercase">Total study time</p>
                          </div>

                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peak Day</span>
                            <div className="text-xl font-black text-indigo-600 mt-1 leading-none truncate">
                              {weeklyReport.best_day}
                            </div>
                            <p className="text-[7px] font-medium text-slate-400 mt-1.5 uppercase">Most active day</p>
                          </div>
                        </div>
                      </div>

                      {/* AI coach Insights */}
                      <div className="bg-gradient-to-tr from-indigo-50/50 to-purple-50/50 border border-indigo-100/50 rounded-[2.5rem] p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-2xl -z-10" />
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                              <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                            </div>
                            <div>
                              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">AI Study Coach</h3>
                              <p className="text-[9px] font-bold text-indigo-600 mt-0.5 uppercase tracking-widest">Personalized Strategy</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3.5 mt-4">
                            {weeklyReport.ai_insights.map((insight, idx) => (
                              <div key={idx} className="flex gap-3 bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm hover:scale-[1.01] transition-all">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                <p className="text-xs font-semibold text-slate-700 leading-relaxed">{insight}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Streak Heatmap Calendar */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Retrieval Consistency</h3>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">365-Day study streak activity map</p>
                      </div>
                    </div>

                    <div className="relative border border-slate-50 bg-slate-50/20 rounded-3xl p-5 md:p-8 overflow-x-auto no-scrollbar scroll-smooth">
                      <div className="flex gap-[3.5px] select-none min-w-[700px] justify-between relative">
                        
                        {/* Tooltip render */}
                        <AnimatePresence>
                          {hoveredDay && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute bg-slate-900 text-white text-[9px] font-black px-2.5 py-1.5 rounded-xl pointer-events-none z-[130] shadow-xl uppercase tracking-widest flex flex-col items-center gap-0.5"
                              style={{ 
                                left: `${hoveredDay.x}px`, 
                                top: `${hoveredDay.y}px`, 
                                transform: 'translateX(-50%)' 
                              }}
                            >
                              <span>{hoveredDay.count} cards reviewed</span>
                              <span className="text-[8px] text-slate-400">{hoveredDay.dateStr}</span>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Weekday labels */}
                        <div className="flex flex-col justify-between py-1 text-[8px] font-black text-slate-300 w-6 uppercase tracking-wider">
                          <span>Sun</span>
                          <span>Tue</span>
                          <span>Thu</span>
                          <span>Sat</span>
                        </div>

                        {/* grid weeks */}
                        {getHeatmapGrid().map((week, wIdx) => (
                          <div key={wIdx} className="flex flex-col gap-[3.5px]">
                            {week.map((day, dIdx) => (
                              <div
                                key={dIdx}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const container = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                  if (container) {
                                    setHoveredDay({
                                      dateStr: day.dateStr,
                                      count: day.count,
                                      x: rect.left - container.left + rect.width / 2,
                                      y: rect.top - container.top - 45
                                    });
                                  }
                                }}
                                onMouseLeave={() => setHoveredDay(null)}
                                className={cn(
                                  "w-3.5 h-3.5 rounded-sm transition-all duration-200 cursor-pointer",
                                  getDayColorClass(day.count)
                                )}
                              />
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center justify-between mt-6 text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
                        <span>Less consistent</span>
                        <div className="flex items-center gap-[3.5px]">
                          <div className="w-3 h-3 rounded-sm bg-slate-100/70" />
                          <div className="w-3 h-3 rounded-sm bg-indigo-100" />
                          <div className="w-3 h-3 rounded-sm bg-indigo-300" />
                          <div className="w-3 h-3 rounded-sm bg-indigo-500" />
                          <div className="w-3 h-3 rounded-sm bg-indigo-700" />
                        </div>
                        <span>More active</span>
                      </div>
                    </div>
                  </div>

                  {/* Leitner Box Spaced Repetition Mastery */}
                  {leitnerStats && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Box distribution & KPI card */}
                      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-sm lg:col-span-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Spaced Repetition Mastery</h3>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">Leitner memory box card distribution</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                {leitnerStats.mastery_percentage}% Mastered
                              </span>
                            </div>
                          </div>

                          {/* Leitner distribution chart */}
                          <div className="h-[200px] w-full mt-4 -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={leitnerStats.box_distribution}>
                                <defs>
                                  <linearGradient id="leitnerGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                                    <stop offset="95%" stopColor="#4338ca" stopOpacity={0.9}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="label" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} 
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                                <Tooltip 
                                  cursor={{fill: '#f8fafc'}}
                                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
                                />
                                <Bar dataKey="count" fill="url(#leitnerGrad)" radius={[6, 6, 0, 0]} barSize={40} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Cards in System: <strong>{leitnerStats.total_tracked}</strong></span>
                          <span>Retention Level: <strong>{leitnerStats.mastery_percentage > 70 ? 'Excellent' : leitnerStats.mastery_percentage > 40 ? 'Moderate' : 'Starter'}</strong></span>
                        </div>
                      </div>

                      {/* Hardest Box 1 Cards (Focus Drawer) */}
                      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                              <Flame className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Cards Needing Focus</h3>
                              <p className="text-[9px] font-bold text-rose-500 mt-0.5 uppercase tracking-widest">Box 1 Hardest questions</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {leitnerStats.hardest_cards.length === 0 ? (
                              <div className="py-10 text-center text-slate-300 font-bold text-xs">
                                No Box 1 cards found. Great job! 🎉
                              </div>
                            ) : (
                              leitnerStats.hardest_cards.map((card: any) => (
                                <FocusCardRow key={card.id} card={card} />
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Speed vs. Accuracy Correlation */}
                  {speedAccuracyStats && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Chart */}
                      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-sm lg:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Speed vs. Accuracy Profile</h3>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">Accuracy rate relative to response speed bins</p>
                          </div>
                        </div>

                        <div className="h-[200px] w-full -ml-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={speedAccuracyStats.bins}>
                              <defs>
                                <linearGradient id="speedAccGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="label" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} 
                              />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
                              />
                              <Area type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#speedAccGrad)" name="Accuracy (%)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Metric speed comparison cards */}
                      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                              <Timer className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Solve Velocity</h3>
                              <p className="text-[9px] font-bold text-amber-500 mt-0.5 uppercase tracking-widest">Average response time comparison</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Correct Solve Speed</span>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-2xl font-black text-emerald-600 leading-none">
                                  {speedAccuracyStats.avg_speed_correct}s
                                </span>
                              </div>
                              <p className="text-[7px] font-medium text-slate-400 mt-1.5 uppercase">Average time spent per correct answer</p>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wrong Attempt Speed</span>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-2xl font-black text-rose-600 leading-none">
                                  {speedAccuracyStats.avg_speed_wrong}s
                                </span>
                              </div>
                              <p className="text-[7px] font-medium text-slate-400 mt-1.5 uppercase">Average time spent per wrong attempt</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/30">
                          <p className="text-[9px] font-semibold text-indigo-700 leading-relaxed">
                            {speedAccuracyStats.avg_speed_correct < speedAccuracyStats.avg_speed_wrong ? (
                              "💡 Insight: Your retrieval is faster on correct answers! This shows strong cognitive memory paths and confidence when you know the subject."
                            ) : (
                              "💡 Insight: You take more time on questions you get correct. Taking a moment to analyze options pays off!"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CHART CAROUSEL */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-10 shadow-sm overflow-hidden group">
                     <div className="flex items-center justify-between mb-8 overflow-x-auto no-scrollbar pb-4 md:pb-0">
                        <div className="flex items-center gap-2">
                           {charts.map((c, idx) => (
                             <button 
                                onClick={
                                  // Explicit cast to satisfy typescript compiling if required, otherwise standard
                                  () => setActiveChart(idx)
                                }
                                key={idx}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                                  activeChart === idx 
                                    ? "bg-slate-900 text-white border-slate-900" 
                                    : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                                )}
                             >
                                {c.title}
                             </button>
                           ))}
                        </div>
                        <div className="hidden md:flex items-center gap-2">
                           <button 
                             onClick={() => setActiveChart((prev) => (prev > 0 ? prev - 1 : charts.length - 1))}
                             className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all"
                           >
                              <ChevronLeft className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => setActiveChart((prev) => (prev < charts.length - 1 ? prev + 1 : 0))}
                             className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all"
                           >
                              <ChevronRight className="w-4 h-4" />
                           </button>
                        </div>
                     </div>

                     <div className="relative overflow-hidden">
                        <AnimatePresence mode="wait">
                           <motion.div 
                             key={activeChart}
                             initial={{ opacity: 0, x: 50 }}
                             animate={{ opacity: 1, x: 0 }}
                             exit={{ opacity: 0, x: -50 }}
                             transition={{ type: "spring", damping: 30, stiffness: 300 }}
                             className="space-y-6"
                           >
                              <div className="flex items-center gap-3">
                                 <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", activeChart === 0 ? "bg-indigo-50 text-indigo-600" : activeChart === 1 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                                    {(() => {
                                       const Icon = charts[activeChart].icon;
                                       return Icon ? <Icon className="w-5 h-5" /> : null;
                                    })()}
                                 </div>
                                 <div>
                                    <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic">{charts[activeChart].title}</h3>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{charts[activeChart].subtitle}</p>
                                 </div>
                              </div>

                              <div className="h-[250px] md:h-[350px] w-full -ml-4">
                                 <ResponsiveContainer width="100%" height="100%">
                                    {charts[activeChart].type === 'area' ? (
                                       <AreaChart data={charts[activeChart].data as any[]}>
                                          <defs>
                                             <linearGradient id={`colorChart${activeChart}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={charts[activeChart].color} stopOpacity={0.15}/>
                                                <stop offset="95%" stopColor={charts[activeChart].color} stopOpacity={0}/>
                                             </linearGradient>
                                          </defs>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                          <XAxis 
                                            dataKey={activeChart === 2 ? "hour" : "date"} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} 
                                            tickFormatter={(str) => charts[activeChart].type === 'bar' ? str : str.split('-')[2]}
                                          />
                                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} />
                                          <Tooltip 
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
                                          />
                                          <Area type="monotone" dataKey={charts[activeChart].key} stroke={charts[activeChart].color} strokeWidth={3} fillOpacity={1} fill={`url(#colorChart${activeChart})`} />
                                       </AreaChart>
                                    ) : (
                                       <BarChart data={charts[activeChart].data as any[]}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                          <XAxis 
                                            dataKey="hour" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 8, fontWeight: 900, fill: '#94a3b8' }} 
                                            interval={2}
                                          />
                                          <Tooltip 
                                            cursor={{fill: '#f8fafc'}}
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
                                          />
                                          <Bar dataKey="count" radius={[4, 4, 4, 4]}>
                                             {(charts[activeChart].data as any[]).map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.count > 0 ? charts[activeChart].color : '#f1f5f9'} />
                                             ))}
                                          </Bar>
                                       </BarChart>
                                    )}
                                 </ResponsiveContainer>
                              </div>
                           </motion.div>
                        </AnimatePresence>
                     </div>

                     {/* Swipe/Slide Indicators */}
                     <div className="flex items-center justify-center gap-1.5 mt-8">
                        {charts.map((_, idx) => (
                           <button 
                             key={idx}
                             onClick={() => setActiveChart(idx)}
                             className={cn(
                               "h-1 rounded-full transition-all duration-300",
                               activeChart === idx ? "w-8 bg-indigo-600" : "w-2 bg-slate-100 hover:bg-slate-200"
                             )}
                           />
                        ))}
                     </div>
                  </div>

                  {/* DOMAIN MASTERY */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-10 shadow-sm">
                        <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic mb-8">Knowledge Domains</h3>
                        <div className="space-y-6">
                           {personal.category_performance.slice(0, 6).map((cat, idx) => (
                             <div key={idx}>
                                 <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{cat.category}</span>
                                    <span className="text-[10px] font-black text-indigo-600">{cat.accuracy}%</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${cat.accuracy}%` }}
                                      className="h-full bg-indigo-600 rounded-full"
                                    />
                                 </div>
                             </div>
                           ))}
                        </div>
                     </div>

                     <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-10 shadow-sm">
                        <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic mb-8">Attempt History</h3>
                        <div className="space-y-4">
                           {personal.recent_sessions.map((session, idx) => (
                             <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                 <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                    <Activity className="w-4 h-4" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black text-slate-900 truncate uppercase">{session.title}</h4>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{session.date}</p>
                                 </div>
                                 <div className="text-right">
                                    <div className="text-xs font-black text-indigo-600 tracking-tighter">{session.score}/{session.total}</div>
                                 </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </motion.div>
            ) : (
               <motion.div 
                 key="global"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="space-y-6"
               >
                  {/* Global Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                     <MetricCard 
                       label="Total Users" 
                       value={global.total_users} 
                       sub="Active Users"
                       icon={Users}
                       color="text-indigo-600"
                       bg="bg-indigo-50"
                     />
                     <MetricCard 
                       label="Total Quizzes" 
                       value={global.total_quizzes} 
                       sub="Quiz Decks"
                       icon={BookOpen}
                       color="text-emerald-600"
                       bg="bg-emerald-50"
                     />
                     <MetricCard 
                       label="Total Items" 
                       value={global.total_questions} 
                       sub="Total Questions"
                       icon={Layers}
                       color="text-amber-600"
                       bg="bg-amber-50"
                     />
                     <MetricCard 
                       label="Platform Acc" 
                       value={`${global.platform_accuracy}%`} 
                       sub="Platform Accuracy"
                       icon={Globe}
                       color="text-rose-600"
                       bg="bg-rose-50"
                     />
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Leaderboard Column */}
                      <div className="lg:col-span-2 space-y-6">
                         <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-sm flex flex-col justify-between overflow-hidden relative">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                               <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                     <Trophy className="w-4.5 h-4.5" />
                                  </div>
                                  <div>
                                     <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Bảng Vinh Danh Thành Viên</h3>
                                     <p className="text-[9px] font-bold text-slate-400 mt-0.5">Đua top học tập, nâng cao trình độ</p>
                                  </div>
                               </div>

                               {/* Leaderboard Tab switcher */}
                               <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 overflow-x-auto no-scrollbar max-w-full">
                                  {(['xp', 'streak', 'questions', 'accuracy'] as const).map((tab) => (
                                     <button
                                        key={tab}
                                        onClick={() => setActiveLeaderboardTab(tab)}
                                        className={cn(
                                           "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                           activeLeaderboardTab === tab ? "bg-white text-indigo-600 shadow-sm border border-slate-100/50" : "text-slate-400"
                                        )}
                                     >
                                        {tab === 'xp' ? 'XP' : tab === 'streak' ? 'Streak' : tab === 'questions' ? 'Questions' : 'Accuracy'}
                                     </button>
                                  ))}
                               </div>
                            </div>

                            {isLeaderboardLoading ? (
                               <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                                  <Zap className="w-8 h-8 text-indigo-500 animate-pulse" />
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải bảng xếp hạng...</span>
                               </div>
                            ) : (
                               <>
                                  {/* Podium Top 3 */}
                                  {topThree.length > 0 && (
                                     <div className="flex items-end justify-center gap-2 md:gap-6 py-6 md:py-10 border-b border-slate-50 bg-gradient-to-b from-indigo-50/10 to-transparent rounded-3xl mb-4 px-2">
                                        {(() => {
                                           const topThreePositions = [
                                              { item: topThree[1], index: 1, pos: 2, height: 'h-24 md:h-28', color: 'from-slate-100 to-slate-200 border-slate-300', text: 'text-slate-500', bg: 'bg-slate-100' }, // 2nd place
                                              { item: topThree[0], index: 0, pos: 1, height: 'h-32 md:h-36', color: 'from-amber-100 to-amber-200 border-amber-300', text: 'text-amber-600', bg: 'bg-amber-100' }, // 1st place
                                              { item: topThree[2], index: 2, pos: 3, height: 'h-20 md:h-24', color: 'from-orange-100 to-orange-200 border-orange-300', text: 'text-orange-700', bg: 'bg-orange-100' }  // 3rd place
                                           ].filter(p => p.item)

                                           return topThreePositions.map((pod) => {
                                              const user = pod.item
                                              const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                                              return (
                                                 <div key={user.user_id} className="flex flex-col items-center w-24 md:w-32 shrink-0">
                                                    {/* Avatar & Badge */}
                                                    <div className="relative mb-2">
                                                       {pod.pos === 1 && (
                                                          <Crown className="w-5 h-5 text-amber-500 absolute -top-4.5 left-1/2 -translate-x-1/2 drop-shadow-sm animate-bounce" />
                                                       )}
                                                       <div className={cn(
                                                          "w-12 h-12 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center text-sm md:text-lg font-black bg-white shadow-md relative",
                                                          pod.pos === 1 ? "border-amber-400 ring-4 ring-amber-50" : pod.pos === 2 ? "border-slate-300" : "border-orange-300"
                                                       )}>
                                                          {initial}
                                                          {/* Rank Badge */}
                                                          <div className={cn(
                                                             "absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full border flex items-center justify-center text-[9px] md:text-[10px] font-black text-white shadow-sm",
                                                             pod.pos === 1 ? "bg-amber-500 border-amber-400" : pod.pos === 2 ? "bg-slate-400 border-slate-300" : "bg-orange-500 border-orange-400"
                                                          )}>
                                                             {pod.pos}
                                                          </div>
                                                       </div>
                                                    </div>

                                                    {/* User Details */}
                                                    <div className="text-center w-full px-1">
                                                       <div className="text-[10px] font-black text-slate-900 truncate leading-tight">{user.full_name}</div>
                                                       <div className="text-[8px] font-black text-slate-400 uppercase mt-0.5 tracking-wider">Lv.{user.level}</div>
                                                    </div>

                                                    {/* Podium pillar */}
                                                    <div className={cn(
                                                       "w-full mt-3 rounded-t-2xl flex flex-col justify-end items-center pb-2 bg-gradient-to-t shadow-sm",
                                                       pod.height, pod.color
                                                    )}>
                                                       <span className={cn("text-[9px] md:text-[10px] font-black tracking-tighter leading-none mb-1", pod.text)}>
                                                          {activeLeaderboardTab === 'xp' ? `${user.value.toLocaleString()}` : activeLeaderboardTab === 'streak' ? `${user.value} ngày` : activeLeaderboardTab === 'questions' ? `${user.value.toLocaleString()}` : `${user.value}%`}
                                                       </span>
                                                       <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                          {activeLeaderboardTab === 'xp' ? 'XP' : activeLeaderboardTab === 'streak' ? 'Streak' : activeLeaderboardTab === 'questions' ? 'câu' : 'Chính xác'}
                                                       </span>
                                                    </div>
                                                 </div>
                                              )
                                           })
                                        })()}
                                     </div>
                                  )}

                                  {/* List Ranks 4+ */}
                                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                                     {remainingUsers.length === 0 && topThree.length === 0 ? (
                                        <div className="py-10 text-center text-slate-300 font-bold text-xs">
                                           Chưa có dữ liệu xếp hạng nào.
                                        </div>
                                     ) : remainingUsers.length === 0 ? (
                                        <div className="py-4 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                           Đã hiển thị hết danh sách
                                        </div>
                                     ) : (
                                        remainingUsers.map((user: any) => {
                                           const initial = (user.full_name || user.username || '?').charAt(0).toUpperCase()
                                           return (
                                              <div key={user.user_id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-all hover:scale-[1.005]">
                                                 <div className="w-6 text-[10px] font-black text-slate-400 text-center">
                                                    #{user.rank}
                                                 </div>
                                                 <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shrink-0">
                                                    {initial}
                                                 </div>
                                                 <div className="flex-1 min-w-0">
                                                    <h4 className="text-[11px] font-black text-slate-900 truncate uppercase">{user.full_name}</h4>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cấp độ {user.level}</p>
                                                 </div>
                                                 <div className="text-right shrink-0">
                                                    <div className="text-[11px] font-black text-indigo-600 tracking-tighter">
                                                       {activeLeaderboardTab === 'xp' ? `${user.value.toLocaleString()} XP` : activeLeaderboardTab === 'streak' ? `${user.value} ngày` : activeLeaderboardTab === 'questions' ? `${user.value.toLocaleString()} câu` : `${user.value}%`}
                                                    </div>
                                                 </div>
                                              </div>
                                           )
                                        })
                                     )}
                                  </div>

                                  {/* Current User rank banner */}
                                  {currentLeaderboard.user_rank !== -1 && (
                                     <div className="mt-4 p-4 bg-indigo-600 rounded-3xl border border-indigo-500 shadow-lg shadow-indigo-600/20 text-white flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                           <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                                              <Trophy className="w-4 h-4 text-amber-300" />
                                           </div>
                                           <div className="min-w-0">
                                              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Xếp hạng của bạn</p>
                                              <h4 className="text-[11px] font-black truncate uppercase leading-tight">
                                                 Bạn đang đứng thứ <span className="text-amber-300">#{currentLeaderboard.user_rank}</span>
                                              </h4>
                                           </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                           <div className="text-[11px] font-black text-amber-300 tracking-tighter leading-none">
                                              {activeLeaderboardTab === 'xp' ? `${currentLeaderboard.user_value.toLocaleString()} XP` : activeLeaderboardTab === 'streak' ? `${currentLeaderboard.user_value} ngày` : activeLeaderboardTab === 'questions' ? `${currentLeaderboard.user_value.toLocaleString()} câu` : `${currentLeaderboard.user_value}%`}
                                           </div>
                                           <span className="text-[7px] font-bold uppercase tracking-wider text-indigo-200 mt-0.5 block">
                                              {activeLeaderboardTab === 'xp' ? 'Tích lũy' : activeLeaderboardTab === 'streak' ? 'Liên tục' : activeLeaderboardTab === 'questions' ? 'Đã làm' : 'Độ chính xác'}
                                           </span>
                                        </div>
                                     </div>
                                  )}
                               </>
                            )}
                         </div>
                      </div>

                      {/* Global details & platform health column */}
                      <div className="space-y-6">
                         <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm text-center h-full flex flex-col justify-between">
                            <div className="space-y-6">
                               <div className="w-16 h-16 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 mx-auto shadow-lg shadow-indigo-100">
                                  <Globe className="w-8 h-8" />
                               </div>
                               <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Hệ sinh thái học tập</h3>
                               <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
                                  Hệ sinh thái QuizMind đang phát triển không ngừng. Trung bình, mỗi câu hỏi được giải trong <strong>{global.avg_time_per_question} giây</strong> với tỷ lệ chính xác toàn nền tảng là <strong>{global.platform_accuracy}%</strong>.
                               </p>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3 pt-6 mt-6 border-t border-slate-50">
                               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thời gian TB</span>
                                  <p className="text-xs font-black text-slate-900">{global.avg_time_per_question} giây/câu</p>
                               </div>
                               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</span>
                                  <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">Ổn định</p>
                               </div>
                               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng câu hỏi</span>
                                  <p className="text-xs font-black text-indigo-600">{global.total_questions.toLocaleString()}</p>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>         </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 p-4 md:p-6 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
       <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl mb-3 flex items-center justify-center transition-all", bg, color)}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
       </div>
       <div className="relative z-10">
          <h4 className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</h4>
          <div className="text-lg md:text-2xl font-black text-slate-900 tracking-tighter italic leading-none">{value}</div>
          <p className="text-[7px] md:text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">{sub}</p>
       </div>
    </div>
  )
}

function FocusCardRow({ card }: { card: any }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3 transition-all hover:border-rose-100">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer"
      >
        <span className="text-[10px] font-semibold text-slate-700 truncate max-w-[200px]">
          {card.content.replace(/<[^>]*>/g, '')}
        </span>
        <span className="text-[8px] font-black uppercase text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md shrink-0">
          Box 1
        </span>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-t border-slate-100 overflow-hidden"
          >
            <p className="text-[9px] font-medium text-slate-500 leading-relaxed italic">
              <strong>Explanation:</strong> {card.explanation || "No explanation provided for this question."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
