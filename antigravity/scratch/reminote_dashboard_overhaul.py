import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Bell, Flame, Target, Clock, Award, LayoutGrid, Compass, BarChart3, User, ChevronRight, Hash, Zap } from 'lucide-react'
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

  if (isLoading || !data) return <div className="h-screen flex items-center justify-center font-black animate-pulse text-indigo-600 tracking-widest uppercase">Syncing Ecosystem...</div>

  const filterQuizzes = (quizzes: Quiz[]) => 
    quizzes.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      {/* RemiNote Inspired Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-[1.5rem] bg-white shadow-lg shadow-indigo-100 flex items-center justify-center p-1 border border-slate-100 overflow-hidden">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-lg border-2 border-white">
                   LV.{data.gamify.level}
                </div>
              </div>
              <div>
                 <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Quiz Center</h1>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {data.gamify.xp} XP • {data.gamify.streak} DAY STREAK
                 </p>
              </div>
           </div>
           <button className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 relative active:scale-90 transition-all">
              <Bell className="w-5 h-5" />
              {data.unread_count > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />}
           </button>
        </div>
      </div>

      {/* Hero Stats (RemiNote Horizontal Cards) */}
      <div className="px-6 overflow-x-auto no-scrollbar flex items-center gap-3 mb-8">
         <StatPill icon={Flame} value={data.gamify.streak} label="Streak" color="text-orange-500" bg="bg-orange-50" />
         <StatPill icon={Target} value={`${data.stats_summary.avg_accuracy}%`} label="Accuracy" color="text-emerald-500" bg="bg-emerald-50" />
         <StatPill icon={Zap} value={data.gamify.xp} label="Progress" color="text-indigo-500" bg="bg-indigo-50" />
      </div>

      <div className="px-6 max-w-6xl mx-auto">
        {/* Simple Search */}
        <div className="relative mb-8">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
           <input 
             type="text" 
             placeholder="Search quizzes..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full pl-14 pr-6 h-14 bg-white rounded-[1.5rem] border border-slate-100 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
           />
        </div>

        {/* RemiNote Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-slate-100/50 p-1 rounded-2xl border border-slate-100">
           {['my', 'archived', 'discover'].map((tab) => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={cn(
                 "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
               )}
             >
               {tab === 'my' ? 'Mine' : (tab === 'archived' ? 'Archive' : 'Discover')}
             </button>
           ))}
        </div>

        {/* Quiz List (RemiNote Big Cards Style) */}
        <div className="space-y-4">
           {filterQuizzes(data[`${activeTab}_quizzes` as keyof DashboardData] as Quiz[]).map((quiz) => (
             <Link 
               key={quiz.id}
               to={`/quiz/${quiz.id}`}
               className="group block bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden"
             >
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                        <LayoutGrid className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{quiz.title}</h3>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{quiz.questions_count} Questions</p>
                     </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
               </div>
               
               <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-slate-50 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-colors">#QUIZ</span>
                  {activeTab === 'discover' && <span className="px-3 py-1 bg-emerald-50 rounded-lg text-[9px] font-black text-emerald-500 uppercase tracking-widest">NEW</span>}
                  {activeTab === 'archived' && <span className="px-3 py-1 bg-amber-50 rounded-lg text-[9px] font-black text-amber-500 uppercase tracking-widest">ARCHIVED</span>}
               </div>
               
               {/* Squircle corner element */}
               <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-50 rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-700" />
             </Link>
           ))}
           
           {filterQuizzes(data[`${activeTab}_quizzes` as keyof DashboardData] as Quiz[]).length === 0 && (
             <div className="py-20 text-center">
                <div className="w-20 h-20 bg-white rounded-[2rem] border border-slate-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                   <Hash className="w-10 h-10 text-slate-100" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Nothing here yet</h3>
                <p className="text-sm text-slate-400">Empty as a blank flashcard.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  )
}

function StatPill({ icon: Icon, value, label, color, bg }: any) {
  return (
    <div className={cn("flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm")}>
       <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner", bg)}>
          <Icon className={cn("w-5 h-5", color)} />
       </div>
       <div>
          <p className="text-lg font-black text-slate-900 leading-none">{value}</p>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
       </div>
    </div>
  )
}
