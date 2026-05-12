import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Bell, Flame, Target, Clock, Award, LayoutGrid, Compass, BarChart3, User, ChevronRight, Hash, Zap, BrainCircuit, Filter, Layers, TrendingUp, X, Archive, PlusCircle, CheckCircle2, RotateCcw, Users, Play } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

interface Quiz {
  id: number
  title: string
  description: string
  cover_image: string | null
  questions_count: number
  tags: string[]
}

interface DashboardData {
  user: { id: number, username: string, email: string }
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
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const { setUser, setGamify } = useAppStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

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

  const createRoomMutation = useMutation({
    mutationFn: (quizId: number) => axios.post('/api/v1/quiz/room/create', { quiz_id: quizId }),
    onSuccess: (res) => navigate(`/room/${res.data.room_code}`)
  })

  const handleJoinRoom = async () => {
    if (!roomCode) return
    setIsJoining(true)
    try {
      await axios.post('/api/v1/quiz/room/join', { room_code: roomCode })
      navigate(`/room/${roomCode.toUpperCase()}`)
    } catch (e) {
      alert("Room not found or expired")
    } finally {
      setIsJoining(false)
    }
  }

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
      {/* 1. MOBILE HEADER - Premium Dynamic Style */}
      <div className="sticky top-0 z-[150] bg-white/80 backdrop-blur-xl border-b border-slate-100 md:hidden">
         <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 flex-shrink-0 animate-in zoom-in duration-500">
                  <BrainCircuit className="w-6 h-6" />
               </div>
               <div>
                  <h1 className="text-[14px] font-black text-slate-900 leading-none mb-1">Hello, {data.user?.username}</h1>
                  <div className="flex items-center gap-2">
                     <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded">LVL {data.gamify?.level}</span>
                     <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1"><Flame className="w-2.5 h-2.5 fill-orange-500" /> {data.gamify?.streak}D</span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <button 
                  onClick={() => setIsJoinModalOpen(true)}
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm transition-all active:scale-90"
               >
                  <Users className="w-5 h-5" />
               </button>
               <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Bell className="w-5 h-5" />
               </div>
            </div>
         </div>

         {/* Search & Tabs Mixed Row */}
         <div className="px-4 pb-4 space-y-3">
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Search your knowledge base..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full h-11 bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 text-xs font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
               />
            </div>
            
            <div className="flex items-center gap-2">
               <div className="flex-1 bg-slate-100/50 p-1 rounded-xl flex items-center border border-slate-100/50">
                  {['my', 'discover', 'archived'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("flex-1 py-2 rounded-lg text-[9px] font-black tracking-widest relative transition-all", activeTab === tab ? "text-indigo-600" : "text-slate-400")}>
                      {activeTab === tab && <motion.div layoutId="tabMarkerMob" className="absolute inset-0 bg-white shadow-sm rounded-lg" />}
                      <span className="relative z-10 uppercase">{tab === 'my' ? 'Mine' : (tab === 'discover' ? 'Explore' : 'Archive')}</span>
                    </button>
                  ))}
               </div>
               <button className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                  <Filter className="w-4 h-4" />
               </button>
            </div>
         </div>

         {/* Mobile Shared Tag Row */}
         <div className="px-4 pb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {allAvailableTags.map(t => (
               <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)} className={cn("px-4 py-1.5 border rounded-full text-[9px] font-black uppercase transition-all whitespace-nowrap", activeTag === t ? "bg-slate-900 border-slate-900 text-white shadow-md" : "bg-white border-slate-100 text-slate-400")}>
                 #{t}
               </button>
            ))}
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
            
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => setIsJoinModalOpen(true)}
                 className="flex items-center gap-2 px-6 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all shadow-sm"
               >
                  <Users className="w-5 h-5" />
                  Join Room
               </button>
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
                  {/* MOBILE PREMIUM LIST ITEM */}
                  <div className="md:hidden bg-white rounded-3xl border border-slate-100 p-4 shadow-sm active:scale-[0.97] transition-all relative overflow-hidden group">
                     <div className="flex items-center gap-4">
                        <Link to={`/quiz/${quiz.id}`} className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden shadow-lg transition-all relative">
                           {quiz.cover_image ? (
                             <img src={quiz.cover_image} alt="" className="w-full h-full object-cover" />
                           ) : (
                             <div className={cn(
                                "w-full h-full flex items-center justify-center text-white",
                                idx % 5 === 0 ? "bg-gradient-to-br from-indigo-500 to-purple-600" :
                                idx % 5 === 1 ? "bg-gradient-to-br from-rose-500 to-orange-600" :
                                idx % 5 === 2 ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
                                idx % 5 === 3 ? "bg-gradient-to-br from-blue-500 to-cyan-600" :
                                "bg-gradient-to-br from-amber-500 to-yellow-600"
                             )}>
                                <LayoutGrid className="w-7 h-7" />
                             </div>
                           )}
                        </Link>
                        <div className="flex-1 min-w-0">
                           <Link to={`/quiz/${quiz.id}`}>
                              <h3 className="text-[13px] font-black text-slate-900 leading-tight mb-1 truncate">{quiz.title}</h3>
                           </Link>
                           <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                 <BrainCircuit className="w-2.5 h-2.5 text-slate-400" />
                                 <span className="text-[8px] font-black text-slate-500 uppercase">{quiz.questions_count} QS</span>
                              </div>
                              {quiz.tags?.[0] && <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">#{quiz.tags[0]}</span>}
                           </div>
                        </div>
                        <Link to={`/quiz/${quiz.id}/play`} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all">
                           <Play className="w-5 h-5 fill-white" />
                        </Link>
                     </div>
                     
                     <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                        <div className="flex gap-2">
                           {activeTab === 'discover' ? (
                             <button onClick={() => enrollMutation.mutate(quiz.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100"><PlusCircle className="w-3 h-3" /> ADD</button>
                           ) : (
                             <>
                                <button onClick={() => createRoomMutation.mutate(quiz.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest"><Users className="w-3 h-3" /> HOST</button>
                                <button onClick={() => archiveMutation.mutate(quiz.id)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 text-slate-400">
                                   {activeTab === 'archived' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                </button>
                             </>
                           )}
                        </div>
                        <Link to={`/quiz/${quiz.id}`} className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-indigo-500 transition-colors">Details</Link>
                     </div>
                  </div>

                  {/* DESKTOP PREMIUM CARD */}
                  <div className="hidden md:block group h-full flex flex-col bg-white rounded-[2.5rem] border border-slate-100 p-9 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all relative overflow-hidden">
                     <div className="flex items-start justify-between mb-7">
                        <div className={cn(
                           "w-16 h-16 rounded-[1.5rem] overflow-hidden flex-shrink-0 shadow-lg transition-all",
                           !quiz.cover_image && (
                              idx % 5 === 0 ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-100" :
                              idx % 5 === 1 ? "bg-gradient-to-br from-rose-500 to-orange-600 shadow-rose-100" :
                              idx % 5 === 2 ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-100" :
                              idx % 5 === 3 ? "bg-gradient-to-br from-blue-500 to-cyan-600 shadow-blue-100" :
                              "bg-gradient-to-br from-amber-500 to-yellow-600 shadow-amber-100"
                           )
                        )}>
                           {quiz.cover_image ? (
                             <img src={quiz.cover_image} alt="" className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-white">
                               <LayoutGrid className="w-8 h-8" />
                             </div>
                           )}
                        </div>
                        <Link 
                           to={`/quiz/${quiz.id}/play`}
                           className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-100 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0"
                           title="Learn Now"
                        >
                           <Play className="w-6 h-6 fill-white" />
                        </Link>
                     </div>
                     <div className="flex-1">
                        <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight mb-3 truncate">{quiz.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                           {quiz.tags?.map(t => <span key={t} className="px-2.5 py-1 bg-slate-50 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">#{t}</span>)}
                        </div>
                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{quiz.questions_count} Questions</p>
                     </div>
                     <div className="mt-10 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                           {activeTab === 'discover' ? (
                             <button onClick={() => enrollMutation.mutate(quiz.id)} className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">ADD TO MINE</button>
                           ) : (
                             <>
                               <button 
                                 onClick={() => createRoomMutation.mutate(quiz.id)}
                                 className="px-4 py-3 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-xl hover:bg-indigo-100 transition-all uppercase flex items-center gap-2"
                               >
                                 <Users className="w-4 h-4" /> Host
                               </button>
                               <button onClick={() => archiveMutation.mutate(quiz.id)} className="px-6 py-3 bg-slate-100 text-slate-400 text-[10px] font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest">{activeTab === 'archived' ? 'RESTORE' : 'ARCHIVE'}</button>
                             </>
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

      {/* JOIN ROOM MODAL */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsJoinModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">Join Exam Room</h3>
                <button onClick={() => setIsJoinModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                   <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Enter Room Code</label>
                   <input 
                     type="text" 
                     placeholder="E.G. AZ78K"
                     value={roomCode}
                     onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                     className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-2xl font-black tracking-[0.3em] text-center text-indigo-600 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-200 placeholder:tracking-normal placeholder:text-sm"
                   />
                </div>
                
                <button 
                  onClick={handleJoinRoom}
                  disabled={!roomCode || isJoining}
                  className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none"
                >
                  {isJoining ? 'JOINING...' : 'JOIN NOW'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
