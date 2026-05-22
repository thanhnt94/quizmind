import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area } from 'recharts'
import { 
  TrendingUp, Clock, Target, Award, BrainCircuit, ChevronRight, Zap, 
  Flame, BarChart3, Layers, Calendar, Activity, ChevronLeft, Map, 
  Target as TargetIcon, Users, Globe, BookOpen, ChevronDown, Timer
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

export default function Stats() {
  const [activeTab, setActiveTab] = useState<'personal' | 'global'>('personal')
  const [activeChart, setActiveChart] = useState(0)
  
  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ['detailed-stats'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/detailed')
      return res.data
    }
  })

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      {/* 1. ULTRA-COMPACT STICKY HEADER */}
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

                  {/* CHART CAROUSEL */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-10 shadow-sm overflow-hidden group">
                     <div className="flex items-center justify-between mb-8 overflow-x-auto no-scrollbar pb-4 md:pb-0">
                        <div className="flex items-center gap-2">
                           {charts.map((c, idx) => (
                             <button 
                                key={idx}
                                onClick={() => setActiveChart(idx)}
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
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-12 shadow-sm text-center">
                     <div className="max-w-2xl mx-auto space-y-6">
                        <div className="w-20 h-20 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-indigo-600 mx-auto mb-8 shadow-xl shadow-indigo-100">
                           <Globe className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tight">Knowledge Ecosystem</h3>
                        <p className="text-xs md:text-sm font-medium text-slate-400 leading-relaxed">
                           The QuizMind knowledge ecosystem is continuously expanding. On average, each question is solved in <strong>{global.avg_time_per_question} seconds</strong> with a platform-wide accuracy rate of <strong>{global.platform_accuracy}%</strong>.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
                           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Time</h4>
                              <p className="text-lg font-black text-slate-900">{global.avg_time_per_question}s</p>
                           </div>
                           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</h4>
                              <p className="text-lg font-black text-emerald-600">Stable</p>
                           </div>
                           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Items</h4>
                              <p className="text-lg font-black text-indigo-600">{global.total_questions}</p>
                           </div>
                        </div>
                     </div>
                  </div>
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
