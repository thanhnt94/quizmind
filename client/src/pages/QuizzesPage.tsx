import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, Plus, ChevronRight, Archive, 
  RotateCcw, Users, Trophy, X,
  Play, Sparkles, Layers, Eye, Check,
  Compass, ChevronDown, BookOpen, Folder as FolderIcon, FolderPlus,
  Edit3, Trash2, Settings, Target, Flame, Globe, Award, Bookmark,
  CheckCircle2, ArrowRight
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useRoadmapStatus } from '@/hooks/useRoadmapStatus'

export interface Quiz {
  id: number
  title: string
  description?: string
  cover_image: string | null
  questions_count: number
  tags: string[]
  creator_id?: number
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
  gamify: { level: number; xp: number; streak: number }
  stats_summary: { avg_accuracy: number; total_time_hours: number; total_questions: number }
}

export interface FolderData {
  id: number
  title: string
  description?: string
  color: 'indigo' | 'emerald' | 'amber' | 'purple'
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
  { icon: Award, gradient: 'from-teal-500 to-emerald-600', iconColor: 'text-white', bgLight: 'bg-teal-50', accentColor: '#0D9488' }
]

export function getDeckTheme(quiz: { id: number; title?: string }): DeckTheme {
  const idNum = Math.abs(quiz.id || 0)
  const titleSum = (quiz.title || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const index = (idNum * 17 + titleSum) % DECK_THEMES.length
  return DECK_THEMES[index]
}

export default function QuizzesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as QuizzesTab
  const activeTab: QuizzesTab = ['my', 'folders', 'discover', 'archived'].includes(tabParam) ? tabParam : 'my'

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)

  // Folder modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderData | null>(null)
  const [folderFormTitle, setFolderFormTitle] = useState('')
  const [folderFormDesc, setFolderFormDesc] = useState('')
  const [folderFormColor, setFolderFormColor] = useState<'indigo' | 'emerald' | 'amber' | 'purple'>('indigo')
  const [folderFormQuizIds, setFolderFormQuizIds] = useState<number[]>([])

  const { user, setUser, setGamify } = useAppStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // State-driven folders for subject/topic organization
  const [folders, setFolders] = useState<FolderData[]>([
    { id: 1, title: 'Exam Prep & Core Reviews', description: 'Essential questions for upcoming tests', color: 'indigo', quiz_ids: [] },
    { id: 2, title: 'Weak Areas & Difficult Concepts', description: 'Questions needing extra attention', color: 'purple', quiz_ids: [] },
  ])

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      if (res.data.user) setUser(res.data.user)
      if (res.data.gamify) setGamify(res.data.gamify)
      return res.data
    },
    staleTime: 30 * 1000,
  })

  const setActiveTab = (tab: QuizzesTab) => {
    setSearchParams(prev => {
      const u = new URLSearchParams(prev)
      u.set('tab', tab)
      return u
    }, { replace: true })
  }

  // Active quiz dataset based on tab
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
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const titleMatch = q.title.toLowerCase().includes(query)
        const descMatch = q.description?.toLowerCase().includes(query)
        const tagMatch = q.tags?.some(t => t.toLowerCase().includes(query))
        if (!titleMatch && !descMatch && !tagMatch) return false
      }
      if (activeTag && !q.tags?.includes(activeTag)) {
        return false
      }
      if (statusFilter === 'roadmap' && !q.has_roadmap) return false
      return true
    })
  }, [rawQuizzes, searchQuery, activeTag, statusFilter])

  // Set default selected quiz
  useEffect(() => {
    if (filteredQuizzes.length > 0 && !selectedQuizId) {
      setSelectedQuizId(filteredQuizzes[0].id)
    }
  }, [filteredQuizzes, selectedQuizId])

  const selectedQuiz = useMemo(() => {
    return filteredQuizzes.find(q => q.id === selectedQuizId) || filteredQuizzes[0] || null
  }, [filteredQuizzes, selectedQuizId])

  // Roadmap details for selected quiz
  const { status: roadmapStatus } = useRoadmapStatus(selectedQuiz?.id)

  // Save or update folder
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
  }

  const tabsConfig = [
    { id: 'my' as QuizzesTab, label: 'My Quizzes', count: data?.my_quizzes?.length || 0, icon: BookOpen },
    { id: 'folders' as QuizzesTab, label: 'Folders', count: folders.length, icon: FolderIcon },
    { id: 'discover' as QuizzesTab, label: 'Discover', count: data?.discover_quizzes?.length || 0, icon: Globe },
    { id: 'archived' as QuizzesTab, label: 'Archived', count: data?.archived_quizzes?.length || 0, icon: Archive },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC]">
      {/* ═══════════ TOP HEADER & CONTROL BAR ═══════════ */}
      <div className="shrink-0 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="max-w-[1700px] 2xl:max-w-[1900px] mx-auto flex flex-col gap-2.5">
          {/* Row 1: Title, Segmented Tabs & Desktop Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-black tracking-tight text-slate-900 leading-none">Quizzes Catalog</h1>
                  <span className="text-[10.5px] font-bold text-slate-400">Multiple Choice Questions Hub</span>
                </div>
              </div>

              {/* iOS Segmented Bar (Desktop) */}
              <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-inner gap-0.5">
                {tabsConfig.map(tab => {
                  const isActive = activeTab === tab.id
                  const TabIcon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                        isActive 
                          ? "bg-white text-slate-900 shadow-xs border border-slate-200/90 font-black" 
                          : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                      )}
                    >
                      <TabIcon className={cn("w-3.5 h-3.5", isActive ? "text-indigo-600" : "text-slate-400")} />
                      <span>{tab.label}</span>
                      <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[9.5px] font-black leading-none",
                        isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-200/70 text-slate-600"
                      )}>
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Actions: Search, Folder, New Quiz */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Search Bar (Desktop) */}
              <div className="relative hidden sm:block w-52 lg:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions or quiz..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-100/80 hover:bg-white focus:bg-white border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Create Folder Button */}
              <button
                onClick={() => {
                  setEditingFolder(null)
                  setFolderFormTitle('')
                  setFolderFormDesc('')
                  setFolderFormColor('indigo')
                  setFolderFormQuizIds([])
                  setIsFolderModalOpen(true)
                }}
                className="h-8.5 px-3 rounded-xl bg-violet-50 hover:bg-violet-100/90 border border-violet-200 hover:border-violet-300 text-violet-800 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Create or Manage Folders"
              >
                <FolderPlus className="w-4 h-4 text-violet-600 stroke-[2.2]" />
                <span className="font-extrabold text-violet-900 hidden sm:inline">Folder</span>
              </button>

              {/* New Quiz Button */}
              <Link
                to="/manage/import"
                className="h-8.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white flex items-center gap-1.5 text-xs font-black shadow-xs shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                title="Import quiz from Excel"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>New Quiz</span>
              </Link>

              {/* Mobile Search Toggle */}
              <button
                onClick={() => setIsSearchOpen(prev => !prev)}
                className={cn(
                  "sm:hidden h-8.5 w-8.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs",
                  isSearchOpen || searchQuery
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Mobile Segmented Switcher */}
          <div className="md:hidden">
            <div className="grid grid-cols-4 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 shadow-inner">
              {tabsConfig.map(tab => {
                const isActive = activeTab === tab.id
                const TabIcon = tab.icon
                const shortLabel = tab.id === 'my' ? 'Quizzes' : tab.id === 'folders' ? 'Folders' : tab.id === 'discover' ? 'Discover' : 'Archive'
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "py-1.5 px-0.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 min-w-0 select-none",
                      isActive 
                        ? "text-slate-900 font-black shadow-xs bg-white border border-slate-200/80" 
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <TabIcon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-indigo-600 stroke-[2.2]" : "text-slate-400")} />
                    <span className="truncate text-[10.5px] leading-tight">{shortLabel}</span>
                    <span className={cn(
                      "px-1 py-0.2 rounded-full text-[9px] font-black leading-none shrink-0",
                      isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-200/70 text-slate-500"
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
            <div className="sm:hidden relative mt-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                type="text"
                placeholder="Search questions or quiz..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 shadow-inner"
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

          {/* Row 3: Status Filters & Tag Chips */}
          {activeTab !== 'folders' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-0.5">
              {/* Tag selector chip */}
              {allAvailableTags.length > 0 && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setActiveTag(activeTag ? null : allAvailableTags[0])}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border cursor-pointer select-none flex items-center gap-1 shadow-2xs",
                      activeTag
                        ? "bg-indigo-600 border-indigo-600 text-white font-black"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span>{activeTag ? `🏷️ #${activeTag}` : '🏷️ Tags'}</span>
                    {activeTag && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveTag(null)
                        }}
                        className="hover:bg-white/20 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                </div>
              )}

              <div className="w-[1px] h-4 bg-slate-200 shrink-0 mx-0.5" />

              {/* Status Chips */}
              {(['all', 'roadmap', 'learning', 'unlearned', 'mastered'] as StatusFilter[]).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 border cursor-pointer select-none shadow-2xs capitalize",
                    statusFilter === status
                      ? "bg-slate-900 border-slate-900 text-white font-black"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT AREA (MASTER-DETAIL) ═══════════ */}
      <div className="flex-1 overflow-hidden max-w-[1700px] 2xl:max-w-[1900px] w-full mx-auto p-3.5 sm:p-6 lg:p-8">
        {activeTab === 'folders' ? (
          /* ═══════════ FOLDERS VIEW ═══════════ */
          <div className="h-full overflow-y-auto no-scrollbar pb-20">
            {folders.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center shadow-sm max-w-md mx-auto my-12">
                <div className="w-16 h-16 rounded-3xl bg-violet-50 flex items-center justify-center text-3xl mb-3 shadow-inner">
                  📁
                </div>
                <h3 className="text-base font-black text-slate-800 tracking-tight mb-1">
                  No folders created yet
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Organize your quizzes into categories (e.g. Biology, JLPT N2, Medical Exam) and practice all questions together.
                </p>
                <button
                  onClick={() => {
                    setEditingFolder(null)
                    setFolderFormTitle('')
                    setFolderFormDesc('')
                    setFolderFormColor('indigo')
                    setFolderFormQuizIds([])
                    setIsFolderModalOpen(true)
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <FolderPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create First Folder</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                {folders.map(folder => {
                  const memberQuizzes = (data?.my_quizzes || []).filter(q => folder.quiz_ids?.includes(q.id))
                  const totalQuestions = memberQuizzes.reduce((sum, q) => sum + (q.questions_count || 0), 0)

                  return (
                    <div
                      key={folder.id}
                      className="rounded-[24px] p-4 bg-white border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between select-none group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs shrink-0">
                              <FolderIcon className="w-6 h-6 fill-white/20" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base font-black text-slate-900 tracking-tight leading-tight truncate">
                                {folder.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black border bg-indigo-50 text-indigo-700 border-indigo-200/80">
                                  📚 {folder.quiz_ids.length} {folder.quiz_ids.length === 1 ? 'quiz' : 'quizzes'}
                                </span>
                                <span className="text-[11px] font-bold text-slate-500">
                                  📝 {totalQuestions} questions
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Menu Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingFolder(folder)
                                setFolderFormTitle(folder.title)
                                setFolderFormDesc(folder.description || '')
                                setFolderFormColor(folder.color)
                                setFolderFormQuizIds(folder.quiz_ids || [])
                                setIsFolderModalOpen(true)
                              }}
                              className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                              title="Edit Folder"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFolder(folder.id)}
                              className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                              title="Delete Folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {folder.description && (
                          <p className="text-xs text-slate-600 font-medium line-clamp-2 mt-3 leading-relaxed">
                            {folder.description}
                          </p>
                        )}

                        {/* Member Quizzes Chips */}
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            <span>Quizzes in this folder</span>
                          </div>
                          {memberQuizzes.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {memberQuizzes.slice(0, 3).map(mq => (
                                <span 
                                  key={mq.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold truncate max-w-[160px]"
                                >
                                  <BookOpen className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{mq.title}</span>
                                </span>
                              ))}
                              {memberQuizzes.length > 3 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black">
                                  +{memberQuizzes.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] font-semibold text-slate-400 italic">
                              No quizzes added yet. Click Edit to select quizzes.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (memberQuizzes.length > 0) {
                              navigate(`/quiz/${memberQuizzes[0].id}/play?mode=mcq`)
                            }
                          }}
                          disabled={memberQuizzes.length === 0}
                          className="flex-1 h-9 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs shadow-xs shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 select-none"
                        >
                          <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                          <span>Practice Folder</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* ═══════════ MASTER-DETAIL QUIZ CARDS VIEW ═══════════ */
          <div className="h-full flex gap-6 overflow-hidden">
            {/* Left: Cards List (Scrollable) */}
            <div className="flex-1 h-full overflow-y-auto no-scrollbar pb-24">
              {filteredQuizzes.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center flex flex-col items-center justify-center shadow-sm my-12">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-3xl mb-3 shadow-inner">
                    🔍
                  </div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight mb-1">
                    No quizzes found
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-5">
                    Try searching with different keywords or change the status filter to "All".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3.5">
                  <AnimatePresence mode="popLayout">
                    {filteredQuizzes.map((quiz, idx) => {
                      const isSelected = selectedQuiz?.id === quiz.id
                      const theme = getDeckTheme(quiz)
                      const ThemeIcon = theme.icon
                      const hasCover = Boolean(quiz.cover_image)

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
                            setSelectedQuizId(quiz.id)
                          }}
                          onDoubleClick={() => navigate(`/quiz/${quiz.id}`)}
                          className={cn(
                            "relative rounded-[24px] p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none",
                            isSelected
                              ? "bg-white border-2 border-indigo-600 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-400/20"
                              : "bg-white border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs"
                          )}
                        >
                          <div>
                            <div className="flex items-start gap-3">
                              {/* Mascot / Avatar */}
                              <div className="shrink-0">
                                <div className={cn(
                                  "w-14 h-14 rounded-[18px] flex items-center justify-center overflow-hidden shadow-2xs border-2 border-white",
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
                                    <ThemeIcon className="w-7 h-7 stroke-[2.2] text-white drop-shadow-2xs" />
                                  )}
                                </div>
                              </div>

                              {/* Title & Metadata */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight truncate">
                                    {quiz.title}
                                  </h4>
                                  {quiz.has_roadmap && (
                                    <span 
                                      className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-600 shrink-0 shadow-2xs"
                                      title="Smart daily roadmap enabled"
                                    >
                                      <Compass className="w-3 h-3 text-indigo-600" />
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                    {quiz.questions_count} MCQs
                                  </span>
                                  {quiz.tags?.length > 0 && (
                                    <span className="text-[10.5px] font-bold text-slate-400 truncate max-w-[120px]">
                                      #{quiz.tags[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {quiz.description && (
                              <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-2.5 leading-relaxed">
                                {quiz.description}
                              </p>
                            )}
                          </div>

                          {/* Quick Actions Row on Mobile / Card */}
                          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/quiz/${quiz.id}/play?mode=mcq`)
                              }}
                              className="flex-1 h-8.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Practice</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/quiz/${quiz.id}`)
                              }}
                              className="h-8.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Details</span>
                            </button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Right: Master-Detail Inspection Sidebar (Desktop/Tablet) */}
            {selectedQuiz && (
              <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-white border border-slate-200/80 rounded-[28px] p-5 shadow-xs shrink-0 overflow-y-auto no-scrollbar h-fit max-h-full">
                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 overflow-hidden shrink-0">
                    {selectedQuiz.cover_image ? (
                      <img src={selectedQuiz.cover_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Selected Quiz</span>
                    <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug truncate">
                      {selectedQuiz.title}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                      {selectedQuiz.questions_count} questions
                    </p>
                  </div>
                </div>

                {/* Description */}
                {selectedQuiz.description && (
                  <div className="py-3.5 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Description</span>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {selectedQuiz.description}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {selectedQuiz.tags?.length > 0 && (
                  <div className="py-3.5 border-b border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Topics & Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedQuiz.tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-bold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Roadmap & Daily Progress */}
                {roadmapStatus && (
                  <div className="py-3.5 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Pipeline</span>
                      <span className="text-xs font-black text-indigo-600">
                        {roadmapStatus.all_done ? 'Completed 🎉' : 'In Progress'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {roadmapStatus.pipeline?.map((step: any, idx: number) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex-1 h-2 rounded-full transition-all",
                            step.done ? "bg-emerald-500" : "bg-slate-100"
                          )}
                          title={step.label}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Sidebar Launch Actions */}
                <div className="pt-4 flex flex-col gap-2 mt-auto">
                  <button
                    onClick={() => navigate(`/quiz/${selectedQuiz.id}/play?mode=mcq`)}
                    className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Practice Session</span>
                  </button>

                  <button
                    onClick={() => navigate(`/quiz/${selectedQuiz.id}`)}
                    className="w-full h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Full Details & Questions</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════ FOLDER CREATE/EDIT MODAL ═══════════ */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-[250] bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {editingFolder ? 'Edit Folder' : 'Create New Folder'}
              </h3>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Select Quizzes to Include
                </label>
                <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1 border border-slate-100 rounded-xl p-2 bg-slate-50">
                  {(data?.my_quizzes || []).map(q => {
                    const isChecked = folderFormQuizIds.includes(q.id)
                    return (
                      <label
                        key={q.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer select-none text-xs font-bold text-slate-700"
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
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFolder}
                  disabled={!folderFormTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-xs shadow-xs disabled:opacity-40"
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
