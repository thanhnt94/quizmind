import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Bell, Flame, Target, Clock, Award, LayoutGrid, Compass, BarChart3, User, ChevronRight, Hash, Zap, BrainCircuit, Filter, Layers, TrendingUp, X, Archive, PlusCircle, CheckCircle2, RotateCcw } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

interface Quiz {
  id: number
  title: string
  description: string
  questions_count: number
  tags: string[]
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
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const { setUser, setGamify } = useAppStore()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      setUser(res.data.user)
      setGamify(res.data.gamify)
      return res.data
    },
    retry: false
  })

  // Mutations
  const archiveMutation = useMutation({
    mutationFn: (quizId: number) => axios.post(`/api/v1/quiz/${quizId}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  })

  const enrollMutation = useMutation({
    mutationFn: (quizId: number) => axios.post(`/api/v1/quiz/${quizId}/enroll`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  })

  const allAvailableTags = useMemo(() => {
    if (!data) return []
    const tags = new Set<string>()
    const allQuizzes = [...data.my_quizzes, ...data.archived_quizzes, ...data.discover_quizzes]
    allQuizzes.forEach(q => q.tags?.forEach(t => tags.add(t)))
    return Array.from(tags).sort()
  }, [data])

  if (error || (data && (data as any).error)) {
    window.location.href = '/login'
    return null
  }

  if (isLoading || !data) return <div className="h-screen flex items-center justify-center font-black animate-pulse text-indigo-600 tracking-widest uppercase italic">Neural Sync...</div>

  const filterQuizzes = (quizzes: Quiz[]) => {
    return quizzes.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTag = !activeTag || q.tags?.includes(activeTag)
      return matchesSearch && matchesTag
    })
  }

  const filteredData = filterQuizzes(data[`${activeTab}_quizzes` as keyof DashboardData] as Quiz[])

  return (
    <div className="flex flex-col bg-[#F8FAFC] min-h-screen">
      {/* 1. MOBILE HEADER - Focused Input Row */}
      <div className="sticky top-0 z-[150] bg-[#F8FAFC]/95 backdrop-blur-xl border-b border-slate-100 md:hidden">
         <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 flex-shrink-0">
               <BrainCircuit className="w-5 h-5" />
            </div>
            <div className="flex-1 relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Search neural patterns..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full h-10 bg-slate-200/50 border border-slate-100/50 rounded-[1.1rem] pl-10 pr-4 text-[11px] font-black outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
               />
            </div>
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm flex-shrink-0">
               <User className="w-4.5 h-4.5" />
            </div>
         </div>

         {/* Mobile Shared Tabs Row */}
         <div className="px-4 pb-2">
            <div className="bg-slate-200/40 p-1 rounded-xl flex items-center border border-slate-100/50 shadow-inner">
               {['my', 'discover', 'archived'].map((tab) => (
                 <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("flex-1 py-2 rounded-lg text-[9px] font-black tracking-widest relative transition-all", activeTab === tab ? "text-indigo-600" : "text-slate-400")}>
                   {activeTab === tab && <motion.div layoutId="tabMarkerMob" className="absolute inset-0 bg-white shadow-sm rounded-lg" />}
                   <span className="relative z-10 uppercase">{tab === 'my' ? 'Mine' : (tab === 'discover' ? 'Explore' : 'Archive')}</span>
                 </button>
               ))}
            </div>
         </div>

         {/* Mobile Shared Tag Row */}
         <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
               <Filter className="w-3 h-3" />
            </div>
            <div className="flex items-center gap-1.5">
               {allAvailableTags.map(t => (
                 <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)} className={cn("px-3 py-1 border rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap", activeTag === t ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white border-slate-100 text-slate-400")}>
                   #{t}
                 </button>
               ))}
            </div>
         </div>
      </div>

      {/* 2. DESKTOP HEADER - High Density Clean Style */}
      <div className="hidden md:block">
         <div className="px-6 pt-12 pb-10 max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{data.gamify?.streak} Day Streak</span>
               </div>
               <div className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                  <Zap className="w-5 h-5 text-white" />
                  <span className="text-[11px] font-black text-white uppercase tracking-widest">Level {data.gamify?.level}</span>
               </div>
            </div>
            
            <div className="relative w-96">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
               <input 
                 type="text" 
                 placeholder="Quick search nodes..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-14 pr-6 h-14 bg-white border border-slate-100 rounded-2xl text-sm font-semibold outline-none focus:ring-8 focus:ring-indigo-500/5 shadow-sm transition-all"
               />
            </div>
         </div>

         {/* Desktop Tabs Area */}
         <div className="px-6 pb-12 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
               {['my', 'discover', 'archived'].map((tab) => (
                 <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "bg-white text-slate-400 border border-slate-100 hover:bg-slate-50")}>
                   {tab === 'my' ? 'My Collection' : (tab === 'discover' ? 'Explore New' : 'Archived')}
                 </button>
               ))}
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar opacity-60">
               <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <Filter className="w-3.5 h-3.5" />
               </div>
               <div className="flex items-center gap-2">
                  {allAvailableTags.map(t => (
                    <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)} className={cn("px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap", activeTag === t ? "bg-slate-900 text-white" : "bg-white border border-slate-100 text-slate-400 hover:bg-slate-50")}>#{t}</button>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* 3. SHARED FEED CONTENT */}
      <div className="px-4 md:px-6 md:pb-40 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
           <AnimatePresence mode="popLayout">
              {filteredData.map((quiz, idx) => (
                <motion.div key={quiz.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }}>
                  {/* MOBILE COMPACT CARD */}
                  <div className="md:hidden flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-2.5 shadow-sm active:scale-98 transition-all overflow-hidden relative w-full">
                     <Link to={`/quiz/${quiz.id}`} className="flex-1 flex items-center gap-3 min-w-0 z-10">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 shadow-inner">
                           <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <h3 className="text-[11px] font-black text-slate-900 truncate leading-tight">{quiz.title}</h3>
                           <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[8px] font-black text-slate-300 uppercase">{quiz.questions_count} Qs</span>
                              {quiz.tags?.[0] && <span className="text-[8px] font-black text-indigo-400 uppercase truncate max-w-[100px]">#{quiz.tags[0]}</span>}
                           </div>
                        </div>
                     </Link>
                     <div className="flex items-center gap-1.5 z-10">
                        {activeTab === 'discover' ? (
                          <button onClick={() => enrollMutation.mutate(quiz.id)} className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><PlusCircle className="w-4 h-4" /></button>
                        ) : (
                          <button onClick={() => archiveMutation.mutate(quiz.id)} className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", activeTab === 'archived' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400")}>
                             {activeTab === 'archived' ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-200" />
                     </div>
                  </div>

                  {/* DESKTOP PREMIUM CARD */}
                  <div className="hidden md:block group h-full flex flex-col bg-white rounded-[2.5rem] border border-slate-100 p-9 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all relative overflow-hidden">
                     <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner mb-7">
                        <LayoutGrid className="w-8 h-8" />
                     </div>
                     <div className="flex-1">
                        <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight mb-3 truncate">{quiz.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                           {quiz.tags?.map(t => <span key={t} className="px-2.5 py-1 bg-slate-50 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">#{t}</span>)}
                        </div>
                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{quiz.questions_count} Questions</p>
                     </div>
                     <div className="mt-10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           {activeTab === 'discover' ? (
                             <button onClick={() => enrollMutation.mutate(quiz.id)} className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">ADD TO MINE</button>
                           ) : (
                             <button onClick={() => archiveMutation.mutate(quiz.id)} className="px-6 py-3 bg-slate-100 text-slate-400 text-[10px] font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest">{activeTab === 'archived' ? 'RESTORE' : 'ARCHIVE'}</button>
                           )}
                           <Link to={`/quiz/${quiz.id}`} className="px-6 py-3 bg-white border border-slate-100 text-slate-900 text-[10px] font-black rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest">Details</Link>
                        </div>
                        <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-indigo-600 transition-all" />
                     </div>
                     <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
           </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
