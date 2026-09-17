import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, Plus, ChevronRight, ChevronLeft, Archive, 
  RotateCcw, Trophy, X, Play, Sparkles, Layers, Eye, Check,
  Compass, ChevronDown, BookOpen, Folder as FolderIcon, FolderPlus,
  Edit3, Trash2, Settings, Target, Flame, Globe, Award, Bookmark
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useRoadmapStatus } from '@/hooks/useRoadmapStatus'
import { QuizStartModal } from '@/components/QuizStartModal'

export interface Quiz {
  id: number
  title: string
  description?: string
  cover_image: string | null
  questions_count: number
  tags: string[]
  creator_id?: number
  creator_name?: string
  is_creator?: boolean
  is_public?: boolean
  has_roadmap?: boolean
  learned_count?: number
  mastered_count?: number
  progress_percent?: number
  created_at?: string | null
}

interface DashboardData {
  user: { id: number; username: string; email: string; role?: string }
  my_quizzes: Quiz[]
  archived_quizzes: Quiz[]
  discover_quizzes: Quiz[]
  created_quizzes: Quiz[]
  gamify: { level: number; xp: number; streak: number }
  stats_summary: { avg_accuracy: number; total_time_hours: number; total_questions: number }
}

export interface FolderData {
  id: number
  title: string
  description?: string
  color: 'indigo' | 'purple' | 'emerald' | 'amber'
  quiz_ids: number[]
}

export type QuizzesTab = 'my' | 'folders' | 'discover' | 'archived'
export type StatusFilter = 'all' | 'roadmap' | 'learning' | 'unlearned' | 'mastered'

export interface DeckTheme {
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  iconColor: string
  bgLight: string
  accentColor: string
}

export const DECK_THEMES: DeckTheme[] = [
  { icon: BookOpen, gradient: 'from-indigo-500 to-violet-600', iconColor: 'text-white', bgLight: 'bg-indigo-50', accentColor: '#4F46E5' },
  { icon: Sparkles, gradient: 'from-violet-500 to-purple-600', iconColor: 'text-white', bgLight: 'bg-purple-50', accentColor: '#7C3AED' },
  { icon: Target, gradient: 'from-emerald-500 to-teal-600', iconColor: 'text-white', bgLight: 'bg-emerald-50', accentColor: '#10B981' },
  { icon: Flame, gradient: 'from-amber-500 to-orange-500', iconColor: 'text-white', bgLight: 'bg-amber-50', accentColor: '#F59E0B' },
  { icon: Compass, gradient: 'from-cyan-500 to-blue-600', iconColor: 'text-white', bgLight: 'bg-cyan-50', accentColor: '#06B6D4' },
  { icon: Trophy, gradient: 'from-rose-500 to-pink-600', iconColor: 'text-white', bgLight: 'bg-rose-50', accentColor: '#E11D48' },
  { icon: Globe, gradient: 'from-blue-600 to-indigo-600', iconColor: 'text-white', bgLight: 'bg-blue-50', accentColor: '#2563EB' },
  { icon: Award, gradient: 'from-teal-500 to-emerald-600', iconColor: 'text-white', bgLight: 'bg-teal-50', accentColor: '#0D9488' },
  { icon: Bookmark, gradient: 'from-pink-500 to-rose-600', iconColor: 'text-white', bgLight: 'bg-pink-50', accentColor: '#F43F5E' },
  { icon: Layers, gradient: 'from-fuchsia-500 to-purple-600', iconColor: 'text-white', bgLight: 'bg-fuchsia-50', accentColor: '#C026D3' }
]

export function getDeckTheme(quiz: { id: number; title?: string }): DeckTheme {
  const idNum = Math.abs(quiz.id || 0)
  const titleSum = (quiz.title || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const index = (idNum * 17 + titleSum) % DECK_THEMES.length
  return DECK_THEMES[index]
}

function formatCreationDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function QuizzesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as QuizzesTab
  const activeTab: QuizzesTab = ['my', 'folders', 'discover', 'archived'].includes(tabParam) ? tabParam : 'my'

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [isTagRowOpen, setIsTagRowOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)

  // Folder states
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderData | null>(null)
  const [folderFormTitle, setFolderFormTitle] = useState('')
  const [folderFormDesc, setFolderFormDesc] = useState('')
  const [folderFormColor, setFolderFormColor] = useState<'indigo' | 'purple' | 'emerald' | 'amber'>('indigo')
  const [folderFormQuizIds, setFolderFormQuizIds] = useState<number[]>([])

  // Quiz Start Modal state
  const [quizForStartModal, setQuizForStartModal] = useState<Quiz | null>(null)
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const { user, setUser, setGamify } = useAppStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Default subject folders
  const [folders, setFolders] = useState<FolderData[]>([
    { id: 1, title: 'Exam Prep & Core Reviews', description: 'Essential questions for upcoming tests', color: 'indigo', quiz_ids: [] },
    { id: 2, title: 'Weak Areas & Difficult Concepts', description: 'Questions needing extra attention', color: 'purple', quiz_ids: [] },
  ])

  // Data fetching
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      if (res.data.user) setUser(res.data.user)
      if (res.data.gamify) setGamify(res.data.gamify)
      return res.data
    },
    staleTime: 30 * 1000,
  })

  // Active folder object
  const activeFolder = useMemo(() => {
    return folders.find(f => f.id === activeFolderId) || null
  }, [folders, activeFolderId])

  const setActiveTab = (tab: QuizzesTab) => {
    setSearchParams({ tab }, { replace: true })
    setCurrentPage(1)
    if (tab !== 'my' && tab !== 'folders') {
      setActiveFolderId(null)
    }
  }

  // Touch swipe handling for tab switching
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    const diffY = touchStartY.current - e.changedTouches[0].clientY

    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      const tabOrder: QuizzesTab[] = ['my', 'folders', 'discover', 'archived']
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

  // Mutations
  const enrollMutation = useMutation({
    mutationFn: (quizId: number) => axios.post(`/api/v1/quiz/${quizId}/enroll`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setActiveTab('my')
    }
  })

  const archiveMutation = useMutation({
    mutationFn: (quizId: number) => axios.post(`/api/v1/quiz/${quizId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })

  // Raw dataset based on active tab
  const rawQuizzes = useMemo(() => {
    if (!data) return []
    if (activeTab === 'discover') return data.discover_quizzes || []
    if (activeTab === 'archived') return data.archived_quizzes || []
    return data.my_quizzes || []
  }, [data, activeTab])

  // Extract all available tags
  const allAvailableTags = useMemo(() => {
    const set = new Set<string>()
    rawQuizzes.forEach(q => q.tags?.forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [rawQuizzes])

  // Filtered dataset
  const filteredQuizzes = useMemo(() => {
    return rawQuizzes.filter(q => {
      // Filter by folder in "my" tab
      if (activeTab === 'my' && activeFolderId) {
        const folder = folders.find(f => f.id === activeFolderId)
        if (folder && !folder.quiz_ids.includes(q.id)) {
          return false
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const titleMatch = q.title.toLowerCase().includes(query)
        const descMatch = q.description?.toLowerCase().includes(query)
        const tagMatch = q.tags?.some(t => t.toLowerCase().includes(query))
        if (!titleMatch && !descMatch && !tagMatch) return false
      }

      // Active tag filter
      if (activeTag && !q.tags?.includes(activeTag)) {
        return false
      }

      // Status Filter
      if (statusFilter === 'roadmap') {
        return Boolean(q.has_roadmap)
      }
      if (statusFilter === 'learning') {
        return (q.learned_count || 0) > 0 && (q.progress_percent || 0) < 100
      }
      if (statusFilter === 'unlearned') {
        return !(q.learned_count && q.learned_count > 0)
      }
      if (statusFilter === 'mastered') {
        return (q.progress_percent || 0) === 100 || (q.mastered_count || 0) >= (q.questions_count || 1)
      }

      return true
    })
  }, [rawQuizzes, activeTab, activeFolderId, folders, searchQuery, activeTag, statusFilter])

  // Auto-select first quiz if none selected
  useEffect(() => {
    if (filteredQuizzes.length > 0) {
      if (!selectedQuizId || !filteredQuizzes.some(q => q.id === selectedQuizId)) {
        setSelectedQuizId(filteredQuizzes[0].id)
      }
    } else {
      setSelectedQuizId(null)
    }
  }, [filteredQuizzes, selectedQuizId])

  // Selected quiz object
  const selectedQuiz = useMemo(() => {
    return filteredQuizzes.find(q => q.id === selectedQuizId) || null
  }, [filteredQuizzes, selectedQuizId])

  // Roadmap details for selected quiz
  const { status: roadmapStatus } = useRoadmapStatus(selectedQuiz?.id)
  const isRoadmapActive = Boolean(roadmapStatus?.roadmap_active && !roadmapStatus?.all_done)
  const roadmapStepText = roadmapStatus
    ? roadmapStatus.all_done
      ? 'Completed 🎉'
      : `Step ${(roadmapStatus.current_step_index || 0) + 1}/${roadmapStatus.pipeline?.length || 1}`
    : 'Roadmap'

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredQuizzes.length / itemsPerPage))
  const paginatedQuizzes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredQuizzes.slice(start, start + itemsPerPage)
  }, [filteredQuizzes, currentPage, itemsPerPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, activeTag, statusFilter, activeFolderId])

  // Folder Handlers
  const handleOpenFolderModal = (folder?: FolderData) => {
    if (folder) {
      setEditingFolder(folder)
      setFolderFormTitle(folder.title)
      setFolderFormDesc(folder.description || '')
      setFolderFormColor(folder.color)
      setFolderFormQuizIds(folder.quiz_ids || [])
    } else {
      setEditingFolder(null)
      setFolderFormTitle('')
      setFolderFormDesc('')
      setFolderFormColor('indigo')
      setFolderFormQuizIds([])
    }
    setIsFolderModalOpen(true)
  }

  const handleSaveFolder = () => {
    if (!folderFormTitle.trim()) return
    if (editingFolder) {
      setFolders(prev => prev.map(f => f.id === editingFolder.id ? {
        ...f,
        title: folderFormTitle.trim(),
        description: folderFormDesc.trim(),
        color: folderFormColor,
        quiz_ids: folderFormQuizIds
      } : f))
    } else {
      const newFolder: FolderData = {
        id: Date.now(),
        title: folderFormTitle.trim(),
        description: folderFormDesc.trim(),
        color: folderFormColor,
        quiz_ids: folderFormQuizIds
      }
      setFolders(prev => [...prev, newFolder])
    }
    setIsFolderModalOpen(false)
    setEditingFolder(null)
  }

  const handleDeleteFolder = (folderId: number) => {
    setFolders(prev => prev.filter(f => f.id !== folderId))
    if (activeFolderId === folderId) setActiveFolderId(null)
  }

  const handleOpenStartQuizModal = (quiz: Quiz) => {
    setQuizForStartModal(quiz)
    setIsStartModalOpen(true)
  }

  const tabsConfig = [
    { id: 'my' as QuizzesTab, label: 'My Quizzes', count: data?.my_quizzes?.length || 0, icon: BookOpen },
    { id: 'folders' as QuizzesTab, label: 'Folders', count: folders.length, icon: FolderIcon },
    { id: 'discover' as QuizzesTab, label: 'Discover', count: data?.discover_quizzes?.length || 0, icon: Globe },
    { id: 'archived' as QuizzesTab, label: 'Archived', count: data?.archived_quizzes?.length || 0, icon: Archive },
  ]

  return (
    <div className="fixed inset-0 top-0 bottom-[calc(56px+env(safe-area-inset-bottom))] md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] dark:bg-[#0b0f19] overflow-hidden select-none">
      {/* ═══════════ TOP HEADER & CONTROL BAR ═══════════ */}
      <div className="shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 z-20 px-3.5 sm:px-6 lg:px-8 xl:px-10 py-2.5 sm:py-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto space-y-2">
          {/* Row 1: Title, Desktop Tabs & Quick Actions */}
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs shadow-indigo-500/20 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                    Quizzes
                  </h1>
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-[10.5px] font-extrabold leading-none">
                    {rawQuizzes.length} total
                  </span>
                </div>
              </div>

              {/* Desktop Segmented Tab Switcher */}
              <div className="hidden md:flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 shadow-inner">
                {tabsConfig.map(tab => {
                  const isActive = activeTab === tab.id
                  const TabIcon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none",
                        isActive 
                          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-600 font-black" 
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      )}
                    >
                      <TabIcon className={cn("w-3.5 h-3.5", isActive ? "text-indigo-600 dark:text-indigo-400 stroke-[2.2]" : "text-slate-400")} />
                      <span>{tab.label}</span>
                      <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[9.5px] font-black leading-none",
                        isActive ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300" : "bg-slate-200/80 dark:bg-slate-750 text-slate-600 dark:text-slate-400"
                      )}>
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Desktop Quick Actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Search input */}
              <div className="relative w-48 lg:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Folder Button */}
              <button
                onClick={() => handleOpenFolderModal()}
                className="h-8.5 px-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100/90 border border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-300 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Manage Folders"
              >
                <FolderIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="font-extrabold text-violet-900 dark:text-violet-200">Folder</span>
                {folders.length > 0 && (
                  <span className="bg-violet-200/90 dark:bg-violet-800 text-violet-900 dark:text-violet-100 px-1.5 py-0.2 rounded-full text-[10px] font-black leading-none">
                    {folders.length}
                  </span>
                )}
              </button>

              {/* New Quiz Button */}
              <Link
                to="/manage/import"
                className="h-8.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white flex items-center gap-1.5 text-xs font-black shadow-xs shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                title="Create or import new quiz"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>New Quiz</span>
              </Link>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                onClick={() => setIsSearchOpen(prev => !prev)}
                className={cn(
                  "h-8.5 w-8.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs",
                  isSearchOpen || searchQuery
                    ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                )}
                title="Search quizzes"
              >
                <Search className="w-4 h-4" />
              </button>

              <Link
                to="/manage/import"
                className="h-8.5 px-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center gap-1 text-xs font-black shadow-xs shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                title="Create or import new quiz"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>New</span>
              </Link>
            </div>
          </div>

          {/* Row 2 on Mobile: iOS Segmented Bar */}
          <div className="md:hidden pt-0.5 pb-1">
            <div className="grid grid-cols-4 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 shadow-inner">
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.id
                const TabIcon = tab.icon
                const shortLabel = tab.id === 'my' ? 'Quizzes' : tab.id === 'folders' ? 'Folders' : tab.id === 'discover' ? 'Discover' : 'Archive'
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative py-1.5 px-0.5 rounded-xl text-xs font-bold transition-all select-none cursor-pointer flex items-center justify-center gap-1 min-w-0",
                      isActive
                        ? "text-slate-900 dark:text-slate-100 font-black shadow-xs bg-white dark:bg-slate-700"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                    )}
                  >
                    <TabIcon className={cn(
                      "w-3.5 h-3.5 shrink-0 transition-colors",
                      isActive ? "text-indigo-600 dark:text-indigo-400 stroke-[2.4]" : "text-slate-400"
                    )} />
                    <span className="truncate text-[10.5px] leading-tight">{shortLabel}</span>
                    <span className={cn(
                      "px-1 py-0.2 rounded-full text-[9px] font-black leading-none shrink-0",
                      isActive 
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60" 
                        : "bg-slate-200/80 dark:bg-slate-800 text-slate-500"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mobile Search Expandable Bar */}
          {isSearchOpen && (
            <div className="md:hidden relative pt-0.5 pb-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                type="text"
                placeholder="Search quizzes by title, tag..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Row 3: Status Filter Chips with Tag Toggle */}
          {activeTab !== 'folders' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5 md:border-t md:border-slate-100 dark:md:border-slate-800 md:pt-1.5">
              {activeTab === 'my' && (
                <>
                  {/* Tag Toggle Button */}
                  {allAvailableTags.length > 0 && (
                    <button
                      onClick={() => setIsTagRowOpen(prev => !prev)}
                      className={cn(
                        "px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 border cursor-pointer select-none flex items-center gap-1",
                        activeTag
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xs font-black"
                          : isTagRowOpen
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-extrabold"
                          : "bg-slate-100/80 md:bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60"
                      )}
                      title={isTagRowOpen ? "Hide tags bar" : "Filter by tags"}
                    >
                      <span>{activeTag ? `🏷️ #${activeTag}` : '🏷️ Tags'}</span>
                      {activeTag ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveTag(null)
                          }}
                          className="hover:bg-white/20 rounded p-0.5"
                          title="Clear tag filter"
                        >
                          <X className="w-3 h-3" />
                        </span>
                      ) : (
                        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200 opacity-60", isTagRowOpen && "rotate-180")} />
                      )}
                    </button>
                  )}

                  <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 shrink-0 mx-0.5" />

                  {/* Status Chips */}
                  {[
                    { id: 'all' as StatusFilter, label: 'All' },
                    { id: 'roadmap' as StatusFilter, label: '🧭 Roadmap' },
                    { id: 'learning' as StatusFilter, label: '⚡ In Progress' },
                    { id: 'unlearned' as StatusFilter, label: '✨ New' },
                    { id: 'mastered' as StatusFilter, label: '🌟 Mastered' },
                  ].map(st => {
                    const isSelected = statusFilter === st.id
                    return (
                      <button
                        key={st.id}
                        onClick={() => setStatusFilter(st.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 border cursor-pointer select-none",
                          isSelected
                            ? st.id === 'roadmap'
                              ? "bg-teal-600 border-teal-600 text-white shadow-xs font-black"
                              : "bg-indigo-600 border-indigo-600 text-white shadow-xs shadow-indigo-500/20 font-black"
                            : "bg-slate-100/80 md:bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60"
                        )}
                      >
                        {st.label}
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 pb-1.5 pt-0.5 md:border-t md:border-slate-100 dark:md:border-slate-800 md:pt-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Organize your quizzes into categories for combined review sessions
                </span>
                <span className="px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/60 border border-violet-200/80 dark:border-violet-800/80 text-violet-800 dark:text-violet-300 text-[11px] font-extrabold">
                  {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenFolderModal()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black shadow-xs shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ New Folder</span>
              </button>
            </div>
          )}

          {/* Expandable Tags Bar */}
          <AnimatePresence>
            {isTagRowOpen && activeTab === 'my' && allAvailableTags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pb-1"
              >
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 px-2 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/50 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/60 shadow-2xs">
                  <span className="text-[10px] font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
                    <span>🏷️ All Tags:</span>
                  </span>
                  {allAvailableTags.map(tag => {
                    const isSelected = activeTag === tag
                    return (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(isSelected ? null : tag)}
                        className={cn(
                          "px-2.5 py-0.5 rounded-xl text-[11px] font-bold transition-all shrink-0 border cursor-pointer select-none flex items-center gap-1",
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs font-black"
                            : "bg-white dark:bg-slate-800 hover:bg-indigo-100/70 border-indigo-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <span>#{tag}</span>
                        {isSelected && <X className="w-3 h-3 ml-0.5" />}
                      </button>
                    )
                  })}
                  {activeTag && (
                    <button
                      onClick={() => setActiveTag(null)}
                      className="px-2 py-0.5 rounded-xl text-[10.5px] font-black text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT (SCROLLABLE GRID WITH TOUCH SWIPE) ═══════════ */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3.5 sm:px-6 lg:px-8 xl:px-10 py-3.5"
      >
        <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto">
          {/* Active Folder Banner */}
          {activeFolder && activeTab === 'my' && (
            <div className={cn(
              "mb-4 p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all",
              activeFolder.color === 'purple' 
                ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800/50' 
                : activeFolder.color === 'emerald'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/50'
                : activeFolder.color === 'amber'
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/50'
                : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-800/50'
            )}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 bg-gradient-to-tr",
                  activeFolder.color === 'purple' 
                    ? 'from-purple-500 to-indigo-500' 
                    : activeFolder.color === 'emerald'
                    ? 'from-emerald-500 to-teal-500'
                    : activeFolder.color === 'amber'
                    ? 'from-amber-500 to-orange-500'
                    : 'from-indigo-600 to-violet-600'
                )}>
                  <FolderIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">
                      {activeFolder.title}
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                      {activeFolder.quiz_ids.length} quizzes
                    </span>
                  </div>
                  {activeFolder.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                      {activeFolder.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Folder Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const memberQuizzes = (data?.my_quizzes || []).filter(q => activeFolder.quiz_ids?.includes(q.id))
                    if (memberQuizzes.length > 0) {
                      handleOpenStartQuizModal(memberQuizzes[0])
                    }
                  }}
                  className="h-8.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xs shadow-xs shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Practice quizzes in this folder"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Practice Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFolderId(null)}
                  className="h-8.5 px-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Clear folder filter"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'folders' ? (
            /* ═══════════ FOLDERS VIEW ═══════════ */
            folders.length === 0 ? (
              <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-10 sm:p-14 text-center flex flex-col items-center justify-center shadow-sm my-auto">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950 dark:to-indigo-950 border-2 border-violet-200/80 dark:border-violet-800 flex items-center justify-center text-4xl mb-4 shadow-inner">
                  📁
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight mb-1.5">
                  No folders created yet
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                  Folders let you group related quizzes (e.g. Biology, JLPT N2, Medical Entrance) and practice combined questions together.
                </p>
                <button 
                  type="button"
                  onClick={() => handleOpenFolderModal()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <FolderPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Create Your First Folder</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 pb-12">
                <AnimatePresence mode="popLayout">
                  {folders.map((folder, idx) => {
                    const memberQuizzes = (data?.my_quizzes || []).filter(q => folder.quiz_ids?.includes(q.id))
                    const totalQuestions = memberQuizzes.reduce((sum, q) => sum + (q.questions_count || 0), 0)

                    const colorStyles = {
                      purple: {
                        gradient: 'from-purple-500 to-violet-600',
                        badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800',
                        cardBg: 'bg-gradient-to-br from-purple-50/60 via-white to-violet-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/20 border-purple-200/90 dark:border-slate-800'
                      },
                      emerald: {
                        gradient: 'from-emerald-500 to-teal-500',
                        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800',
                        cardBg: 'bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20 border-emerald-200/90 dark:border-slate-800'
                      },
                      amber: {
                        gradient: 'from-amber-500 to-orange-500',
                        badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800',
                        cardBg: 'bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 border-amber-200/90 dark:border-slate-800'
                      },
                      indigo: {
                        gradient: 'from-indigo-600 to-violet-600',
                        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800',
                        cardBg: 'bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 border-indigo-200/90 dark:border-slate-800'
                      }
                    }[folder.color] || {
                      gradient: 'from-indigo-600 to-violet-600',
                      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
                      cardBg: 'bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/30 border-indigo-200/90'
                    }

                    return (
                      <motion.div
                        key={folder.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.03 }}
                        className={cn(
                          "rounded-[24px] p-4 sm:p-4.5 border shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between select-none relative group",
                          colorStyles.cardBg
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl bg-gradient-to-tr text-white flex items-center justify-center shadow-xs shrink-0",
                                colorStyles.gradient
                              )}>
                                <FolderIcon className="w-6 h-6 fill-white/20" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
                                  {folder.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className={cn("px-2 py-0.5 rounded-full text-[10.5px] font-black border", colorStyles.badgeBg)}>
                                    📚 {folder.quiz_ids.length} {folder.quiz_ids.length === 1 ? 'quiz' : 'quizzes'}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    📝 {totalQuestions} questions
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions Menu */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleOpenFolderModal(folder)}
                                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Edit Folder"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFolder(folder.id)}
                                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 dark:border-slate-700 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="Delete Folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {folder.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-2 mt-3 leading-relaxed">
                              {folder.description}
                            </p>
                          )}

                          {/* Member quizzes preview chips */}
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            {memberQuizzes.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {memberQuizzes.slice(0, 3).map(mq => (
                                  <span 
                                    key={mq.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold truncate max-w-[150px]"
                                  >
                                    <BookOpen className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{mq.title}</span>
                                  </span>
                                ))}
                                {memberQuizzes.length > 3 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black">
                                    +{memberQuizzes.length - 3} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] font-medium text-slate-400 italic">
                                No quizzes assigned yet. Click Edit to add quizzes.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Folder Card Actions */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFolderId(folder.id)
                              setActiveTab('my')
                            }}
                            className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View Quizzes</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (memberQuizzes.length > 0) {
                                handleOpenStartQuizModal(memberQuizzes[0])
                              }
                            }}
                            disabled={memberQuizzes.length === 0}
                            className="flex-1 h-9 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs shadow-xs shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                          >
                            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                            <span>Practice</span>
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )
          ) : (
            /* ═══════════ FULL-WIDTH QUIZZES GRID VIEW ═══════════ */
            filteredQuizzes.length === 0 ? (
              <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-10 sm:p-14 text-center flex flex-col items-center justify-center shadow-sm my-12">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-3xl mb-3 shadow-inner">
                  🔍
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight mb-1">
                  {searchQuery ? `No quizzes matching "${searchQuery}"` : "No quizzes found"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">
                  {searchQuery 
                    ? "Try searching with different terms or clear the search input."
                    : "No quizzes available under the current filter selection."}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 pb-8">
                  <AnimatePresence mode="popLayout">
                    {paginatedQuizzes.map((quiz, idx) => {
                      const isSelected = selectedQuiz?.id === quiz.id
                      const theme = getDeckTheme(quiz)
                      const ThemeIcon = theme.icon
                      const hasCover = Boolean(quiz.cover_image)
                      const formattedDate = formatCreationDate(quiz.created_at)
                      const progressPct = Math.min(100, Math.round(quiz.progress_percent || 0))

                      return (
                        <motion.div
                          key={quiz.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ delay: idx * 0.02 }}
                          onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(6)
                            setSelectedQuizId(prev => prev === quiz.id ? prev : quiz.id)
                          }}
                          onDoubleClick={() => navigate(`/quiz/${quiz.id}`)}
                          className={cn(
                            "rounded-[24px] p-3.5 sm:p-4 border shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between select-none cursor-pointer relative group",
                            isSelected
                              ? "bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-md"
                              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          )}
                        >
                          <div>
                            {/* Card Top Row: Avatar & Title & Right Checkmark/Chevron */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xs border-2 border-white dark:border-slate-800 shrink-0",
                                  hasCover ? "bg-slate-100" : cn("bg-gradient-to-tr text-white", theme.gradient)
                                )}>
                                  {hasCover ? (
                                    <img
                                      src={quiz.cover_image!}
                                      alt={quiz.title}
                                      className="w-full h-full object-cover"
                                      onError={e => { (e.currentTarget as HTMLElement).style.display = 'none' }}
                                    />
                                  ) : (
                                    <ThemeIcon className="w-6 h-6 stroke-[2.2] text-white drop-shadow-2xs" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
                                      {quiz.title}
                                    </h3>
                                    {quiz.has_roadmap && (
                                      <span 
                                        className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800 text-teal-600 dark:text-teal-400 shrink-0 shadow-2xs"
                                        title="Smart daily roadmap enabled"
                                      >
                                        <Compass className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                                      </span>
                                    )}
                                  </div>

                                  {quiz.description ? (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">
                                      {quiz.description}
                                    </p>
                                  ) : (
                                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                                      Multiple choice quiz
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Indicator: Checkmark if selected, Chevron if not */}
                              {isSelected ? (
                                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <ChevronRight className="w-4.5 h-4.5 text-slate-300 dark:text-slate-600 stroke-[2.5] shrink-0" />
                              )}
                            </div>

                            {/* Meta Badges: Questions count, creator, date */}
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2.5 flex-wrap">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10.5px] font-bold">
                                📝 {quiz.questions_count} questions
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-slate-600 dark:text-slate-300 font-bold truncate max-w-[110px]">
                                @{quiz.creator_name || (quiz.is_creator ? 'You' : 'QuizMind')}
                              </span>
                              {formattedDate && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700">•</span>
                                  <span className="text-slate-400 font-medium text-[10px]">
                                    {formattedDate}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Progress Bar (if not in discover tab) */}
                            {activeTab !== 'discover' && (
                              <div className="flex items-center gap-2 mt-2">
                                <div className={cn(
                                  "flex-1 h-1.5 rounded-full overflow-hidden p-0.5 shadow-inner",
                                  isSelected ? "bg-indigo-100 dark:bg-indigo-950" : "bg-slate-100 dark:bg-slate-800"
                                )}>
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      progressPct === 100
                                        ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                                        : "bg-gradient-to-r from-indigo-500 to-violet-600"
                                    )}
                                    style={{ width: `${Math.max(progressPct, quiz.questions_count > 0 ? 3 : 0)}%` }}
                                  />
                                </div>
                                <span className={cn(
                                  "text-[10.5px] font-black shrink-0 leading-none font-mono",
                                  isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"
                                )}>
                                  {progressPct}%
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>

                {/* In-List Pagination Bar */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-2 pb-6">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-35 cursor-pointer shadow-2xs flex items-center gap-1 transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      Page <strong className="text-slate-800 dark:text-slate-100 font-black">{currentPage}</strong> of <strong className="text-slate-800 dark:text-slate-100 font-black">{totalPages}</strong>
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-35 cursor-pointer shadow-2xs flex items-center gap-1 transition-all"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>

      {/* ═══════════ STRICTLY SINGLE-ROW BOTTOM ACTION DOCK (H-[54PX]) ═══════════ */}
      {selectedQuiz && activeTab !== 'folders' && (
        <div className="shrink-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-3.5 sm:px-6 lg:px-8 xl:px-10 py-2">
          <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto flex items-center gap-2">
            {activeTab === 'my' && (
              <>
                {isRoadmapActive ? (
                  /* Roadmap Hero CTA + Compact Study & Practice buttons */
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <button
                      onClick={() => navigate(roadmapStatus?.next_action_url || `/quiz/${selectedQuiz.id}/roadmap`)}
                      className="flex-1 min-w-0 h-11 px-3 sm:px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-between gap-1.5 cursor-pointer border-b-[3px] border-[#3b3dbf] select-none"
                      title="Continue daily roadmap pipeline"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Compass className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-spin-slow shrink-0" />
                        <span className="truncate">Continue Roadmap</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-black/20 backdrop-blur-xs text-[10px] sm:text-[11px] font-mono font-black shrink-0 tracking-wide border border-white/15">
                        {roadmapStepText}
                      </span>
                    </button>

                    {/* Launch Start Modal Button */}
                    <button
                      onClick={() => handleOpenStartQuizModal(selectedQuiz)}
                      className="w-11 h-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 shadow-xs border-b-[3px] border-[#3b3dbf]"
                      title="Configure & Start Quiz"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>

                    {/* Quick Practice Button */}
                    <button
                      onClick={() => navigate(`/quiz/${selectedQuiz.id}/play?mode=mcq`)}
                      className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 hover:bg-indigo-50/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 border-2 border-indigo-100 dark:border-slate-700 hover:border-indigo-300 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 shadow-2xs border-b-[3px] border-indigo-200"
                      title="Instant MCQ Practice"
                    >
                      <Trophy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </button>

                    {/* Details Button */}
                    <button
                      onClick={() => navigate(`/quiz/${selectedQuiz.id}`)}
                      className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 shadow-2xs border-b-[3px] border-slate-300"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Standard / Non-Roadmap Decks */
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {/* Start Quiz with Modal */}
                    <button
                      onClick={() => handleOpenStartQuizModal(selectedQuiz)}
                      className="flex-1 min-w-0 h-11 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-[#3b3dbf] select-none"
                    >
                      <Play className="w-4 h-4 fill-current shrink-0" />
                      <span className="truncate">Start Quiz</span>
                    </button>

                    {/* Instant Practice MCQ */}
                    <button
                      onClick={() => navigate(`/quiz/${selectedQuiz.id}/play?mode=mcq`)}
                      className="flex-1 min-w-0 h-11 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-indigo-50/50 text-slate-800 dark:text-slate-200 border-2 border-indigo-100 dark:border-slate-700 hover:border-indigo-300 font-black text-xs sm:text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-indigo-200 select-none"
                    >
                      <Trophy className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="truncate">Practice</span>
                    </button>

                    {/* Details Button */}
                    <button
                      onClick={() => navigate(`/quiz/${selectedQuiz.id}`)}
                      className="h-11 px-3 sm:px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-b-[3px] border-slate-300 select-none shrink-0"
                    >
                      <Eye className="w-4 h-4 text-slate-500" />
                      <span className="hidden sm:inline">Details</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'discover' && (
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <button
                  onClick={() => enrollMutation.mutate(selectedQuiz.id)}
                  className="flex-1 h-11 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-[#3b3dbf] select-none"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add to My Quizzes</span>
                </button>
                <button
                  onClick={() => navigate(`/quiz/${selectedQuiz.id}`)}
                  className="h-11 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-indigo-50/30 border-2 border-indigo-100 dark:border-slate-700 hover:border-indigo-300 text-slate-800 dark:text-slate-200 font-black text-xs shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-indigo-200 select-none"
                >
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>View Details</span>
                </button>
              </div>
            )}

            {activeTab === 'archived' && (
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <button
                  onClick={() => archiveMutation.mutate(selectedQuiz.id)}
                  className="flex-1 h-11 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-slate-950 select-none"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  <span>Restore Quiz</span>
                </button>
                <button
                  onClick={() => navigate(`/quiz/${selectedQuiz.id}`)}
                  className="h-11 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-b-[3px] border-slate-300 select-none"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span>View Details</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ MODALS ═══════════ */}
      {/* Quiz Start Modal */}
      {quizForStartModal && (
        <QuizStartModal
          isOpen={isStartModalOpen}
          onClose={() => {
            setIsStartModalOpen(false)
            setQuizForStartModal(null)
          }}
          quizId={quizForStartModal.id}
          quizTitle={quizForStartModal.title}
          totalQuestions={quizForStartModal.questions_count}
        />
      )}

      {/* Folder Create/Edit Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-[250] bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {editingFolder ? 'Edit Folder' : 'Create New Folder'}
              </h3>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Folder Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. JLPT N2, Biology Grade 12..."
                  value={folderFormTitle}
                  onChange={e => setFolderFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Brief notes about this group of quizzes..."
                  value={folderFormDesc}
                  onChange={e => setFolderFormDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Color Theme
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['indigo', 'purple', 'emerald', 'amber'] as const).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFolderFormColor(c)}
                      className={cn(
                        "py-2 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer",
                        folderFormColor === c
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black shadow-xs"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Select Quizzes to Include
                </label>
                <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-800">
                  {(data?.my_quizzes || []).map(q => {
                    const isChecked = folderFormQuizIds.includes(q.id)
                    return (
                      <label
                        key={q.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-200"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setFolderFormQuizIds(prev =>
                              isChecked ? prev.filter(id => id !== q.id) : [...prev, q.id]
                            )
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">{q.title}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFolder}
                  disabled={!folderFormTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xs shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  Save Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
