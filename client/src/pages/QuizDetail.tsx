import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ChevronLeft, Award, BookOpen, Search, StickyNote, BarChart2, Settings, Edit2, 
  X, Save, Brain, HelpCircle, Plus, Compass, Play, RotateCcw, Clock, Target, 
  Flame, Zap, Layers, CheckCircle2, AlertCircle, ChevronRight, UserPlus, Trash2, 
  Sparkles, Keyboard, Shuffle, ListOrdered 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface Question {
  id: number
  content: string
  orig_index: number
  stats: { total: number; correct: number; wrong: number }
  is_ignored?: boolean
}

interface AttemptHistoryItem {
  id: number
  mode: string
  score: number
  total_questions: number
  accuracy: number
  started_at: string | null
  completed_at: string | null
}

const PRACTICE_MODES = [
  {
    id: 'mcq',
    label: 'Standard 4-Choice Quiz',
    desc: 'Classic multiple choice questions with instant explanations and score tracking.',
    icon: Target,
    color: 'from-indigo-500 to-indigo-600',
    badge: 'Standard'
  },
  {
    id: 'missed',
    label: 'Practice Missed Questions',
    desc: 'Laser-focus on questions answered incorrectly in previous attempts (Box 1 priority).',
    icon: RotateCcw,
    color: 'from-amber-500 to-orange-600',
    badge: 'Target Weakness'
  },
  {
    id: 'new',
    label: 'Practice New Questions',
    desc: 'Learn untouched questions that you have not encountered yet.',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
    badge: 'Fresh Material'
  },
  {
    id: 'typing',
    label: 'Spelling & Recall Mode',
    desc: 'Type the exact answer or keyword without seeing multiple-choice hints.',
    icon: Keyboard,
    color: 'from-violet-500 to-purple-700',
    badge: 'Active Recall'
  },
  {
    id: 'exam',
    label: 'Timed Mock Exam',
    desc: 'Test yourself under simulated exam conditions with strict countdown and final review.',
    icon: Clock,
    color: 'from-emerald-500 to-teal-600',
    badge: 'Challenge'
  },
  {
    id: 'random',
    label: 'Random Shuffle Mode',
    desc: 'Shuffle all questions randomly to prevent memorizing question positions.',
    icon: Shuffle,
    color: 'from-rose-500 to-red-600',
    badge: 'Unbiased'
  }
]

export default function QuizDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAppStore()

  // 4 Primary Tabs: 'overview' | 'questions' | 'roadmap' | 'settings'
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'roadmap' | 'settings'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModeLauncherOpen, setIsModeLauncherOpen] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])

  useEffect(() => {
    if (id === 'import') {
      navigate('/manage', { replace: true })
    }
  }, [id, navigate])

  const fetchCollaborators = async () => {
    try {
      const res = await axios.get(`/api/v1/quiz/${id}/collaborators`)
      setCollaborators(res.data)
    } catch (e) {}
  }

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchCollaborators()
    }
  }, [activeTab, id])

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

  // 1. Quiz Details Data
  const { data: quiz, refetch: refetchQuiz } = useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${id}/data`)
      return res.data
    }
  })

  // 2. Leitner Spaced Repetition Mastery
  const { data: masteryData } = useQuery({
    queryKey: ['quiz-mastery', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/quizzes/${id}/mastery`)
      return res.data
    }
  })

  // 3. Quiz Notes
  const { data: notes } = useQuery({
    queryKey: ['quiz-notes', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${id}/notes`)
      return res.data
    }
  })

  // 4. Quiz Session State
  const { data: sessionData } = useQuery({
    queryKey: ['quiz-session', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${id}/session`)
      return res.data
    }
  })

  // 5. Attempt History
  const { data: historyData } = useQuery<{ history: AttemptHistoryItem[] }>({
    queryKey: ['quiz-history', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${id}/history`)
      return res.data
    }
  })

  // 6. Infinite Questions Query
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

  // Initialize edit form data when quiz is loaded
  useEffect(() => {
    if (quiz && !editFormData) {
      setEditFormData({
        title: quiz.title || '',
        description: quiz.description || '',
        tags: (quiz.tags || []).join(', ')
      })
    }
  }, [quiz, editFormData])

  const handleSaveEdit = async () => {
    if (!editFormData) return
    setIsSavingEdit(true)
    try {
      await axios.put(`/api/v1/quiz/${id}`, {
        title: editFormData.title,
        description: editFormData.description,
        tags: editFormData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      })
      await refetchQuiz()
      alert("Quiz updated successfully!")
    } catch (e) {
      alert("Failed to update quiz.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Touch swipe handling for horizontal tab navigation
  const touchStartX = React.useRef<number | null>(null)
  const touchStartY = React.useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    const diffY = touchStartY.current - e.changedTouches[0].clientY

    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      const tabOrder: Array<'overview' | 'questions' | 'roadmap' | 'settings'> = ['overview', 'questions', 'roadmap', 'settings']
      const currentIndex = tabOrder.indexOf(activeTab)
      if (diffX > 0 && currentIndex < tabOrder.length - 1) {
        if (navigator.vibrate) navigator.vibrate(8)
        setActiveTab(tabOrder[currentIndex + 1])
      } else if (diffX < 0 && currentIndex > 0) {
        if (navigator.vibrate) navigator.vibrate(8)
        setActiveTab(tabOrder[currentIndex - 1])
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const isCreatorOrAdmin = quiz?.creator_id === user?.id || user?.id === 1 || quiz?.is_collaborator

  const launchPracticeMode = (mode: string) => {
    setIsModeLauncherOpen(false)
    if (navigator.vibrate) navigator.vibrate(8)
    navigate(`/quiz/${id}/play?mode=${mode}`)
  }

  return (
    <div className="fixed inset-0 top-0 bottom-0 md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] overflow-hidden text-left select-none font-sans">
      
      {/* ─── STICKY APP HEADER ───────────────────────────────────────────────── */}
      <nav className="shrink-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => navigate(-1)} 
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 active:scale-95 transition-all cursor-pointer"
            title="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">Quiz Overview</span>
            <h2 className="text-sm font-black text-slate-900 truncate leading-tight mt-0.5">{quiz?.title || "Quiz"}</h2>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(8)
              setIsModeLauncherOpen(true)
            }}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-indigo-600" />
            <span className="hidden sm:inline">Practice Modes</span>
          </button>

          {isCreatorOrAdmin && (
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer",
                activeTab === 'settings' 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" 
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:text-indigo-600"
              )}
              title="Quiz Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </nav>

      {/* ─── 4-TAB SEGMENTED BAR ────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-4 text-center h-11">
          {[
            { id: 'overview', label: 'Overview', icon: BookOpen },
            { id: 'questions', label: `Questions (${quiz?.questions_count || 0})`, icon: Layers },
            { id: 'roadmap', label: 'Roadmap', icon: Compass },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any)
                  if (navigator.vibrate) navigator.vibrate(6)
                }}
                className={cn(
                  "relative h-full flex items-center justify-center gap-1.5 text-xs font-black tracking-tight transition-colors cursor-pointer select-none",
                  isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-700"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-indigo-600" : "text-slate-400")} />
                <span className="truncate">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="quizDetailTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── MAIN CONTENT CONTAINER (SCROLLABLE & SWIPEABLE) ─────────────────── */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 pt-4 pb-28 max-w-5xl w-full mx-auto"
      >

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW                                                       */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Quiz Hero Header Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 flex flex-col md:flex-row gap-6 items-center md:items-start relative overflow-hidden">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 text-white shadow-md shadow-indigo-100">
                <BookOpen className="w-10 h-10" />
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                    {quiz?.questions_count || 0} Questions
                  </span>
                  {Array.isArray(quiz?.tags) && quiz.tags.map((tag: string) => (
                    <span key={tag} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                      #{tag}
                    </span>
                  ))}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{quiz?.title}</h1>
                <p className="text-slate-500 font-medium text-xs sm:text-sm leading-relaxed mt-2 max-w-2xl">
                  {quiz?.description || "Master these multiple choice questions through spaced repetition practice and timed simulations."}
                </p>
              </div>
            </div>

            {/* Leitner Spaced Repetition Mastery Distribution */}
            {masteryData && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 leading-tight">Mastery Distribution</h3>
                      <p className="text-[10px] font-bold text-slate-400">Leitner box spaced progression</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-indigo-600">
                    {masteryData.total > 0 ? Math.round((masteryData.mastered / masteryData.total) * 100) : 0}% Mastered
                  </span>
                </div>

                {masteryData.total > 0 ? (
                  <div className="space-y-3">
                    {/* Multi-segmented bar */}
                    <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/60">
                      <div 
                        className="h-full bg-slate-300 transition-all duration-500" 
                        style={{ width: `${(masteryData.new / masteryData.total) * 100}%` }}
                        title={`New: ${masteryData.new}`}
                      />
                      <div 
                        className="h-full bg-rose-400 transition-all duration-500" 
                        style={{ width: `${(masteryData.learning / masteryData.total) * 100}%` }}
                        title={`Learning: ${masteryData.learning}`}
                      />
                      <div 
                        className="h-full bg-amber-400 transition-all duration-500" 
                        style={{ width: `${(masteryData.familiar / masteryData.total) * 100}%` }}
                        title={`Familiar: ${masteryData.familiar}`}
                      />
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500" 
                        style={{ width: `${(masteryData.mastered / masteryData.total) * 100}%` }}
                        title={`Mastered: ${masteryData.mastered}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                          <span className="text-[10px] font-black text-slate-500">NEW</span>
                        </div>
                        <span className="text-xs font-black text-slate-800">{masteryData.new}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200/60 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-rose-400" />
                          <span className="text-[10px] font-black text-rose-600">LEARNING</span>
                        </div>
                        <span className="text-xs font-black text-rose-700">{masteryData.learning}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="text-[10px] font-black text-amber-600">FAMILIAR</span>
                        </div>
                        <span className="text-xs font-black text-amber-700">{masteryData.familiar}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200/60 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-600">MASTERED</span>
                        </div>
                        <span className="text-xs font-black text-emerald-700">{masteryData.mastered}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-medium">Add questions to this quiz to view mastery distribution.</p>
                )}
              </div>
            )}

            {/* Roadmap Quick Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider inline-block">
                  Daily Roadmap 🗺️
                </span>
                <h3 className="text-base font-black text-white">Daily Study & Retention Schedule</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Automate daily question targets, timed reviews, and streak bonuses.
                </p>
              </div>
              <Link
                to={`/quiz/${id}/roadmap`}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Open Roadmap</span>
              </Link>
            </div>

            {/* Recent Attempt History Table */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Recent Attempt History</h3>
                  <p className="text-[10px] font-bold text-slate-400">Your latest practice performance</p>
                </div>
                <button
                  onClick={() => setIsModeLauncherOpen(true)}
                  className="text-xs font-black text-indigo-600 hover:underline cursor-pointer"
                >
                  New Attempt +
                </button>
              </div>

              {!historyData || historyData.history.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  No practice attempts recorded yet. Start practicing below!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historyData.history.map((att) => (
                    <div key={att.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
                          att.accuracy >= 80 ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                          att.accuracy >= 50 ? "bg-amber-50 text-amber-600 border border-amber-200" :
                          "bg-rose-50 text-rose-600 border border-rose-200"
                        )}>
                          {att.accuracy}%
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 truncate block capitalize">
                            {att.mode} Mode
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            {att.completed_at ? new Date(att.completed_at).toLocaleDateString() : 'In Progress'} • {att.score}/{att.total_questions} correct
                          </span>
                        </div>
                      </div>

                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0",
                        att.accuracy >= 80 ? "bg-emerald-100 text-emerald-800" :
                        att.accuracy >= 50 ? "bg-amber-100 text-amber-800" :
                        "bg-rose-100 text-rose-800"
                      )}>
                        {att.accuracy >= 80 ? 'Mastered' : att.accuracy >= 50 ? 'Passed' : 'Needs Review'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: QUESTIONS                                                      */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions by content or answer..." 
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs transition-all" 
              />
            </div>

            {/* Questions List */}
            <div className="space-y-2">
              {allQuestions.map((q) => (
                <div 
                  key={q.id} 
                  className={cn(
                    "bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-200 shadow-2xs hover:shadow-sm transition-all",
                    q.is_ignored ? "opacity-50 grayscale" : ""
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-shrink-0 min-w-[36px]">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{q.orig_index}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">{q.content}</h3>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 pt-2 sm:pt-0">
                      <div className="text-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight block">Attempts</span>
                        <span className="text-xs font-black text-slate-700">{q.stats?.total || 0}</span>
                      </div>
                      <div className="w-px h-5 bg-slate-100" />
                      <div className="text-center">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tight block">Correct</span>
                        <span className="text-xs font-black text-emerald-600">{q.stats?.correct || 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-tight block">Wrong</span>
                        <span className="text-xs font-black text-rose-600">{q.stats?.wrong || 0}</span>
                      </div>
                      {notes?.[q.id] && (
                        <div className="text-indigo-600" title={notes[q.id]}>
                          <StickyNote className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                  {notes?.[q.id] && (
                    <div className="mt-2 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[10px] font-medium text-slate-600 italic">
                      {notes[q.id]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {hasNextPage && (
              <div className="pt-4 flex justify-center">
                <button 
                  onClick={() => fetchNextPage()} 
                  disabled={isFetchingNextPage}
                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:text-indigo-600 shadow-2xs active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More Questions'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: ROADMAP                                                        */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'roadmap' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 text-white rounded-3xl flex items-center justify-center mx-auto text-2xl shadow-md shadow-orange-200">
                🧭
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Personalized Roadmap Pipeline</h3>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto mt-1 leading-relaxed">
                  Automate your daily practice goals, track retention, and let the algorithm schedule intervals for optimal exam recall.
                </p>
              </div>
              <Link
                to={`/quiz/${id}/roadmap`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all cursor-pointer"
              >
                <span>Launch Quiz Roadmap Hub</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: SETTINGS                                                       */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && isCreatorOrAdmin && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900">Quiz Properties</h3>
              <p className="text-xs text-slate-400 font-medium">Update title, description, and categorization tags.</p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Title</label>
                <input
                  type="text"
                  value={editFormData?.title || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={editFormData?.description || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editFormData?.tags || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                  placeholder="e.g. IT, Security, Certification"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? 'Saving...' : 'Save Properties'}
              </button>
            </div>

            {/* Collaborators Section */}
            <div className="pt-6 border-t border-slate-100 space-y-4 max-w-xl">
              <div>
                <h4 className="text-sm font-black text-slate-900">Manage Collaborators</h4>
                <p className="text-xs text-slate-400 font-medium">Grant other users editing and management permissions.</p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Search user by username or email..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  {searchResults.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 hover:bg-white rounded-xl transition-colors">
                      <span className="text-xs font-bold text-slate-800">{u.username}</span>
                      <button
                        onClick={() => addCollaborator(u.id)}
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {collaborators.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Collaborators</span>
                  {collaborators.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-700">{c.username}</span>
                      <button
                        onClick={() => removeCollaborator(c.id)}
                        className="text-rose-500 hover:text-rose-700 text-xs p-1 cursor-pointer"
                        title="Remove Collaborator"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ─── DOCKED BOTTOM ACTION BAR (THUMB REACHABLE) ──────────────────────── */}
      <div className="shrink-0 fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3.5 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] z-40 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          {/* Mode Launcher Trigger */}
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(8)
              setIsModeLauncherOpen(true)
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Choose Practice Mode"
          >
            <Settings className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Modes</span>
          </button>

          {/* Quick Practice Missed Questions */}
          <button
            onClick={() => launchPracticeMode('missed')}
            className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/90 text-amber-800 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Practice Missed Questions"
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Missed</span>
          </button>

          {/* Primary Quick Start Button */}
          <button
            onClick={() => launchPracticeMode('mcq')}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Practice</span>
          </button>
        </div>
      </div>

      {/* ─── PRACTICE MODES LAUNCHER MODAL SHEET (PORTAL TO BODY) ────────────── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isModeLauncherOpen && (
            <div className="fixed inset-0 z-[250] flex flex-col justify-end">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModeLauncherOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              />

              {/* Bottom Sheet Card */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="relative bg-white rounded-t-[2.5rem] border-t border-slate-200 shadow-2xl p-5 sm:p-7 max-h-[85vh] overflow-y-auto z-10 space-y-4 max-w-2xl mx-auto w-full"
              >
                {/* Pull Handle */}
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto -mt-1 mb-2" />

                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Choose Practice Mode</h3>
                      <p className="text-[10px] font-bold text-slate-400">Select a study mode tailored for this session</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsModeLauncherOpen(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {PRACTICE_MODES.map((mode) => {
                    const Icon = mode.icon
                    return (
                      <div
                        key={mode.id}
                        onClick={() => launchPracticeMode(mode.id)}
                        className="p-4 rounded-2xl border border-slate-200/90 hover:border-indigo-300 bg-slate-50/50 hover:bg-indigo-50/20 shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between gap-3 active:scale-[0.98]"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className={cn("w-8 h-8 rounded-xl bg-gradient-to-tr text-white flex items-center justify-center shadow-xs", mode.color)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-600">
                              {mode.badge}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {mode.label}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                            {mode.desc}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-indigo-600 text-xs font-bold pt-1">
                          <span>Start Mode</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  )
}
