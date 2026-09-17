import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ChevronLeft, Award, BookOpen, Search, StickyNote, BarChart2, Settings, Edit2, 
  X, Save, Brain, HelpCircle, Plus, Compass, Play, RotateCcw, Clock, Target, 
  Flame, Zap, Layers, CheckCircle2, AlertCircle, ChevronRight, UserPlus, Trash2, 
  Sparkles, Keyboard, Shuffle, ListOrdered, Image as ImageIcon, ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { QuizStartModal } from '@/components/QuizStartModal'
import { QuizSettingsTab } from '@/components/quiz'

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

export type QuizDetailTab = 'overview' | 'questions' | 'roadmap' | 'settings'

export default function QuizDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAppStore()
  const [searchParams, setSearchParams] = useSearchParams()

  // 4 Primary Tabs from URL query param: 'overview' | 'questions' | 'roadmap' | 'settings'
  const tabParam = searchParams.get('tab') as QuizDetailTab
  const activeTab: QuizDetailTab = (tabParam && ['overview', 'questions', 'roadmap', 'settings'].includes(tabParam)) 
    ? tabParam 
    : 'overview'

  const setActiveTab = (tab: QuizDetailTab) => {
    setSearchParams(prev => {
      const u = new URLSearchParams(prev)
      u.set('tab', tab)
      return u
    }, { replace: true })
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [startModalConfig, setStartModalConfig] = useState<{
    isOpen: boolean
    format: 'practice' | 'exam'
    scope: 'mix' | 'new' | 'review'
    count: number | 'all'
  }>({
    isOpen: false,
    format: 'practice',
    scope: 'mix',
    count: 10
  })

  useEffect(() => {
    if (id === 'import') {
      navigate('/manage', { replace: true })
    }
  }, [id, navigate])

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
      const tabOrder: QuizDetailTab[] = ['overview', 'questions', 'roadmap', 'settings']
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

  const isCreatorOrAdmin = Boolean(
    quiz?.creator_id === user?.id || 
    user?.role === 'admin' || 
    user?.id === 1 || 
    quiz?.is_creator || 
    quiz?.is_collaborator
  )

  return (
    <div className="fixed inset-0 top-0 bottom-0 md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] dark:bg-[#0b0f19] overflow-hidden text-left select-none font-sans">
      
      {/* ─── STICKY APP HEADER ───────────────────────────────────────────────── */}
      <nav className="shrink-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => navigate('/quizzes')} 
            className="w-8.5 h-8.5 flex-shrink-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Back to Quizzes"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">Quiz Overview</span>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight mt-0.5">{quiz?.title || "Quiz Details"}</h2>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(8)
              setStartModalConfig({
                isOpen: true,
                format: 'practice',
                scope: 'mix',
                count: 10
              })
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs shadow-indigo-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span className="hidden sm:inline">Start Quiz</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-8.5 h-8.5 flex items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer",
              activeTab === 'settings' 
                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" 
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600"
            )}
            title="Quiz Settings & Edit"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ─── 4-TAB SEGMENTED BAR ────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-4 text-center h-11">
          {[
            { id: 'overview' as QuizDetailTab, label: 'Overview', icon: BookOpen },
            { id: 'questions' as QuizDetailTab, label: `Questions (${quiz?.questions_count || 0})`, icon: Layers },
            { id: 'roadmap' as QuizDetailTab, label: 'Roadmap', icon: Compass },
            { id: 'settings' as QuizDetailTab, label: 'Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  if (navigator.vibrate) navigator.vibrate(6)
                }}
                className={cn(
                  "relative h-full flex items-center justify-center gap-1.5 text-xs font-black tracking-tight transition-colors cursor-pointer select-none",
                  isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")} />
                <span className="truncate">{tab.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="activeDetailTabIndicator"
                    className="absolute bottom-0 inset-x-2 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" 
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── SCROLLABLE CONTENT BODY ────────────────────────────────────────── */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 max-w-5xl w-full mx-auto pb-28"
      >
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW                                                       */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Header Hero Banner */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 overflow-hidden shrink-0">
                  {quiz?.cover_image ? (
                    <img src={quiz.cover_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-7 h-7" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 truncate tracking-tight">{quiz?.title || "Quiz"}</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-0.5 leading-relaxed">
                    {quiz?.description || "Multiple-choice quiz practice and self-assessment engine."}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                      📝 {quiz?.questions_count || 0} questions
                    </span>
                    {quiz?.creator_name && (
                      <span className="text-[11px] font-bold text-slate-400">
                        by @{quiz.creator_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Jump Action */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </button>
                <Link
                  to={`/manage/edit/${id}/questions`}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Questions</span>
                </Link>
              </div>
            </div>

            {/* Leitner Spaced Repetition Mastery Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Leitner Mastery Boxes</h3>
                  <p className="text-xs text-slate-400 font-medium">Memory retention stages from Box 1 (New) to Box 5 (Mastered)</p>
                </div>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {masteryData?.boxes ? Math.round((masteryData.boxes['5'] || 0) / (quiz?.questions_count || 1) * 100) : 0}% Mastered
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((boxNum) => {
                  const count = masteryData?.boxes?.[boxNum.toString()] || 0
                  return (
                    <div key={boxNum} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Box {boxNum}</span>
                      <span className="text-base font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5 block">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent Attempts History */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Recent Practice Attempts</h3>
              {(!historyData?.history || historyData.history.length === 0) ? (
                <p className="text-xs text-slate-400 italic py-2">No practice history recorded yet. Start your first quiz session above!</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyData.history.slice(0, 5).map(att => (
                    <div key={att.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 font-mono",
                          att.accuracy >= 80 ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                          att.accuracy >= 50 ? "bg-amber-50 text-amber-600 border border-amber-200" :
                          "bg-rose-50 text-rose-600 border border-rose-200"
                        )}>
                          {att.accuracy}%
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block capitalize">
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
        {/* TAB 2: QUESTIONS (BROWSE & EDIT)                                      */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            {/* Action Top Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Questions Catalog ({quiz?.questions_count || 0})
                </h3>
                <p className="text-xs text-slate-400 font-medium">Browse, search, edit, or modify multiple-choice questions.</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/manage/edit/${id}/questions`}
                  className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black shadow-xs shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Question Editor</span>
                </Link>

                <Link
                  to={`/manage/edit/${id}/questions`}
                  className="h-9 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Add Question</span>
                </Link>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions by content, keyword or notes..." 
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs transition-all" 
              />
            </div>

            {/* Questions List */}
            <div className="space-y-2.5">
              {allQuestions.map((q) => (
                <div 
                  key={q.id} 
                  className={cn(
                    "bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-2xs hover:shadow-xs transition-all",
                    q.is_ignored ? "opacity-50 grayscale" : ""
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-shrink-0 min-w-[36px]">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">#{q.orig_index}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{q.content}</h3>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0">
                      <div className="text-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight block">Attempts</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 font-mono">{q.stats?.total || 0}</span>
                      </div>
                      <div className="w-px h-5 bg-slate-100 dark:bg-slate-800" />
                      <div className="text-center">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tight block">Correct</span>
                        <span className="text-xs font-black text-emerald-600 font-mono">{q.stats?.correct || 0}</span>
                      </div>
                      <div className="w-px h-5 bg-slate-100 dark:bg-slate-800" />
                      <div className="text-center">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-tight block">Wrong</span>
                        <span className="text-xs font-black text-rose-600 font-mono">{q.stats?.wrong || 0}</span>
                      </div>

                      {/* Edit Question Shortcut */}
                      <Link
                        to={`/manage/edit/${id}/questions`}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                        title="Edit question in Question Editor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {notes?.[q.id] && (
                    <div className="mt-2 p-2.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900 text-[10.5px] font-medium text-slate-600 dark:text-slate-300 italic">
                      💡 {notes[q.id]}
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
                  className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 hover:text-indigo-600 shadow-2xs active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 dark:border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-teal-500 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto text-2xl shadow-md shadow-indigo-200">
                🧭
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Personalized Roadmap Pipeline</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto mt-1 leading-relaxed">
                  Automate daily practice goals, track retention intervals, and conquer questions systematically.
                </p>
              </div>
              <Link
                to={`/quiz/${id}/roadmap`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all cursor-pointer"
              >
                <span>Launch Daily Roadmap Hub</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: SETTINGS & MANAGEMENT                                          */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <QuizSettingsTab
              quizId={id || ''}
              initialData={quiz}
              isOwner={isCreatorOrAdmin}
              onSaved={refetchQuiz}
            />
          </div>
        )}

      </div>

      {/* ─── DOCKED BOTTOM ACTION BAR (THUMB REACHABLE) ──────────────────────── */}
      <div className="shrink-0 fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-3.5 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] z-40 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          {/* Quick Review Missed Questions */}
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(8)
              setStartModalConfig({
                isOpen: true,
                format: 'practice',
                scope: 'review',
                count: 10
              })
            }}
            className="px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border border-amber-200/90 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Review Missed Questions"
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Review Missed</span>
          </button>

          {/* Quick Timed Mock Exam */}
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(8)
              setStartModalConfig({
                isOpen: true,
                format: 'exam',
                scope: 'mix',
                count: 20
              })
            }}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200/90 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Timed Exam Mode"
          >
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Timed Exam</span>
          </button>

          {/* Primary Quick Start Button */}
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(8)
              setStartModalConfig({
                isOpen: true,
                format: 'practice',
                scope: 'mix',
                count: 10
              })
            }}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Quiz</span>
          </button>
        </div>
      </div>

      {/* ─── QUIZ START MODAL ─────────────────────────────────────────── */}
      <QuizStartModal
        isOpen={startModalConfig.isOpen}
        onClose={() => setStartModalConfig(prev => ({ ...prev, isOpen: false }))}
        quizId={id || ''}
        quizTitle={quiz?.title || 'Quiz'}
        totalQuestions={allQuestions.length || quiz?.questions_count || 0}
        timeLimitMinutes={quiz?.time_limit}
        initialFormat={startModalConfig.format}
        initialScope={startModalConfig.scope}
        initialCount={startModalConfig.count}
        countsSummary={{
          totalCount: allQuestions.length || quiz?.questions_count || 0,
          newCount: allQuestions.filter((q: any) => (!q.stats || q.stats.total === 0)).length,
          reviewCount: allQuestions.filter((q: any) => (q.stats && q.stats.total > 0)).length
        }}
      />

    </div>
  )
}
