import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts'
import { TrendingUp, Clock, Target, Award, BrainCircuit, ChevronRight, Zap, Flame, BarChart3, Layers } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'

interface StatsData {
  daily_activity: Array<{ date: string, attempted: number, correct: number, accuracy: number }>
  category_performance: Array<{ category: string, total: number, correct: number, accuracy: number, avg_time: number }>
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      {/* 1. PREMIUM HEADER */}
      <div className="px-4 pt-12 pb-8 max-w-6xl mx-auto">
         <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
               <BarChart3 className="w-6 h-6" />
            </div>
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Neural <span className="text-indigo-600">Analytics</span></h1>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Advanced Performance Insights</p>
            </div>
         </div>
      </div>

      {/* 2. CORE METRICS GRID */}
      <div className="px-4 max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

      <div className="px-4 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* 3. ACTIVITY CHART */}
         <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Retention Velocity</h3>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-full">Last 30 Days</span>
            </div>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyActivity}>
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
                       contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
                     />
                     <Line type="monotone" dataKey="accuracy" stroke="#4f46e5" strokeWidth={4} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* 4. CATEGORY BREAKDOWN */}
         <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic mb-8">Domain Mastery</h3>
            <div className="space-y-6">
               {categoryPerformance.map((cat, idx) => (
                 <div key={idx} className="group">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{cat.category}</span>
                       <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{cat.accuracy}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${cat.accuracy}%` }}
                         transition={{ duration: 1, delay: idx * 0.1 }}
                         className="h-full bg-indigo-600 rounded-full shadow-lg shadow-indigo-100"
                       />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-[8px] font-black text-slate-300 uppercase">{cat.total} Questions</span>
                       <span className="text-[8px] font-black text-slate-300 uppercase">{cat.avg_time}s / Node</span>
                    </div>
                 </div>
               ))}
               {categoryPerformance.length === 0 && (
                 <div className="py-20 text-center opacity-30">
                    <Layers className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-[9px] font-black uppercase tracking-widest">No Domain Data</p>
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
