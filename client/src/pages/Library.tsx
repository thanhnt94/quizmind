import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Target, LayoutGrid, BarChart3, User, ChevronRight, Filter, Archive, RotateCcw, Users, Play, ChevronLeft, Info, BrainCircuit, X, CheckCircle2 } from 'lucide-react'
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
}

interface ActiveGoal {
  goal_id: number
  quiz_id: number
  quiz_title: string
  cover_image: string | null
  total_questions: number
  total_learned: number
  daily_target: number
  done_today: number
  is_target_met: boolean
  streak_count: number
  days_remaining_est: number
}

export default function Library() {
  const [activeTab, setActiveTab] = useState<'my' | 'discover' | 'archived'>('my')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  
  // Goals State
  const [selectedGoalQuiz, setSelectedGoalQuiz] = useState<Quiz | null>(null)
  const [dailyTargetInput, setDailyTargetInput] = useState(5)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8 

  const { setUser, setGamify } = useAppStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: activeGoals } = useQuery<ActiveGoal[]>({
    queryKey: ['activeGoals'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/quiz/goals/active')
      return res.data
    }
  })

  const setGoalMutation = useMutation({
    mutationFn: (args: { quiz_id: number, daily_target: number }) => axios.post('/api/v1/quiz/goals', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeGoals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })

  const removeGoalMutation = useMutation({
    mutationFn: (quizId: number) => axios.post('/api/v1/quiz/goals/remove', { quiz_id: quizId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeGoals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })

  const handleOpenGoalModal = (quiz: Quiz) => {
    setSelectedGoalQuiz(quiz)
    const existing = activeGoals?.find(g => g.quiz_id === quiz.id)
    setDailyTargetInput(existing ? existing.daily_target : 5)
    setIsGoalModalOpen(true)
  }

  const handleSaveGoal = () => {
    if (!selectedGoalQuiz) return
    setGoalMutation.mutate({
      quiz_id: selectedGoalQuiz.id,
      daily_target: dailyTargetInput
    }, {
      onSuccess: () => {
        setIsGoalModalOpen(false)
      }
    })
  }

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

  // Lock body overflow on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        document.body.style.overflow = 'hidden'
        document.body.style.height = '100vh'
        document.documentElement.style.overflow = 'hidden'
        document.documentElement.style.height = '100vh'
      } else {
        document.body.style.overflow = ''
        document.body.style.height = ''
        document.documentElement.style.overflow = ''
        document.documentElement.style.height = ''
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.body.style.overflow = ''
      document.body.style.height = ''
      document.documentElement.style.overflow = ''
      document.documentElement.style.height = ''
    }
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, activeTag])

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
    const tags = new Set<string>()
    const allQuizzes = data ? [...data.my_quizzes, ...data.archived_quizzes, ...data.discover_quizzes] : []
    allQuizzes.forEach(q => q.tags?.forEach(t => tags.add(t)))
    const list = Array.from(tags)
    if (list.length === 0) {
      return ['JLPT', 'N2', 'N3', 'Vocabulary', 'Grammar']
    }
    return list.sort()
  }, [data])

  const filteredData = useMemo(() => {
    if (!data) return []
    const quizzes = (data[`${activeTab}_quizzes` as keyof DashboardData] || []) as Quiz[]
    return quizzes.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTag = !activeTag || q.tags?.includes(activeTag)
      return matchesSearch && matchesTag
    })
  }, [data, activeTab, searchQuery, activeTag])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredData.length / itemsPerPage))
  }, [filteredData])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  if (error || (data && (data as any).error)) {
    window.location.href = '/login'
    return null
  }

  if (isLoading || !data) return (
    <div className="h-screen flex items-center justify-center font-black animate-pulse text-indigo-600 tracking-widest uppercase italic bg-[#fafbfd]">
      📚 LOADING LIBRARY...
    </div>
  )

  return (
    <div className="flex flex-col bg-gradient-to-br from-[#f8fafc] via-[#f1f6fa] to-[#f8fafc] min-h-[calc(100vh-6rem)] md:min-h-0 md:h-full md:overflow-hidden">
      
      {/* Background blobs */}
      <div className="absolute top-[20%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-200/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-pink-200/10 blur-[130px] pointer-events-none" />

      {/* MOBILE HEADER */}
      <div className="sticky top-0 z-[150] bg-white/80 backdrop-blur-xl border-b border-slate-100 md:hidden flex-shrink-0">
         <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-100 flex-shrink-0">
                  <BrainCircuit className="w-6 h-6" />
               </div>
               <div>
                  <h1 className="text-[13px] font-black text-slate-800 leading-none mb-1">Thư viện bộ câu hỏi 📚</h1>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Tìm kiếm & Khám phá</span>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <Link 
                  to="/manage"
                  className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 shadow-sm active:scale-90 transition-all font-black text-[10px]"
                  title="Creator Studio"
               >
                  <Plus className="w-5 h-5" />
               </Link>
               <button 
                  onClick={() => setIsJoinModalOpen(true)}
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 shadow-sm active:scale-90 transition-all"
               >
                  <Users className="w-5 h-5" />
               </button>
            </div>
         </div>

         {/* Search & Tabs Mixed Row */}
         <div className="px-4 pb-4 space-y-3">
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                  type="text" 
                  placeholder="Tìm kiếm bộ đề..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 text-xs font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner"
               />
            </div>
            
            <div className="flex items-center gap-2">
               <div className="flex-1 bg-slate-100/60 p-1 rounded-2xl flex items-center border border-slate-200/50">
                  {['my', 'discover', 'archived'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("flex-1 py-2 rounded-xl text-[9px] font-black tracking-widest relative transition-all", activeTab === tab ? "text-indigo-600" : "text-slate-400")}>
                      {activeTab === tab && <motion.div layoutId="tabMarkerMob" className="absolute inset-0 bg-white shadow-sm rounded-xl border border-slate-100" />}
                      <span className="relative z-10 uppercase">{tab === 'my' ? 'CỦA TÔI' : (tab === 'discover' ? 'KHÁM PHÁ' : 'ĐÃ LƯU')}</span>
                    </button>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex w-full h-full overflow-hidden px-8 py-6 gap-8">
        
        {/* LEFT COLUMN: Tags filter & actions sidebar */}
        <aside className="w-80 flex-shrink-0 flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-6 scrollbar-thin">
          
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col gap-5 text-left relative overflow-hidden flex-shrink-0">
            <div className="flex items-center gap-3.5 z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md text-2xl">
                📚
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 leading-tight">Thư viện bộ câu hỏi</h2>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block">Library Studio</span>
              </div>
            </div>
            
            <Link 
              to="/manage"
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Creator Studio
            </Link>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4 text-left flex-shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search & Arena</span>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm bộ đề..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
              />
            </div>
            <button 
              onClick={() => setIsJoinModalOpen(true)}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Users className="w-4 h-4" />
              Enter Arena Room
            </button>
          </div>

          {allAvailableTags.length > 0 && (
            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col gap-3.5 text-left flex-shrink-0">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lọc theo tag</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allAvailableTags.map(t => (
                  <button 
                    key={t} 
                    onClick={() => setActiveTag(activeTag === t ? null : t)} 
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all border", 
                      activeTag === t 
                        ? "bg-slate-800 border-slate-800 text-white shadow-sm" 
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: Decks grid */}
        <section className="flex-1 h-full flex flex-col gap-5 overflow-hidden text-left">
          
          <div className="flex-shrink-0 bg-white border border-slate-200/60 p-2 rounded-2xl shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/30 flex-shrink-0">
              {['my', 'discover', 'archived'].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab as any)} 
                  className={cn(
                    "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
                    activeTab === tab 
                      ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab === 'my' ? 'Đề của tôi' : (tab === 'discover' ? 'Khám phá mới' : 'Đã lưu trữ')}
                </button>
              ))}
            </div>

            <div className="hidden xl:block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center truncate">
              {filteredData.length === 0 
                ? "Không tìm thấy bộ đề" 
                : `Hiển thị ${ (currentPage - 1) * itemsPerPage + 1 } - ${ Math.min(currentPage * itemsPerPage, filteredData.length) } của ${ filteredData.length } bộ đề`
              }
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 h-8.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Trước
              </button>
              
              <div className="flex items-center gap-1">
                {getPageNumbers().map((p, idx) => (
                  p === '...' ? (
                    <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-slate-400">...</span>
                  ) : (
                    <button 
                      key={`page-${p}`}
                      onClick={() => setCurrentPage(Number(p))}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all",
                        currentPage === p 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                          : "text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {p}
                    </button>
                  )
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 h-8.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
              >
                Sau <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin">
            {filteredData.length === 0 ? (
              <div className="w-full bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
                <span className="text-4xl mb-4">🔍</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Không tìm thấy bộ đề nào</h3>
                <p className="text-xs text-slate-400">Hãy thử từ khóa khác hoặc xóa bộ lọc tag.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-6">
                 <AnimatePresence mode="popLayout">
                    {paginatedData.map((quiz, idx) => (
                      <motion.div key={quiz.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.02 }}>
                        
                        <div className="group h-full flex flex-col justify-between bg-white rounded-[2rem] border border-slate-200/50 p-6.5 shadow-sm hover:shadow-xl hover:shadow-indigo-100/20 hover:-translate-y-1.5 transition-all relative overflow-hidden text-left">
                           <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />

                           <div>
                             <div className="flex items-start justify-between mb-5 mt-1">
                                <div className={cn(
                                   "w-14 h-14 rounded-[1.25rem] overflow-hidden flex-shrink-0 shadow-md transition-all",
                                   !quiz.cover_image && (
                                      idx % 5 === 0 ? "bg-gradient-to-br from-indigo-400 to-purple-500 shadow-indigo-100" :
                                      idx % 5 === 1 ? "bg-gradient-to-br from-rose-400 to-orange-500 shadow-rose-100" :
                                      idx % 5 === 2 ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-100" :
                                      idx % 5 === 3 ? "bg-gradient-to-br from-blue-400 to-cyan-500 shadow-blue-100" :
                                      "bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-100"
                                   )
                                )}>
                                   {quiz.cover_image ? (
                                     <img src={quiz.cover_image} alt="" className="w-full h-full object-cover" />
                                   ) : (
                                     <div className="w-full h-full flex items-center justify-center text-white">
                                       <LayoutGrid className="w-7 h-7" />
                                     </div>
                                   )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Link 
                                     to={`/quiz/${quiz.id}/play`}
                                     className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 hover:scale-110 active:scale-95 transition-all"
                                     title="Bắt đầu học"
                                  >
                                     <Play className="w-4 h-4 fill-white ml-0.5" />
                                  </Link>
                                </div>
                             </div>

                             <div className="flex-1">
                                <h3 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug mb-2.5 truncate">{quiz.title}</h3>
                                <div className="flex flex-wrap gap-1.5 mb-3.5">
                                   {quiz.tags?.map(t => <span key={t} className="px-2 py-0.5 bg-slate-50 border border-slate-200/50 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-wider">#{t}</span>)}
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <BrainCircuit className="w-3.5 h-3.5 text-slate-400" />
                                  {quiz.questions_count} câu hỏi
                                </p>
                             </div>
                           </div>

                           <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-2">
                                  {activeTab === 'discover' ? (
                                    <button 
                                      onClick={() => enrollMutation.mutate(quiz.id)} 
                                      className="w-9 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center transition-all shadow-md shadow-indigo-100 active:scale-95 hover:scale-105"
                                      title="Đăng ký học bộ này"
                                    >
                                      <Plus className="w-4.5 h-4.5" />
                                    </button>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => createRoomMutation.mutate(quiz.id)}
                                        className="w-9 h-9 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100/50 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 hover:scale-105"
                                        title="Tạo phòng Arena"
                                      >
                                        <Users className="w-4 h-4" />
                                      </button>
                                      {activeTab === 'my' && (
                                        <button 
                                          onClick={() => handleOpenGoalModal(quiz)}
                                          className="w-9 h-9 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 hover:scale-105"
                                          title="Đặt mục tiêu học tập"
                                        >
                                          <Target className="w-4 h-4" />
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => archiveMutation.mutate(quiz.id)} 
                                        className="w-9 h-9 bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/50 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 hover:scale-105"
                                        title={activeTab === 'archived' ? 'Khôi phục bộ đề' : 'Lưu trữ bộ đề'}
                                      >
                                        {activeTab === 'archived' ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                      </button>
                                    </>
                                  )}
                                  <Link 
                                    to={`/quiz/${quiz.id}`} 
                                    className="w-9 h-9 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 hover:scale-105"
                                    title="Chi tiết bộ đề"
                                  >
                                    <Info className="w-4 h-4" />
                                  </Link>
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-all" />
                           </div>
                        </div>

                      </motion.div>
                    ))}
                 </AnimatePresence>
              </div>
            )}
          </div>

        </section>

      </div>

      {/* MOBILE FEED CONTENT */}
      <div className="md:hidden px-4 w-full mt-4 flex-grow space-y-4 pb-20">
        {filteredData.length === 0 ? (
          <div className="w-full bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="text-4xl mb-4">🔍</span>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Không tìm thấy bộ đề nào</h3>
            <p className="text-xs text-slate-400">Hãy thử từ khóa khác hoặc thay đổi bộ lọc.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
               {filteredData.map((quiz, idx) => (
                 <motion.div key={quiz.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }}>
                   <div className="bg-white rounded-[1.75rem] border border-slate-200/60 p-4.5 shadow-sm active:scale-[0.97] transition-all relative overflow-hidden flex flex-col gap-3">
                      <div className="flex items-center gap-4 text-left">
                         <Link to={`/quiz/${quiz.id}`} className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden shadow-md transition-all relative">
                            {quiz.cover_image ? (
                              <img src={quiz.cover_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className={cn(
                                 "w-full h-full flex items-center justify-center text-white",
                                 idx % 5 === 0 ? "bg-gradient-to-br from-indigo-400 to-purple-500" :
                                 idx % 5 === 1 ? "bg-gradient-to-br from-rose-400 to-orange-500" :
                                 idx % 5 === 2 ? "bg-gradient-to-br from-emerald-400 to-teal-500" :
                                 idx % 5 === 3 ? "bg-gradient-to-br from-blue-400 to-cyan-500" :
                                 "bg-gradient-to-br from-amber-400 to-yellow-500"
                              )}>
                                 <LayoutGrid className="w-6 h-6" />
                              </div>
                            )}
                         </Link>
                         <div className="flex-1 min-w-0">
                            <Link to={`/quiz/${quiz.id}`}>
                               <h3 className="text-[13px] font-black text-slate-800 leading-tight mb-1 truncate">{quiz.title}</h3>
                            </Link>
                            <div className="flex items-center gap-2">
                               <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                  <BrainCircuit className="w-2.5 h-2.5 text-slate-400" />
                                  <span className="text-[8px] font-black text-slate-500 uppercase">{quiz.questions_count} câu hỏi</span>
                                </div>
                               {quiz.tags?.[0] && <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">#{quiz.tags[0]}</span>}
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <Link 
                             to={`/quiz/${quiz.id}/play`} 
                             className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 active:scale-90 transition-all"
                             title="Bắt đầu học"
                           >
                              <Play className="w-4 h-4 fill-white ml-0.5" />
                           </Link>
                         </div>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                         <div className="flex gap-1.5">
                            {activeTab === 'discover' ? (
                              <button 
                                onClick={() => enrollMutation.mutate(quiz.id)} 
                                className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm active:scale-95"
                                title="Đăng ký học"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <>
                                 <button 
                                   onClick={() => createRoomMutation.mutate(quiz.id)} 
                                   className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/50 flex items-center justify-center active:scale-95"
                                   title="Tạo phòng Arena"
                                 >
                                   <Users className="w-3.5 h-3.5" />
                                 </button>
                                 {activeTab === 'my' && (
                                   <button 
                                     onClick={() => handleOpenGoalModal(quiz)}
                                     className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 border border-amber-200/50 flex items-center justify-center active:scale-95"
                                     title="Đặt mục tiêu học tập"
                                   >
                                     <Target className="w-3.5 h-3.5" />
                                   </button>
                                 )}
                                 <button 
                                   onClick={() => archiveMutation.mutate(quiz.id)} 
                                   className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 border border-slate-200/50 flex items-center justify-center active:scale-95"
                                   title={activeTab === 'archived' ? 'Khôi phục' : 'Lưu trữ'}
                                 >
                                    {activeTab === 'archived' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                 </button>
                              </>
                            )}
                         </div>
                         <Link 
                            to={`/quiz/${quiz.id}`} 
                            className="w-8 h-8 rounded-full bg-white text-slate-600 border border-slate-200/50 flex items-center justify-center active:scale-95"
                            title="Chi tiết"
                         >
                            <Info className="w-3.5 h-3.5" />
                         </Link>
                      </div>
                   </div>
                 </motion.div>
               ))}
            </AnimatePresence>
          </div>
        )}
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
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Enter Arena Room</h3>
                <button onClick={() => setIsJoinModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                   <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Enter Arena Room Code</label>
                   <input 
                     type="text" 
                     placeholder="e.g. AZ78K"
                     value={roomCode}
                     onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                     className="w-full h-16 bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 text-2xl font-black tracking-[0.3em] text-center text-indigo-600 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-sm"
                   />
                </div>
                
                <button 
                  onClick={handleJoinRoom}
                  disabled={!roomCode || isJoining}
                  className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none"
                >
                  {isJoining ? 'CONNECTING...' : 'ENTER ROOM NOW'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* SET DAILY GOAL MODAL */}
        {isGoalModalOpen && selectedGoalQuiz && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsGoalModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl relative z-10 p-8 border border-slate-100 text-left"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">🎯 Set Daily Study Goal</h3>
                <button onClick={() => setIsGoalModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                   <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-black text-indigo-600 leading-snug">{selectedGoalQuiz.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Total questions: {selectedGoalQuiz.questions_count}</p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Daily target questions</label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[5, 10, 15, 20].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setDailyTargetInput(val)}
                        className={cn(
                          "h-10 rounded-xl text-xs font-black uppercase transition-all border",
                          dailyTargetInput === val
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {val} qs
                      </button>
                    ))}
                  </div>

                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    placeholder="Custom amount..."
                    value={dailyTargetInput || ''}
                    onChange={(e) => setDailyTargetInput(parseInt(e.target.value) || 0)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all text-center"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleSaveGoal}
                    disabled={dailyTargetInput <= 0}
                    className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none uppercase tracking-widest text-xs"
                  >
                    Save Study Goal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
