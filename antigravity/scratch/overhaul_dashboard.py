import os

file_path = r'c:\Code\Ecosystem\QuizMind\client\src\pages\Dashboard.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = """import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Bell, Flame, Target, Clock, Award, Play, Archive, Layers, Zap, TrendingUp, BookOpen } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

interface Quiz {
  id: number
  title: string
  description: string
  questions_count: number
}

interface DashboardData {
  my_quizzes: Quiz[]
  archived_quizzes: Quiz[]
  discover_quizzes: Quiz[]
  gamify: { level: number, xp: number, streak: number }
  stats_summary: { avg_accuracy: number, total_time_hours: number, total_questions: number }
  notifications: any[]
  unread_count: number
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'my' | 'archived' | 'discover'>('my')
  const [searchQuery, setSearchQuery] = useState('')
  const { setGamify } = useAppStore()

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      setGamify(res.data.gamify)
      return res.data
    }
  })

  if (isLoading || !data) return <div className="h-screen flex items-center justify-center font-black animate-pulse text-indigo-600 tracking-widest uppercase">Initializing Ecosystem...</div>

  const filterQuizzes = (quizzes: Quiz[]) => 
    quizzes.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const tabs = [
    { id: 'my', label: 'My Quizzes', count: data.my_quizzes.length, icon: BookOpen },
    { id: 'archived', label: 'Archive', count: data.archived_quizzes.length, icon: Archive },
    { id: 'discover', label: 'Explore', count: data.discover_quizzes.length, icon: Zap },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      {/* Premium Hero Header */}
      <div className="bg-white border-b border-slate-100 px-6 pt-12 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-5">
              <div className="relative group cursor-pointer">
                <div className="w-16 h-16 rounded-[2rem] bg-indigo-50 p-1 border-2 border-indigo-100 shadow-inner group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl border-2 border-white shadow-lg shadow-indigo-200"
                >
                  LV.{data.gamify.level}
                </motion.div>
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-1">
                  Hi, Felix! <span className="text-indigo-600">👋</span>
                </h1>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {data.gamify.xp} XP • {data.gamify.streak} DAY STREAK
                </p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <button className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-600 hover:border-indigo-100 transition-all">
                <Bell className="w-5 h-5" />
              </button>
              <Link to="/quiz/import" className="px-6 h-12 bg-slate-900 text-white rounded-2xl flex items-center gap-3 shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all">
                <Plus className="w-5 h-5" />
                <span className="font-black text-[10px] uppercase tracking-widest">New Session</span>
              </Link>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <StatItem icon={Flame} value={data.gamify.streak} label="Streak" color="orange" trend="+2" />
            <StatItem icon={Target} value={`${data.stats_summary.avg_accuracy}%`} label="Accuracy" color="emerald" trend="High" />
            <StatItem icon={Clock} value={data.stats_summary.total_time_hours} label="Hours" color="indigo" hideMobile />
            <StatItem icon={Award} value={data.stats_summary.total_questions} label="Total Quiz" color="purple" hideMobile />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-10">
        {/* Modern Search */}
        <div className="relative mb-12 group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Search for subjects, topics or quizzes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-8 h-16 bg-white border border-slate-100 rounded-[2.5rem] text-sm font-semibold focus:ring-4 focus:ring-indigo-500/5 outline-none shadow-xl shadow-slate-200/20 group-hover:shadow-indigo-500/5 transition-all" 
          />
        </div>

        {/* Tab System */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 backdrop-blur-md rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "relative flex items-center gap-2.5 px-6 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap overflow-hidden",
                  activeTab === tab.id 
                    ? "text-white shadow-lg shadow-indigo-100" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-indigo-600 z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <tab.icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{tab.label}</span>
                <span className={cn("relative z-10 ml-1 opacity-50", activeTab === tab.id ? "text-indigo-100" : "text-slate-300")}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
             <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Learning performance improved by 12%</span>
          </div>
        </div>

        {/* Quiz Grid */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filterQuizzes(data[`${activeTab}_quizzes` as keyof DashboardData] as Quiz[]).map((quiz, idx) => (
              <QuizCard key={quiz.id} quiz={quiz} type={activeTab} index={idx} />
            ))}
            
            {filterQuizzes(data[`${activeTab}_quizzes` as keyof DashboardData] as Quiz[]).length === 0 && (
              <div className="col-span-full py-20 text-center">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Layers className="w-10 h-10 text-slate-200" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 mb-1">No quizzes found</h3>
                 <p className="text-sm text-slate-400">Try adjusting your search or switching tabs.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function StatItem({ icon: Icon, value, label, color, trend, hideMobile }: any) {
  const themes: any = {
    orange: 'bg-orange-50 text-orange-600 ring-orange-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    purple: 'bg-purple-50 text-purple-600 ring-purple-100',
  }
  return (
    <div className={cn(
      "bg-white p-5 rounded-[2rem] border border-slate-100/80 shadow-sm flex items-center gap-4 hover:shadow-xl hover:-translate-y-1 transition-all group",
      hideMobile && "hidden md:flex"
    )}>
      <div className={cn("w-12 h-12 rounded-[1.2rem] flex items-center justify-center ring-4 transition-all group-hover:scale-110", themes[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
           <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{value}</p>
           {trend && <span className="text-[8px] font-black text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full">{trend}</span>}
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
      </div>
    </div>
  )
}

function QuizCard({ quiz, type, index }: { quiz: Quiz, type: string, index: number }) {
  const colors = ['bg-indigo-600', 'bg-slate-900', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-600']
  const color = colors[index % colors.length]
  
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="group relative h-full"
    >
      <Link to={`/quiz/${quiz.id}`} className="block h-full bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-indigo-500/10 transition-all overflow-hidden relative">
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-8">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", color)}>
              <Play className="w-6 h-6 fill-current" />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
               <Layers className="w-3 h-3 text-slate-400" />
               <span className="text-[10px] font-bold text-slate-500">{quiz.questions_count}</span>
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
              {quiz.title}
            </h3>
            <p className="text-xs font-medium text-slate-400 line-clamp-2 leading-relaxed">
              {quiz.description || 'Master this topic with personalized quiz sessions and AI-driven insights.'}
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
            <div className="flex -space-x-2">
              {[1,2,3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${quiz.id + i}`} alt="user" />
                </div>
              ))}
              <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400">
                +12
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-600">
               <span className="text-[10px] font-black uppercase tracking-widest">Start Now</span>
               <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        
        {/* Animated Background Element */}
        <div className={cn("absolute -bottom-12 -right-12 w-32 h-32 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700", color)} />
      </Link>
    </motion.div>
  )
}
"""

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
