import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  Sparkles,
  StickyNote,
  MessageSquare,
  Volume2,
  X,
  RotateCcw,
  Copy,
  Check,
  Edit3,
  ChevronRight,
  Clock,
  Send,
  Heart,
  Trash2,
  BookOpen,
  LayoutGrid,
  FileText,
  Lightbulb,
  CornerDownRight,
  CheckCircle2,
  XCircle,
  Flame,
  Trophy,
  Target,
  Layers,
  Info
} from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

export interface QuizCardHubDrawerProps {
  isOpen: boolean
  onClose: () => void
  activeSubTab?: 'stats' | 'insight' | 'note' | 'community'
  onSubTabChange?: (tab: 'stats' | 'insight' | 'note' | 'community') => void
  currentQuestion: any
  currentIndex?: number
  totalQuestions?: number
  canEdit?: boolean
  onNextQuestion?: () => void
  onSaveExplanation?: (content: string) => Promise<void>
  onClearAIExplanation?: () => Promise<void>
  onAskAIExplanation?: () => Promise<void>
  isAskingAI?: boolean
  passageContent?: string
  showLocalToast?: (msg: string, type?: 'info' | 'success' | 'warning') => void
}

export const QuizCardHubDrawer: React.FC<QuizCardHubDrawerProps> = ({
  isOpen,
  onClose,
  activeSubTab = 'stats',
  onSubTabChange,
  currentQuestion,
  currentIndex = 0,
  totalQuestions = 0,
  canEdit = false,
  onNextQuestion,
  onSaveExplanation,
  onClearAIExplanation,
  onAskAIExplanation,
  isAskingAI = false,
  passageContent,
  showLocalToast
}) => {
  const { user } = useAppStore()
  const [currentTab, setCurrentTab] = useState<'stats' | 'insight' | 'note' | 'community'>(activeSubTab)

  useEffect(() => {
    if (activeSubTab) {
      setCurrentTab(activeSubTab)
    }
  }, [activeSubTab])

  const handleTabSwitch = (tab: 'stats' | 'insight' | 'note' | 'community') => {
    setCurrentTab(tab)
    onSubTabChange?.(tab)
  }

  // ── 1. Stats state ──
  const [cardDetails, setCardDetails] = useState<any>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(false)

  const fetchDetailedStats = useCallback(async () => {
    if (!currentQuestion?.id) return
    setIsStatsLoading(true)
    try {
      const res = await axios.get(`/api/v1/quiz/question/${currentQuestion.id}/detailed-stats`)
      if (res.data) {
        setCardDetails(res.data)
      }
    } catch (e) {
      console.error("Failed to fetch detailed stats:", e)
    } finally {
      setIsStatsLoading(false)
    }
  }, [currentQuestion?.id])

  useEffect(() => {
    if (isOpen && currentQuestion?.id) {
      fetchDetailedStats()
    }
  }, [isOpen, currentQuestion?.id, fetchDetailedStats])

  // ── 2. Insights Accordion & Editing ──
  const [openAccordionIds, setOpenAccordionIds] = useState<string[]>(['explanation'])
  const [isEditingInsight, setIsEditingInsight] = useState(false)
  const [insightEditContent, setInsightEditContent] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  const toggleAccordion = (id: string) => {
    setOpenAccordionIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleCopyInsight = () => {
    const text = currentQuestion?.ai_explanation || currentQuestion?.explanation || currentQuestion?.content || ''
    if (text) {
      navigator.clipboard.writeText(text)
      setIsCopied(true)
      showLocalToast?.("Copied to clipboard!", "success")
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  // ── 3. Personal Note state ──
  const [personalNote, setPersonalNote] = useState('')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)

  const fetchPersonalNote = useCallback(async () => {
    if (!currentQuestion?.id) return
    try {
      const res = await axios.get(`/api/v1/quiz/question/${currentQuestion.id}/note`)
      if (res.data && res.data.note !== undefined) {
        setPersonalNote(res.data.note || '')
      }
    } catch (e) {
      // Endpoint may not exist, fallback gracefully
      setPersonalNote('')
    }
  }, [currentQuestion?.id])

  useEffect(() => {
    if (isOpen && currentQuestion?.id) {
      fetchPersonalNote()
    }
  }, [isOpen, currentQuestion?.id, fetchPersonalNote])

  const handleSaveNote = async () => {
    if (!currentQuestion?.id) return
    setIsSavingNote(true)
    try {
      await axios.post(`/api/v1/quiz/question/${currentQuestion.id}/note`, { note: personalNote })
      setIsEditingNote(false)
      showLocalToast?.("Personal note saved!", "success")
    } catch (e) {
      console.error("Failed to save note:", e)
      setIsEditingNote(false)
    } finally {
      setIsSavingNote(false)
    }
  }

  // ── 4. Community Contributions state ──
  const [contributions, setContributions] = useState<any[]>([])
  const [isContributionsLoading, setIsContributionsLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({})
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const fetchContributions = useCallback(async () => {
    if (!currentQuestion?.id) return
    setIsContributionsLoading(true)
    try {
      const res = await axios.get(`/api/v1/quiz/question/${currentQuestion.id}/contributions`)
      if (res.data && Array.isArray(res.data)) {
        setContributions(res.data)
      }
    } catch (e) {
      console.error("Failed to fetch contributions:", e)
    } finally {
      setIsContributionsLoading(false)
    }
  }, [currentQuestion?.id])

  useEffect(() => {
    if (isOpen && currentTab === 'community' && currentQuestion?.id) {
      fetchContributions()
    }
  }, [isOpen, currentTab, currentQuestion?.id, fetchContributions])

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!commentText.trim() || !currentQuestion?.id) return
    setIsSubmittingComment(true)
    try {
      await axios.post(`/api/v1/quiz/question/${currentQuestion.id}/contributions`, {
        content: commentText.trim(),
        type: 'comment'
      })
      setCommentText('')
      showLocalToast?.("Comment posted!", "success")
      fetchContributions()
    } catch (e) {
      console.error("Failed to post comment:", e)
      showLocalToast?.("Failed to post comment", "warning")
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleAddReply = async (parentId: number) => {
    const text = replyInputs[parentId]?.trim()
    if (!text || !currentQuestion?.id) return
    try {
      await axios.post(`/api/v1/quiz/question/${currentQuestion.id}/contributions`, {
        content: text,
        type: 'comment',
        parent_id: parentId
      })
      setReplyInputs(prev => ({ ...prev, [parentId]: '' }))
      setActiveReplyId(null)
      fetchContributions()
    } catch (e) {
      console.error("Failed to reply:", e)
    }
  }

  const handleToggleLike = async (contribId: number) => {
    try {
      const res = await axios.post(`/api/v1/quiz/contributions/${contribId}/like`)
      if (res.data) {
        const updateTree = (list: any[]): any[] => {
          return list.map(c => {
            if (c.id === contribId) {
              return { ...c, is_liked_by_me: res.data.liked, likes_count: res.data.likes_count }
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateTree(c.replies) }
            }
            return c
          })
        }
        setContributions(prev => updateTree(prev))
      }
    } catch (e) {
      console.error("Like failed:", e)
    }
  }

  const handleDeleteComment = async (contribId: number) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return
    try {
      await axios.delete(`/api/v1/quiz/contributions/${contribId}`)
      fetchContributions()
    } catch (e) {
      console.error("Delete failed:", e)
    }
  }

  // ── Pronunciation / Sound TTS ──
  const speakQuestion = (text?: string) => {
    const content = text || currentQuestion?.content || ''
    if (!content) return
    try {
      window.speechSynthesis?.cancel()
      const u = new SpeechSynthesisUtterance(content)
      u.rate = 0.95
      window.speechSynthesis?.speak(u)
    } catch (e) {
      console.error("TTS failed:", e)
    }
  }

  const formatSeconds = (sec: number) => {
    if (!sec || sec <= 0) return '0s'
    if (sec < 60) return `${Math.round(sec)}s`
    const m = Math.floor(sec / 60)
    const s = Math.round(sec % 60)
    return `${m}m ${s > 0 ? `${s}s` : ''}`
  }

  const effectiveCard = cardDetails?.card || {
    box_level: currentQuestion?.box_level || 1,
    consecutive_correct: currentQuestion?.stats?.correct || 0,
    reviews_summary: {
      total_reviews: currentQuestion?.stats?.total || 0,
      total_time_seconds: Math.round((currentQuestion?.stats?.total || 0) * (currentQuestion?.stats?.avg_time || 0)),
      avg_time_seconds: currentQuestion?.stats?.avg_time || 0,
      correct_count: currentQuestion?.stats?.correct || 0,
      incorrect_count: Math.max(0, (currentQuestion?.stats?.total || 0) - (currentQuestion?.stats?.correct || 0)),
      accuracy_percent: currentQuestion?.stats?.total > 0
        ? Math.round(((currentQuestion?.stats?.correct || 0) / currentQuestion.stats.total) * 100)
        : 0,
      incorrect_percent: currentQuestion?.stats?.total > 0
        ? Math.round((Math.max(0, (currentQuestion?.stats?.total || 0) - (currentQuestion?.stats?.correct || 0)) / currentQuestion.stats.total) * 100)
        : 0
    }
  }

  const totalReviews = effectiveCard.reviews_summary?.total_reviews ?? 0
  const correctCount = effectiveCard.reviews_summary?.correct_count ?? 0
  const incorrectCount = effectiveCard.reviews_summary?.incorrect_count ?? Math.max(0, totalReviews - correctCount)
  const accuracyPercent = effectiveCard.reviews_summary?.accuracy_percent ?? (totalReviews > 0 ? Math.round((correctCount / totalReviews) * 100) : 0)
  const incorrectPercent = effectiveCard.reviews_summary?.incorrect_percent ?? (totalReviews > 0 ? Math.round((incorrectCount / totalReviews) * 100) : 0)
  const currentBoxLevel = effectiveCard.box_level || 1
  const consecutiveStreak = effectiveCard.consecutive_correct || 0

  const difficultyInfo = useMemo(() => {
    if (totalReviews === 0) return { label: 'Unranked', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' }
    if (accuracyPercent >= 80) return { label: 'Easy', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' }
    if (accuracyPercent >= 50) return { label: 'Medium', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' }
    return { label: 'Hard', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' }
  }, [totalReviews, accuracyPercent])

  const leitnerStages = [
    { box: 1, title: 'Box 1', label: 'Learning', desc: 'Entry / Reset', req: 'Initial' },
    { box: 2, title: 'Box 2', label: 'Developing', desc: '2 in a row', req: '2 in a row' },
    { box: 3, title: 'Box 3', label: 'Familiar', desc: '3 in a row', req: '3 in a row' },
    { box: 4, title: 'Box 4', label: 'Proficient', desc: '4 in a row', req: '4 in a row' },
    { box: 5, title: 'Box 5', label: 'Mastered', desc: '5+ in a row', req: '5 in a row 🏆' },
  ]

  const subtabs = [
    { id: 'stats' as const, label: 'STATS', icon: BarChart3 },
    { id: 'insight' as const, label: 'INSIGHT', icon: Sparkles },
    { id: 'note' as const, label: 'NOTE', icon: StickyNote },
    { id: 'community' as const, label: 'COMMUNITY', icon: MessageSquare }
  ]

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-x-0 top-0 bottom-12 z-[250] bg-[#F8FAFC] flex flex-col select-none overflow-hidden"
        >
          {/* ════════════ TOP HEADER ════════════ */}
          <header className="flex-shrink-0 z-[120] bg-white/95 backdrop-blur-2xl border-b border-slate-100/90 px-4 py-2.5 flex items-center justify-between shadow-[0_1px_15px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                {currentTab === 'stats' ? <BarChart3 className="w-4 h-4" /> :
                 currentTab === 'insight' ? <Sparkles className="w-4 h-4" /> :
                 currentTab === 'note' ? <StickyNote className="w-4 h-4" /> :
                 <MessageSquare className="w-4 h-4" />}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight truncate leading-snug">
                  {currentTab === 'stats' ? 'QUESTION PERFORMANCE & STATS' :
                   currentTab === 'insight' ? 'ASSISTANT INSIGHTS & MNEMONICS' :
                   currentTab === 'note' ? 'PERSONAL STUDY NOTES' :
                   'COMMUNITY DISCUSSION & FEEDBACK'}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold truncate">
                  Question #{currentIndex + 1}: {currentQuestion?.content || 'Question'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => speakQuestion()}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/60 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Pronunciation"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/60 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Close Card Hub"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* ════════════ SCROLLABLE CONTENT BODY ════════════ */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 custom-scrollbar space-y-4 text-left pb-16">
            
            {/* ─────────────────────────────────────────────────────────────
                TAB 1: STATS (Image 2)
               ───────────────────────────────────────────────────────────── */}
            {currentTab === 'stats' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* 1. Overview Card */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden space-y-2.5">
                  <div className="h-1.5 absolute top-0 inset-x-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-500" />
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-wider">
                          CARD #{currentIndex + 1}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider",
                          effectiveCard.box_level === 5 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          effectiveCard.box_level >= 3 ? "bg-blue-50 text-blue-600 border-blue-100" :
                          "bg-indigo-50 text-indigo-600 border-indigo-100"
                        )}>
                          LEITNER BOX {effectiveCard.box_level || 1} / 5
                        </span>
                        {effectiveCard.consecutive_correct > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 border border-violet-100 text-[9px] font-black">
                            🔥 {effectiveCard.consecutive_correct} streak
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-800 leading-snug">
                        {currentQuestion?.content || "Question Content"}
                      </h3>
                      {currentQuestion?.explanation && (
                        <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed line-clamp-2">
                          {currentQuestion.explanation}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => speakQuestion()}
                      className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100/60 flex items-center justify-center transition-all active:scale-90 shrink-0 cursor-pointer"
                      title="Play Pronunciation"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Four Hero KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Total Attempts */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">TOTAL ATTEMPTS</span>
                    <span className="text-lg font-black text-slate-800">{totalReviews}</span>
                    <span className={cn(
                      "text-[8.5px] font-bold",
                      accuracyPercent >= 80 ? "text-emerald-600" :
                      accuracyPercent >= 50 ? "text-indigo-600" :
                      totalReviews > 0 ? "text-rose-600" : "text-slate-400"
                    )}>
                      Accuracy: {accuracyPercent}%
                    </span>
                  </div>

                  {/* Response Time */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">RESPONSE TIME</span>
                    <span className="text-lg font-black text-slate-800">
                      {effectiveCard.reviews_summary?.avg_time_seconds ? `${effectiveCard.reviews_summary.avg_time_seconds}s` : '0s'}
                    </span>
                    <span className="text-[8.5px] font-bold text-slate-400">
                      Avg {effectiveCard.reviews_summary?.avg_time_seconds ?? 0}s / attempt
                    </span>
                  </div>

                  {/* Leitner Box Level */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">LEITNER BOX</span>
                    <span className={cn(
                      "text-lg font-black",
                      currentBoxLevel === 5 ? "text-emerald-600" :
                      currentBoxLevel >= 3 ? "text-blue-600" : "text-violet-600"
                    )}>
                      Box {currentBoxLevel} / 5
                    </span>
                    <span className="text-[8.5px] font-bold text-slate-500">
                      {currentBoxLevel === 5 ? '🏆 Mastered' :
                       currentBoxLevel === 4 ? 'Proficient' :
                       currentBoxLevel === 3 ? 'Familiar' :
                       currentBoxLevel === 2 ? 'Developing' : 'Learning'}
                    </span>
                  </div>

                  {/* Difficulty */}
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">DIFFICULTY</span>
                    <span className={cn("text-lg font-black", difficultyInfo.color)}>
                      {difficultyInfo.label}
                    </span>
                    <span className="text-[8.5px] font-bold text-slate-400">
                      {consecutiveStreak > 0 ? `${consecutiveStreak} in a row` : 'No streak'}
                    </span>
                  </div>
                </div>

                {/* 3. Quiz Answer Performance Breakdown */}
                <div className="bg-white p-4 sm:p-4.5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-indigo-600" />
                      Answer Breakdown
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400">
                      {totalReviews} attempts total
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {/* CORRECT */}
                    <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-100/90 flex flex-col items-center justify-center text-center">
                      <div className="flex items-center gap-1 mb-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span className="text-[8.5px] font-black text-emerald-600 uppercase tracking-wider">CORRECT</span>
                      </div>
                      <span className="text-lg sm:text-xl font-black text-emerald-700">{correctCount}</span>
                      <span className="text-[8.5px] font-bold text-emerald-600">{accuracyPercent}%</span>
                    </div>

                    {/* INCORRECT */}
                    <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-100/90 flex flex-col items-center justify-center text-center">
                      <div className="flex items-center gap-1 mb-0.5">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        <span className="text-[8.5px] font-black text-rose-500 uppercase tracking-wider">INCORRECT</span>
                      </div>
                      <span className="text-lg sm:text-xl font-black text-rose-700">{incorrectCount}</span>
                      <span className="text-[8.5px] font-bold text-rose-500">{incorrectPercent}%</span>
                    </div>

                    {/* STREAK */}
                    <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-100/90 flex flex-col items-center justify-center text-center">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Flame className="w-3 h-3 text-indigo-600" />
                        <span className="text-[8.5px] font-black text-indigo-600 uppercase tracking-wider">STREAK</span>
                      </div>
                      <span className="text-lg sm:text-xl font-black text-indigo-700">{consecutiveStreak}</span>
                      <span className="text-[8px] font-bold text-indigo-600 truncate max-w-full">
                        {currentBoxLevel >= 5 ? 'Max Level 🏆' : `${Math.max(1, currentBoxLevel + 1 - consecutiveStreak)} to Box ${currentBoxLevel + 1}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Leitner Mastery Ladder (5 Boxes) */}
                <div className="bg-white p-4 sm:p-4.5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-indigo-600" />
                      Leitner Mastery Ladder
                    </h4>
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                      currentBoxLevel === 5 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-indigo-50 text-indigo-600 border-indigo-200"
                    )}>
                      {currentBoxLevel === 5 ? '🏆 Goal Completed' : `Box ${currentBoxLevel} of 5`}
                    </span>
                  </div>

                  {/* 5-Step Progress Grid */}
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {leitnerStages.map((st) => {
                      const isCurrent = currentBoxLevel === st.box
                      const isCompleted = currentBoxLevel > st.box
                      return (
                        <div
                          key={st.box}
                          className={cn(
                            "relative p-2 rounded-2xl flex flex-col items-center text-center transition-all",
                            isCurrent
                              ? "bg-orange-50/90 border-2 border-orange-400 shadow-sm ring-2 ring-orange-100 scale-[1.02]"
                              : isCompleted
                              ? "bg-slate-50 border border-slate-200/80 opacity-90"
                              : "bg-slate-50/50 border border-dashed border-slate-200 opacity-60"
                          )}
                        >
                          {/* Indicator badge */}
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black mb-1",
                            isCurrent
                              ? "bg-orange-500 text-white shadow-2xs"
                              : isCompleted
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-500"
                          )}>
                            {isCompleted ? <Check className="w-3 h-3" /> : st.box}
                          </div>

                          <span className={cn(
                            "text-[9px] sm:text-[10px] font-black leading-tight truncate w-full",
                            isCurrent ? "text-indigo-700" : isCompleted ? "text-slate-700" : "text-slate-400"
                          )}>
                            {st.label}
                          </span>

                          <span className="text-[7.5px] font-bold text-slate-400 mt-0.5 hidden sm:block">
                            {st.req}
                          </span>

                          {isCurrent && (
                            <span className="mt-1 px-1.5 py-0.2 rounded-md bg-indigo-600 text-white text-[7px] font-black tracking-widest uppercase">
                              NOW
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Micro Rule Pill */}
                  <div className="p-2.5 rounded-2xl bg-slate-50/90 border border-slate-200/60 flex items-center gap-2 text-left">
                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <p className="text-[9.5px] font-semibold text-slate-500 leading-snug">
                      <strong className="text-slate-700 font-bold">Leitner Rule:</strong> Correct answers advance question to next box (+1 streak). An incorrect answer immediately resets to <strong className="text-rose-600 font-bold">Box 1</strong> for relearning.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 2: INSIGHT (Image 3)
               ───────────────────────────────────────────────────────────── */}
            {currentTab === 'insight' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* 1. Main Explanation Accordion Item */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('explanation')}
                    className="w-full px-4 py-3 flex items-center justify-between text-left bg-slate-50/70 hover:bg-slate-100/60 transition-all cursor-pointer border-b border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                        GIẢI THÍCH CHI TIẾT (MẶT SAU)
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                    </div>
                    <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", openAccordionIds.includes('explanation') && "rotate-90")} />
                  </button>

                  {openAccordionIds.includes('explanation') && (
                    <div className="p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && currentQuestion?.ai_explanation && (
                          <button
                            type="button"
                            onClick={() => onClearAIExplanation?.()}
                            className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-all"
                          >
                            CLEAR AI
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingInsight) {
                                onSaveExplanation?.(insightEditContent)
                                setIsEditingInsight(false)
                              } else {
                                setInsightEditContent(currentQuestion?.ai_explanation || currentQuestion?.explanation || '')
                                setIsEditingInsight(true)
                              }
                            }}
                            className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 cursor-pointer transition-all"
                          >
                            {isEditingInsight ? 'SAVE' : 'EDIT'}
                          </button>
                        )}
                      </div>

                      {isEditingInsight ? (
                        <textarea
                          value={insightEditContent}
                          onChange={(e) => setInsightEditContent(e.target.value)}
                          className="w-full h-48 p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                          placeholder="Nhập giải thích cho câu hỏi..."
                        />
                      ) : (
                        <div className="text-slate-700 font-medium text-sm leading-relaxed markdown-content whitespace-pre-wrap break-words pr-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {currentQuestion?.ai_explanation || currentQuestion?.explanation || "Chưa có giải thích chi tiết cho câu hỏi này."}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Passage Accordion Item (if present) */}
                {passageContent && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleAccordion('passage')}
                      className="w-full px-4 py-3 flex items-center justify-between text-left bg-slate-50/70 hover:bg-slate-100/60 transition-all cursor-pointer border-b border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                          ĐOẠN VĂN / BÀI ĐỌC (PASSAGE)
                        </span>
                      </div>
                      <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", openAccordionIds.includes('passage') && "rotate-90")} />
                    </button>
                    {openAccordionIds.includes('passage') && (
                      <div className="p-4 bg-white text-slate-700 font-medium text-xs leading-relaxed markdown-content whitespace-pre-wrap">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                          {passageContent}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Ask AI Prompt CTA */}
                {!currentQuestion?.ai_explanation && onAskAIExplanation && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/70 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 animate-pulse" />
                      <div className="text-left">
                        <p className="text-xs font-black text-indigo-950">Muốn phân tích sâu hơn?</p>
                        <p className="text-[10px] font-semibold text-indigo-700/80">Nhờ AI giải thích chi tiết ngữ pháp, cấu trúc và từ vựng.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAskAIExplanation()}
                      disabled={isAskingAI}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-[10px] uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      {isAskingAI ? "ĐANG TẠO..." : "HỎI AI"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 3: NOTE
               ───────────────────────────────────────────────────────────── */}
            {currentTab === 'note' && (
              <div className="space-y-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-violet-600" />
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Ghi chú học tập</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingNote) handleSaveNote()
                      else setIsEditingNote(true)
                    }}
                    className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 cursor-pointer transition-all"
                  >
                    {isEditingNote ? (isSavingNote ? 'SAVING...' : 'SAVE NOTE') : 'EDIT NOTE'}
                  </button>
                </div>

                {isEditingNote ? (
                  <textarea
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    className="w-full h-56 p-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-violet-500 outline-none resize-none transition-all"
                    placeholder="Viết ghi chú riêng cho câu hỏi này (Hỗ trợ Markdown)..."
                    autoFocus
                  />
                ) : (
                  <div className="min-h-[140px] text-slate-700 text-xs font-medium leading-relaxed markdown-content">
                    {personalNote ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {personalNote}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-slate-400 italic">Chưa có ghi chú cá nhân nào. Bấm 'EDIT NOTE' để thêm ghi chú của bạn.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                TAB 4: COMMUNITY
               ───────────────────────────────────────────────────────────── */}
            {currentTab === 'community' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Comment Input */}
                <form onSubmit={handleAddComment} className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Đặt câu hỏi hoặc chia sẻ mẹo làm bài</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="community-comment-input"
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Viết câu hỏi hoặc thảo luận cho câu hỏi này..."
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-2.5">
                  {isContributionsLoading ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400 animate-pulse">
                      Đang tải thảo luận...
                    </div>
                  ) : contributions.length === 0 ? (
                    <div className="py-8 text-center bg-white rounded-2xl border border-slate-200/80 p-6">
                      <p className="text-xs font-black text-slate-700 mb-1">Chưa có bình luận nào</p>
                      <p className="text-[11px] text-slate-400">Hãy là người đầu tiên đặt câu hỏi hoặc chia sẻ mẹo ghi nhớ cho câu này!</p>
                    </div>
                  ) : (
                    contributions.map((c) => (
                      <div key={c.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-black text-[10px] flex items-center justify-center shrink-0">
                              {c.user?.username ? c.user.username.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className="text-xs font-black text-slate-800 truncate">{c.user?.username || 'User'}</span>
                            <span className="text-[9px] text-slate-400 font-medium">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleLike(c.id)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                                c.is_liked_by_me ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:bg-slate-50"
                              )}
                            >
                              <Heart className={cn("w-3 h-3", c.is_liked_by_me && "fill-rose-500 text-rose-500")} />
                              <span>{c.likes_count || 0}</span>
                            </button>
                            {(user?.role === 'admin' || user?.id === c.user_id) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 font-medium leading-relaxed pl-8 whitespace-pre-wrap">{c.content}</p>

                        {/* Replies */}
                        {c.replies && c.replies.length > 0 && (
                          <div className="pl-8 pt-2 space-y-2 border-t border-slate-100 mt-2">
                            {c.replies.map((rep: any) => (
                              <div key={rep.id} className="flex items-start gap-2 bg-slate-50/80 p-2 rounded-xl">
                                <CornerDownRight className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[10px] font-bold text-slate-800">{rep.user?.username || 'User'}</span>
                                    <span className="text-[8.5px] text-slate-400">{rep.created_at ? new Date(rep.created_at).toLocaleDateString() : ''}</span>
                                  </div>
                                  <p className="text-xs text-slate-700 leading-normal">{rep.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply trigger & form */}
                        <div className="pl-8 pt-1">
                          {activeReplyId === c.id ? (
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="text"
                                value={replyInputs[c.id] || ''}
                                onChange={(e) => setReplyInputs({ ...replyInputs, [c.id]: e.target.value })}
                                placeholder="Viết phản hồi..."
                                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddReply(c.id)}
                                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                              >
                                Gửi
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveReplyId(null)}
                                className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveReplyId(c.id)}
                              className="text-[10px] font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
                            >
                              Trả lời
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

          {/* ════════════ DOCKED BOTTOM BAR (Image 2 & 3) ════════════ */}
          <div className="bg-white/95 backdrop-blur-xl border-t border-slate-100 sticky bottom-0 z-50 flex-shrink-0 shadow-lg">
            {/* Contextual Action Bar */}
            <div className="px-3 py-1.5 border-b border-slate-50 flex items-center justify-between gap-1.5 text-xs">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-2.5 flex items-center justify-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Close Card Hub"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>CLOSE</span>
                </button>

                {currentTab === 'stats' && (
                  <button
                    type="button"
                    onClick={fetchDetailedStats}
                    disabled={isStatsLoading}
                    className="h-8 px-2.5 flex items-center justify-center gap-1 rounded-lg border bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <RotateCcw className={cn("w-3 h-3", isStatsLoading && "animate-spin")} />
                    <span>REFRESH</span>
                  </button>
                )}

                {currentTab === 'insight' && (
                  <button
                    type="button"
                    onClick={handleCopyInsight}
                    className={cn(
                      "h-8 px-2.5 flex items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0",
                      isCopied
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600"
                    )}
                  >
                    {isCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? 'COPIED' : 'COPY'}</span>
                  </button>
                )}

                {currentTab === 'note' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingNote) handleSaveNote()
                      else setIsEditingNote(true)
                    }}
                    className={cn(
                      "h-8 px-2.5 flex items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0",
                      isEditingNote
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600"
                    )}
                  >
                    {isEditingNote ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>SAVE NOTE</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3 h-3" />
                        <span>EDIT NOTE</span>
                      </>
                    )}
                  </button>
                )}

                {currentTab === 'community' && (
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('community-comment-input')?.focus()
                    }}
                    className="h-8 px-2.5 flex items-center justify-center gap-1 rounded-lg border bg-slate-50 border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>COMMENT</span>
                  </button>
                )}
              </div>

              {onNextQuestion && (
                <button
                  type="button"
                  onClick={() => {
                    onNextQuestion()
                  }}
                  className="h-8 px-3 flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
                >
                  <span>NEXT</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 4 Bottom Segmented Tabs */}
            <div className="w-full grid grid-cols-4 bg-white p-0 relative border-t border-slate-100">
              {subtabs.map((tab) => {
                const isActive = currentTab === tab.id
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabSwitch(tab.id)}
                    className={cn(
                      "py-2.5 flex flex-col items-center justify-center gap-1 border-b-2 transition-all cursor-pointer select-none",
                      isActive
                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/20 font-black"
                        : "border-transparent text-slate-400 hover:text-slate-600 font-bold"
                    )}
                  >
                    <IconComponent className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                    <span className="text-[9px] uppercase tracking-wider leading-none">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
