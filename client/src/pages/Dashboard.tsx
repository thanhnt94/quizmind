import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Bell, Flame, Target, Clock, Award, LayoutGrid, Compass, BarChart3, User, ChevronRight, Hash, Zap, BrainCircuit, Filter, Layers, TrendingUp, X, Archive, PlusCircle, CheckCircle2, RotateCcw, Users, Play, ChevronLeft } from 'lucide-react'
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
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8 // Perfect for 4x2 grid on widescreen

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

  // Dynamically lock body and html overflow only on desktop for Dashboard page
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

  // Reset pagination when filter parameters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, activeTag])

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
      🚀 NEURAL SYNCING...
    </div>
  )

  return (
    <div className="flex flex-col bg-gradient-to-br from-[#f8fafc] via-[#f1f6fa] to-[#f8fafc] min-h-[calc(100vh-6rem)] md:min-h-0 md:h-full md:overflow-hidden">
      
      {/* Background soft glowing pastel blobs to make dashboard extremely tasty */}
      <div className="absolute top-[20%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-200/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-pink-200/10 blur-[130px] pointer-events-none" />

      {/* 1. MOBILE HEADER - Premium Dynamic Style */}
      <div className="sticky top-0 z-[150] bg-white/80 backdrop-blur-xl border-b border-slate-100 md:hidden flex-shrink-0">
         <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-100 flex-shrink-0">
                  <BrainCircuit className="w-6 h-6 animate-pulse" />
               </div>
               <div>
                  <h1 className="text-[13px] font-black text-slate-800 leading-none mb-1">Chào {data.user?.username}! 👋</h1>
                  <div className="flex items-center gap-1.5">
                     <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-lg border border-indigo-100/50">LVL {data.gamify?.level}</span>
                     <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-lg border border-orange-100/50 flex items-center gap-0.5">
                       🔥 {data.gamify?.streak}D
                     </span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
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
                 placeholder="Tìm kiếm bộ đề trắc nghiệm..." 
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
                      <span className="relative z-10 uppercase">{tab === 'my' ? 'BỘ ĐỀ CỦA TÔI' : (tab === 'discover' ? 'KHÁM PHÁ' : 'LƯU TRỮ')}</span>
                    </button>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* 2. DESKTOP WIDESCREEN DUAL COLUMN LAYOUT (Zero Page Scroll, Locked Sidebars, Infinite Widescreen!) */}
      <div className="hidden md:flex w-full h-full overflow-hidden px-8 py-6 gap-8">
        
        {/* 🖥️ LEFT COLUMN: THE PREMIUM HIGH-DENSITY SIDEBAR (Locked & Sticky) */}
        <aside className="w-80 flex-shrink-0 flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-6 scrollbar-thin">
          
          {/* User welcome panel & gamify stats stacked card */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col gap-5 text-left relative overflow-hidden flex-shrink-0">
            <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-indigo-50/40 blur-md pointer-events-none" />
            
            <div className="flex items-center gap-3.5 z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md text-2xl shadow-indigo-100">
                👋
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Xin chào</span>
                <h2 className="text-base font-black text-slate-800 leading-tight mt-0.5 truncate max-w-[170px]">
                  {data.user?.username}
                </h2>
              </div>
            </div>

            {/* Stacked gamification metrics */}
            <div className="flex flex-col gap-2.5 mt-1">
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-orange-50 to-amber-50/50 border border-orange-100 rounded-2xl shadow-sm shadow-orange-50/20">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Chuỗi Streak</span>
                </div>
                <span className="text-xs font-black text-orange-600 bg-white px-2.5 py-1 rounded-xl border border-orange-200">{data.gamify?.streak} Ngày 🔥</span>
              </div>
              
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50/50 border border-indigo-100 rounded-2xl shadow-sm shadow-indigo-50/20">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cấp Độ Học</span>
                </div>
                <span className="text-xs font-black text-indigo-600 bg-white px-2.5 py-1 rounded-xl border border-indigo-200">Cấp {data.gamify?.level} ⭐</span>
              </div>
            </div>
          </div>

          {/* Quick Action & Search panel */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4 text-left flex-shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tìm kiếm & Thao tác</span>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm nhanh bộ đề..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner"
              />
            </div>

            <button 
              onClick={() => setIsJoinModalOpen(true)}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <Users className="w-4 h-4 text-white" />
              Vào Phòng Thi Đấu
            </button>
          </div>

          {/* Vertical Filter Tags in Sidebar */}
          {allAvailableTags.length > 0 && (
            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col gap-3.5 text-left flex-shrink-0">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lọc theo chủ đề</span>
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

        {/* 🖥️ RIGHT COLUMN: MAIN CONTENT (Scroll-isolated Quiz Card Grid + Sticky Footer Pagination!) */}
        <section className="flex-1 h-full flex flex-col gap-5 overflow-hidden text-left">
          
          {/* 🖥️ UNIFIED TABS & PAGINATION TOOLBAR - Elite Widescreen Design */}
          <div className="flex-shrink-0 bg-white border border-slate-200/60 p-2 rounded-2xl shadow-sm flex items-center justify-between gap-4">
            
            {/* Left: Tab Switcher */}
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
                  {tab === 'my' ? 'Bộ đề của tôi' : (tab === 'discover' ? 'Khám phá mới' : 'Đã lưu trữ')}
                </button>
              ))}
            </div>

            {/* Middle: Premium Stats Indicator */}
            <div className="hidden xl:block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center truncate">
              {filteredData.length === 0 
                ? "Không có bộ đề" 
                : `Đang xem ${ (currentPage - 1) * itemsPerPage + 1 } - ${ Math.min(currentPage * itemsPerPage, filteredData.length) } của ${ filteredData.length } đề`
              }
            </div>

            {/* Right: Paginator Controls */}
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

          {/* Scrollable Quiz Card Grid Container (Scrollbar lives exclusively here!) */}
          <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin">
            {filteredData.length === 0 ? (
              <div className="w-full bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
                <span className="text-4xl mb-4">🔍</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Không tìm thấy bộ đề</h3>
                <p className="text-xs text-slate-400">Hãy thử thay đổi từ khóa hoặc bộ lọc thẻ xem sao nhé.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-6">
                 <AnimatePresence mode="popLayout">
                    {paginatedData.map((quiz, idx) => (
                      <motion.div key={quiz.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.02 }}>
                        
                        {/* DESKTOP PREMIUM CARD - Extremely Tasty Design */}
                        <div className="group h-full flex flex-col justify-between bg-white rounded-[2rem] border border-slate-200/50 p-6.5 shadow-sm hover:shadow-xl hover:shadow-indigo-100/20 hover:-translate-y-1.5 transition-all relative overflow-hidden text-left">
                           
                           {/* Background subtle cover header gradient */}
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
                                <Link 
                                   to={`/quiz/${quiz.id}/play`}
                                   className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 hover:scale-110 active:scale-95 transition-all"
                                   title="Làm đề trắc nghiệm ngay"
                                >
                                   <Play className="w-4 h-4 fill-white ml-0.5" />
                                </Link>
                             </div>

                             <div className="flex-1">
                                <h3 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug mb-2.5 truncate">{quiz.title}</h3>
                                <div className="flex flex-wrap gap-1.5 mb-3.5">
                                   {quiz.tags?.map(t => <span key={t} className="px-2 py-0.5 bg-slate-50 border border-slate-200/50 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-wider">#{t}</span>)}
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <BrainCircuit className="w-3.5 h-3.5 text-slate-400" />
                                  {quiz.questions_count} câu hỏi trắc nghiệm
                                </p>
                             </div>
                           </div>

                           <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-2">
                                 {activeTab === 'discover' ? (
                                   <button onClick={() => enrollMutation.mutate(quiz.id)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black rounded-xl transition-all shadow-md shadow-indigo-100 uppercase tracking-wider">Nhận bộ đề</button>
                                 ) : (
                                   <>
                                     <button 
                                       onClick={() => createRoomMutation.mutate(quiz.id)}
                                       className="px-4 py-2.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-xl hover:bg-indigo-100 transition-all uppercase flex items-center gap-1.5 border border-indigo-100/50"
                                     >
                                       <Users className="w-3.5 h-3.5" /> Host
                                     </button>
                                     <button onClick={() => archiveMutation.mutate(quiz.id)} className="px-4 py-2.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest border border-slate-200/50">{activeTab === 'archived' ? 'Phục hồi' : 'Lưu trữ'}</button>
                                   </>
                                 )}
                                 <Link to={`/quiz/${quiz.id}`} className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[9px] font-black rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest">Chi tiết</Link>
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

      {/* 3. SHARED MOBILE FEED CONTENT (Keeps original scroll flow for mobile) */}
      <div className="md:hidden px-4 w-full mt-4 flex-grow">
        {filteredData.length === 0 ? (
          <div className="w-full bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
            <span className="text-4xl mb-4">🔍</span>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">Không tìm thấy bộ đề</h3>
            <p className="text-xs text-slate-400">Hãy thử thay đổi từ khóa.</p>
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
                         <Link to={`/quiz/${quiz.id}/play`} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 active:scale-90 transition-all">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                         </Link>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                         <div className="flex gap-1.5">
                            {activeTab === 'discover' ? (
                              <button onClick={() => enrollMutation.mutate(quiz.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest shadow-sm"><PlusCircle className="w-3 h-3" /> Nhận đề</button>
                            ) : (
                              <>
                                 <button onClick={() => createRoomMutation.mutate(quiz.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest border border-indigo-100/50"><Users className="w-3 h-3" /> Host</button>
                                 <button onClick={() => archiveMutation.mutate(quiz.id)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-200/50">
                                    {activeTab === 'archived' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                 </button>
                              </>
                            )}
                         </div>
                         <Link to={`/quiz/${quiz.id}`} className="text-[9px] font-black text-slate-400 uppercase hover:text-indigo-500 transition-colors">Chi tiết</Link>
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
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Vào Phòng Đấu Trường</h3>
                <button onClick={() => setIsJoinModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                   <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nhập mã phòng đấu</label>
                   <input 
                     type="text" 
                     placeholder="Ví dụ: AZ78K"
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
                  {isJoining ? 'ĐANG KẾT NỐI...' : 'VÀO PHÒNG NGAY'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
