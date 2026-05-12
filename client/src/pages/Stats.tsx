import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area } from 'recharts'
import { TrendingUp, Clock, Target, Award, BrainCircuit, ChevronRight, Zap, Flame, BarChart3, Layers, Calendar, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'

interface StatsData {
  daily_activity: Array<{ date: string, attempted: number, correct: number, accuracy: number }>
  category_performance: Array<{ category: string, total: number, correct: number, accuracy: number, avg_time: number }>
  hourly_distribution: Array<{ hour: string, count: number }>
  recent_sessions: Array<{ title: string, score: number, total: number, date: string }>
  summary: { total_questions: number, total_correct: number, total_time_hours: number, global_accuracy: number }
}

export default function Stats() {
  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ['detailed-stats'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/stats/detailed')
      return res.data
    }
  })

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black animate-pulse text-indigo-600">SYNCING NEURAL ANALYTICS...</div>
  
  if (!data || (data as any).error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 text-center">
        <BrainCircuit className="w-12 h-12 text-slate-200 mb-4" />
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Neural Link Failed</h3>
        <p className="text-[10px] font-medium text-slate-300 mt-2">{(data as any)?.error || "No analytics data available for this node."}</p>
      </div>
    )
  }

  const summary = data.summary || { total_questions: 0, total_correct: 0, total_time_hours: 0, global_accuracy: 0 }
  const dailyActivity = data.daily_activity || []
  const categoryPerformance = data.category_performance || []
  const hourlyDistribution = data.hourly_distribution || []
  const recentSessions = data.recent_sessions || []

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      {/* 1. PREMIUM HEADER */}
      <div className="px-6 pt-12 pb-8 max-w-7xl mx-auto">
         <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
               <BarChart3 className="w-7 h-7" />
            </div>
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Learning <span className="text-indigo-600">Insights</span></h1>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Your journey through the knowledge web</p>
            </div>
         </div>
      </div>

      {/* 2. CORE METRICS GRID */}
      <div className="px-6 max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
         <MetricCard 
           label="Global Accuracy" 
           value={`${summary.global_accuracy}%`} 
           sub="Neural Precision"
           icon={Target}
           color="text-indigo-600"
           bg="bg-indigo-50"
         />
         <MetricCard 
           label="Focus Time" 
           value={`${summary.total_time_hours}h`} 
           sub="Total Engagement"
           icon={Clock}
           color="text-emerald-600"
           bg="bg-emerald-50"
         />
         <MetricCard 
           label="Nodes Processed" 
           value={summary.total_questions} 
           sub="Total Questions"
           icon={Layers}
           color="text-amber-600"
           bg="bg-amber-50"
         />
         <MetricCard 
           label="Correct Patterns" 
           value={summary.total_correct} 
           sub="Validated Data"
           icon={Zap}
           color="text-rose-600"
           bg="bg-rose-50"
         />
      </div>

      <div className="px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* 3. PRODUCTIVITY CHART */}
         <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
            <div className="flex items-center justify-between mb-10">
               <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Productivity Flow</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">Daily nodes attempted (Last 30 Days)</p>
               </div>
               <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-700 uppercase">Avg: {Math.round(summary.total_questions / 30)}/day</span>
               </div>
            </div>
            <div className="h-[340px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyActivity}>
                     <defs>
                        <linearGradient id="colorAttempted" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                       dataKey="date" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} 
                       tickFormatter={(str) => str.split('-')[2]}
                     />
                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                     <Tooltip 
                       contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 900, padding: '1rem' }}
                     />
                     <Area type="monotone" dataKey="attempted" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorAttempted)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* 4. HOURLY DISTRIBUTION */}
         <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic mb-2">Peak Learning Hours</h3>
            <p className="text-[10px] font-bold text-slate-400 mb-10">Neural activity by time of day</p>
            <div className="h-[340px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyDistribution}>
                     <XAxis 
                       dataKey="hour" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 8, fontWeight: 900, fill: '#cbd5e1' }} 
                       interval={3}
                     />
                     <Tooltip 
                       cursor={{fill: '#f8fafc'}}
                       contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
                     />
                     <Bar dataKey="count" radius={[4, 4, 4, 4]}>
                        {hourlyDistribution.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#6366f1' : '#f1f5f9'} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* 5. DOMAIN MASTERY */}
         <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic mb-8">Neural Domains</h3>
            <div className="space-y-6">
               {categoryPerformance.map((cat, idx) => (
                 <div key={idx} className="group">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{cat.category}</span>
                       <span className="text-[11px] font-black text-indigo-600">{cat.accuracy}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${cat.accuracy}%` }}
                         transition={{ duration: 1, delay: idx * 0.1 }}
                         className="h-full bg-indigo-600 rounded-full shadow-lg shadow-indigo-100"
                       />
                    </div>
                    <div className="flex items-center justify-between mt-2 opacity-60">
                       <span className="text-[8px] font-black text-slate-400 uppercase">{cat.total} Nodes</span>
                       <span className="text-[8px] font-black text-slate-400 uppercase">{cat.avg_time}s / Node</span>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* 6. RECENT ACHIEVEMENTS */}
         <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
            <div className="flex items-center justify-between mb-10">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Recent Records</h3>
               <Link to="/" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">New Test <ChevronRight className="w-3 h-3" /></Link>
            </div>
            <div className="space-y-4">
               {recentSessions.map((session, idx) => (
                 <div key={idx} className="flex items-center gap-6 p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all">
                       <Activity className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-[13px] font-black text-slate-900 truncate mb-1 uppercase tracking-tight">{session.title}</h4>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{session.date}</p>
                    </div>
                    <div className="text-right">
                       <div className="text-lg font-black text-indigo-600 tracking-tighter leading-none mb-1">{session.score}/{session.total}</div>
                       <div className="text-[9px] font-black text-slate-300 uppercase">Points Earned</div>
                    </div>
                 </div>
               ))}
               {recentSessions.length === 0 && (
                 <div className="py-20 text-center opacity-30">
                    <Calendar className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Recent Activity Recorded</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
       <div className={cn("w-10 h-10 rounded-xl mb-4 flex items-center justify-center transition-all", bg, color)}>
          <Icon className="w-5 h-5" />
       </div>
       <div className="relative z-10">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</h4>
          <div className="text-2xl font-black text-slate-900 tracking-tighter italic">{value}</div>
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">{sub}</p>
       </div>
       <div className={cn("absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-0 group-hover:opacity-10 transition-opacity", bg)} />
    </div>
  )
}
