import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Award, BookOpen, Search, StickyNote, BarChart2, Settings, Edit2, X, Save, Brain, HelpCircle, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface Question {
  id: number
  content: string
  orig_index: number
  stats: { total: number, correct: number, wrong: number }
}

export default function QuizDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAppStore()
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [editTab, setEditTab] = useState<'props' | 'collabs'>('props')
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])

  useEffect(() => {
    if (id === 'import') {
      navigate('/manage', { replace: true })
    }
  }, [id, navigate])

  useEffect(() => {
    if (isEditModalOpen && editTab === 'collabs') {
      fetchCollaborators()
    }
  }, [isEditModalOpen, editTab])

  const fetchCollaborators = async () => {
    try {
      const res = await axios.get(`/api/v1/quiz/${id}/collaborators`)
      setCollaborators(res.data)
    } catch (e) {}
  }

  const handleSearchUsers = async (q: string) => {
    setUserSearch(q)
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    try {
      const res = await axios.get(`/api/v1/quiz/users/search`, { params: { q } })
      setSearchResults(res.data)
    } catch (e) {}
  }

  const addCollaborator = async (userId: number) => {
    try {
      await axios.post(`/api/v1/quiz/${id}/collaborators`, { user_id: userId })
      fetchCollaborators()
      setUserSearch('')
      setSearchResults([])
    } catch (e) {
      alert("Error adding collaborator!")
    }
  }

  const removeCollaborator = async (userId: number) => {
    try {
      await axios.delete(`/api/v1/quiz/${id}/collaborators/${userId}`)
      fetchCollaborators()
    } catch (e) {
      alert("Error removing collaborator!")
    }
  }

  const { data: quiz } = useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${id}/data`) // Need this endpoint
      return res.data
    }
  })

  const { data: masteryData } = useQuery({
    queryKey: ['quiz-mastery', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/quizzes/${id}/mastery`)
      return res.data
    }
  })

  const { data: notes } = useQuery({
    queryKey: ['quiz-notes', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${id}/notes`)
      return res.data
    }
  })

  const { data: sessionData } = useQuery({
    queryKey: ['quiz-session', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${id}/session`)
      return res.data
    }
  })

  const { 
    data: questionsData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['quiz-questions', id, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axios.get(`/api/v1/quiz/${id}/questions`, {
        params: { page: pageParam, size: 50, search: searchQuery }
      })
      return res.data
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentLoaded = allPages.length * 50
      return currentLoaded < lastPage.total ? allPages.length + 1 : undefined
    },
    initialPageParam: 1
  })

  const allQuestions = questionsData?.pages.flatMap(p => p.questions) || []

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile Header */}
      <nav className="fixed top-0 left-0 right-0 z-[120] bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-4 py-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-indigo-600 shadow-sm active:scale-90 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">QUIZ DETAIL</p>
          <h2 className="text-sm font-black text-slate-900 truncate tracking-tight">{quiz?.title}</h2>
        </div>
        {(quiz?.creator_id === user?.id || user?.id === 1 || quiz?.is_collaborator) && (
          <button 
            onClick={() => {
              setEditFormData({ ...quiz, tags: quiz.tags?.join(', ') })
              setEditTab('props')
              setIsEditModalOpen(true)
            }}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </nav>

      <div className="pt-20 md:pt-12 pb-40">
        {/* Quiz Header */}
        <div className="px-6 max-w-5xl mx-auto mb-10">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03]"><Award className="w-48 h-48" /></div>
            
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm">
              <BookOpen className="w-10 h-10 text-indigo-600" />
            </div>
            
            <div className="flex-1 text-center md:text-left relative z-10">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                  {quiz?.questions_count || 0} QUESTIONS
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                  PRACTICE
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tighter">{quiz?.title}</h1>
              <p className="text-slate-400 font-medium text-base leading-relaxed max-w-2xl">{quiz?.description || "Smart gamified quiz learning platform."}</p>
            </div>
          </div>
        </div>

        {/* Deck Mastery Distribution Widget */}
        {masteryData && (
          <div className="px-6 max-w-5xl mx-auto mb-8">
            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Deck Mastery</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">Leitner spaced repetition progress</p>
                </div>
              </div>

              {/* Segmented Progress Bar */}
              {masteryData.total > 0 ? (
                <div>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mb-4 border border-slate-50">
                    <div 
                      className="h-full bg-slate-300 transition-all duration-500" 
                      style={{ width: `${(masteryData.new / masteryData.total) * 100}%` }}
                      title={`New: ${masteryData.new} cards`}
                    />
                    <div 
                      className="h-full bg-rose-400 transition-all duration-500" 
                      style={{ width: `${(masteryData.learning / masteryData.total) * 100}%` }}
                      title={`Learning: ${masteryData.learning} cards`}
                    />
                    <div 
                      className="h-full bg-amber-400 transition-all duration-500" 
                      style={{ width: `${(masteryData.familiar / masteryData.total) * 100}%` }}
                      title={`Familiar: ${masteryData.familiar} cards`}
                    />
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${(masteryData.mastered / masteryData.total) * 100}%` }}
                      title={`Mastered: ${masteryData.mastered} cards`}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NEW</span>
                      </div>
                      <span className="text-xs font-black text-slate-700">{masteryData.new}</span>
                    </div>

                    <div className="p-3 bg-rose-50/30 border border-rose-100/10 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-rose-400 rounded-full animate-pulse" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LEARNING</span>
                      </div>
                      <span className="text-xs font-black text-rose-500">{masteryData.learning}</span>
                    </div>

                    <div className="p-3 bg-amber-50/30 border border-amber-100/10 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">FAMILIAR</span>
                      </div>
                      <span className="text-xs font-black text-amber-500">{masteryData.familiar}</span>
                    </div>

                    <div className="p-3 bg-emerald-50/30 border border-emerald-100/10 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">MASTERED</span>
                      </div>
                      <span className="text-xs font-black text-emerald-600">{masteryData.mastered}</span>
                    </div>

                    <div className="p-3 bg-indigo-50/30 border border-indigo-100/10 rounded-2xl flex items-center justify-between col-span-2 sm:col-span-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TOTAL</span>
                      <span className="text-xs font-black text-indigo-600">{masteryData.total}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] font-medium text-slate-400">Add questions to this deck to display mastery level distribution.</p>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-10 border-b border-slate-100 mb-8 overflow-x-auto no-scrollbar">
            {['list', 'stats'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)} 
                className={cn(
                  "pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap",
                  activeTab === tab ? 'text-indigo-600' : 'text-slate-400'
                )}
              >
                {tab === 'list' ? 'QUESTION LIST' : 'DETAILED STATISTICS'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />}
              </button>
            ))}
          </div>

          {activeTab === 'list' ? (
            <div className="space-y-1">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions by content..." 
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" 
                />
              </div>

              <div className="space-y-2">
                {allQuestions.map((q) => (
                  <div key={q.id} className="group bg-white p-5 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50/10 hover:shadow-sm transition-all">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-shrink-0 min-w-[40px]">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{q.orig_index}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-700 leading-relaxed md:line-clamp-2">{q.content}</h3>
                      </div>
                      <div className="flex items-center gap-5 md:ml-auto flex-shrink-0 pt-2 md:pt-0">
                        <StatItem label="ATTEMPTS" value={q.stats?.total || 0} color="slate" />
                        <div className="w-px h-6 bg-slate-100" />
                        <StatItem label="CORRECT" value={q.stats?.correct || 0} color="emerald" />
                        <StatItem label="WRONG" value={q.stats?.wrong || 0} color="rose" />
                        {notes?.[q.id] && (
                          <>
                            <div className="w-px h-6 bg-slate-100" />
                            <div className="flex items-center text-indigo-400" title={notes[q.id]}>
                              <StickyNote className="w-4 h-4" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {notes?.[q.id] && (
                      <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/30">
                        <p className="text-[10px] font-medium text-slate-500 italic line-clamp-2">{notes[q.id]}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {hasNextPage && (
                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => fetchNextPage()} 
                    disabled={isFetchingNextPage}
                    className="px-8 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isFetchingNextPage ? 'LOADING...' : 'LOAD MORE'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 md:p-20 rounded-[3rem] text-center border border-slate-100 shadow-sm">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-indigo-600">
                <BarChart2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">In-Depth Analytics</h3>
              <p className="text-slate-500 font-medium mb-10 max-w-md mx-auto">Detailed statistics and learning metrics will populate once you start practicing this deck.</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 bg-white/80 backdrop-blur-2xl border-t border-slate-100 z-[130] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-3">
          {sessionData && (Object.keys(sessionData.state || {}).length > 0 || sessionData.current_index > 0) ? (
            <>
              <button 
                onClick={async () => {
                  await axios.delete(`/api/v1/quiz/${id}/session`)
                  // Refresh the query to update UI
                  queryClient.invalidateQueries({ queryKey: ['quiz-session', id] })
                  navigate(`/quiz/${id}/play`)
                }}
                className="flex-1 py-5 bg-white border-2 border-indigo-100 text-indigo-600 font-black text-sm md:text-base rounded-2xl active:scale-95 transition-all tracking-widest uppercase"
              >
                START FRESH (RESET)
              </button>
              <button 
                onClick={() => navigate(`/quiz/${id}/play`)}
                className="flex-[2] py-5 bg-indigo-600 text-white font-black text-sm md:text-base rounded-2xl shadow-xl shadow-indigo-500/30 active:scale-95 transition-all tracking-widest uppercase"
              >
                CONTINUE LEARNING
              </button>
            </>
          ) : (
            <button 
              onClick={() => navigate(`/quiz/${id}/play`)}
              className="w-full py-5 bg-indigo-600 text-white font-black text-sm md:text-base rounded-2xl shadow-xl shadow-indigo-500/30 active:scale-95 transition-all tracking-widest uppercase"
            >
              START LEARNING
            </button>
          )}
        </div>
      </div>
      
      {/* Edit Quiz Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
              onClick={() => !isSavingEdit && setIsEditModalOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-6">
                   <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 flex-shrink-0">
                     <Settings className="w-6 h-6" />
                   </div>
                   <div className="flex items-center gap-2 border-l border-slate-100 pl-6">
                     <button 
                       onClick={() => setEditTab('props')}
                       className={cn(
                         "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                         editTab === 'props' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-slate-600"
                       )}
                     >
                       PROPERTIES
                     </button>
                     <button 
                       onClick={() => setEditTab('collabs')}
                       className={cn(
                         "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                         editTab === 'collabs' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-400 hover:text-slate-600"
                       )}
                     >
                       COLLABORATORS
                     </button>
                   </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                {editTab === 'props' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Quiz Title</label>
                         <input 
                          type="text"
                          value={editFormData?.title}
                          onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Description</label>
                         <textarea 
                          rows={4}
                          value={editFormData?.description}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Global Instruction</label>
                         <textarea 
                          rows={4}
                          value={editFormData?.instruction}
                          onChange={(e) => setEditFormData({ ...editFormData, instruction: e.target.value })}
                          className="w-full px-5 py-4 bg-indigo-50/30 border border-indigo-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-indigo-900"
                         />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-xl">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <Brain className="w-5 h-5 text-indigo-400" />
                               <label className="text-[10px] font-black uppercase tracking-[0.2em]">AI System Prompt</label>
                            </div>
                            <button onClick={() => setShowHelpModal(true)} className="text-white/40 hover:text-white transition-all"><HelpCircle className="w-4 h-4" /></button>
                         </div>
                         <textarea 
                          rows={8}
                          value={editFormData?.ai_prompt}
                          onChange={(e) => setEditFormData({ ...editFormData, ai_prompt: e.target.value })}
                          className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-medium outline-none focus:border-indigo-400 transition-all custom-scrollbar"
                         />
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Tags (comma separated)</label>
                         <input 
                          type="text"
                          value={editFormData?.tags}
                          onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                         />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Add Collaborator</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text"
                          value={userSearch}
                          onChange={(e) => handleSearchUsers(e.target.value)}
                          placeholder="Search by username or name..."
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[10] overflow-hidden">
                            {searchResults.map(u => (
                              <button 
                                key={u.id}
                                onClick={() => addCollaborator(u.id)}
                                className="w-full px-6 py-3 flex items-center justify-between hover:bg-indigo-50 transition-all text-left"
                              >
                                <div>
                                  <p className="text-xs font-black text-slate-700">{u.username}</p>
                                  <p className="text-[10px] text-slate-400">{u.full_name}</p>
                                </div>
                                <Plus className="w-4 h-4 text-indigo-400" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Collaborator List ({collaborators.length})</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {collaborators.map(c => (
                          <div key={c.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600">
                                {c.username[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-700 leading-none mb-1">{c.username}</p>
                                <p className="text-[9px] text-slate-400 font-medium">{c.full_name}</p>
                              </div>
                            </div>
                            {(quiz?.creator_id === user?.id || user?.id === 1) && (
                              <button 
                                onClick={() => removeCollaborator(c.id)}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {collaborators.length === 0 && (
                          <div className="col-span-2 py-10 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Collaborators Assigned</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {editTab === 'props' && (
                <div className="mt-10 flex gap-4">
                   <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                    disabled={isSavingEdit}
                    onClick={async () => {
                       setIsSavingEdit(true)
                       try {
                         await axios.patch(`/api/v1/quiz/${id}`, {
                           ...editFormData,
                           tags: editFormData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                         })
                         queryClient.invalidateQueries({ queryKey: ['quiz', id] })
                         setIsEditModalOpen(false)
                       } catch (e) {
                         alert("Error saving changes!")
                       } finally {
                         setIsSavingEdit(false)
                       }
                    }}
                    className="flex-[2] py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     {isSavingEdit ? (
                       <>Saving...</>
                     ) : (
                       <>
                         <Save className="w-4 h-4" />
                         Save Changes
                       </>
                     )}
                   </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowHelpModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Prompting Guide</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Use placeholder tags to personalize prompts</p>
                </div>
              </div>
              <button onClick={() => setShowHelpModal(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-600 leading-relaxed mb-6">
                You can insert the following placeholder tags into the AI System Prompt. The system will dynamically replace them with actual values:
              </p>
              
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {[
                  { tag: '{{question}}', desc: 'Current question text content' },
                  { tag: '{{options}}', desc: 'Formatted list of options (A. text, B. text...)' },
                  { tag: '{{correct_answer}}', desc: 'Correct answer label (e.g. A, B, C, D)' },
                  { tag: '{{global_instruction}}', desc: 'Global instructions for the quiz deck' },
                  { tag: '{{quiz_title}}', desc: 'Title of the quiz deck' },
                  { tag: '{{quiz_description}}', desc: 'Description of the quiz deck' },
                  { tag: '{{option_a}}', desc: 'Raw text content of option A' },
                  { tag: '{{option_b}}', desc: 'Raw text content of option B' },
                  { tag: '{{option_c}}', desc: 'Raw text content of option C' },
                  { tag: '{{option_d}}', desc: 'Raw text content of option D' },
                ].map((item) => (
                  <div key={item.tag} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all group">
                    <code className="text-xs font-black text-indigo-600 group-hover:scale-105 transition-transform">{item.tag}</code>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function StatItem({ label, value, color }: { label: string, value: number, color: string }) {
  const textColors: any = {
    slate: 'text-slate-500',
    emerald: 'text-emerald-500',
    rose: 'text-rose-500'
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{label}</span>
      <span className={cn("text-xs font-black", textColors[color])}>{value}</span>
    </div>
  )
}
