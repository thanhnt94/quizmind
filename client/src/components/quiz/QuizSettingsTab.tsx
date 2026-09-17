import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Sliders, 
  Sparkles, 
  FileSpreadsheet, 
  Users, 
  AlertTriangle, 
  Save, 
  Check, 
  RotateCcw, 
  Trash2, 
  Search, 
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Clock,
  Shuffle,
  Eye,
  CheckCircle2
} from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { QuizExcelManager } from './QuizExcelManager'

export type QuizSettingsSubTab = 'general' | 'practice' | 'ai' | 'excel' | 'collab' | 'danger'

export interface QuizSettingsTabProps {
  quizId: string | number
  initialData: any
  isOwner?: boolean
  onSaved?: () => void
}

export function QuizSettingsTab({ quizId, initialData, isOwner = true, onSaved }: QuizSettingsTabProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeSubTab, setActiveSubTab] = useState<QuizSettingsSubTab>('general')

  // General Settings State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryName, setCategoryName] = useState('General')
  const [coverImage, setCoverImage] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  // Practice Defaults State
  const [timeLimit, setTimeLimit] = useState(0)
  const [defaultBatchCount, setDefaultBatchCount] = useState<number | 'all'>(10)
  const [passThreshold, setPassThreshold] = useState(80)
  const [instantFeedback, setInstantFeedback] = useState(true)
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [shuffleOptions, setShuffleOptions] = useState(true)

  // AI & Instruction State
  const [instruction, setInstruction] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')

  // Collaborators State
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearchingCollab, setIsSearchingCollab] = useState(false)

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync initial data
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '')
      setDescription(initialData.description || '')
      setCategoryName(initialData.category_name || initialData.category?.name || 'General')
      setCoverImage(initialData.cover_image || '')
      setTagsInput(Array.isArray(initialData.tags) ? initialData.tags.join(', ') : '')
      setTimeLimit(initialData.time_limit || 0)
      setInstruction(initialData.instruction || '')
      setAiPrompt(initialData.ai_prompt || '')

      const ps = initialData.practice_settings || {}
      if (ps.default_batch_count !== undefined) setDefaultBatchCount(ps.default_batch_count)
      if (ps.pass_threshold !== undefined) setPassThreshold(ps.pass_threshold)
      if (ps.instant_feedback !== undefined) setInstantFeedback(ps.instant_feedback)
      if (ps.shuffle_questions !== undefined) setShuffleQuestions(ps.shuffle_questions)
      if (ps.shuffle_options !== undefined) setShuffleOptions(ps.shuffle_options)
    }
  }, [initialData])

  // Fetch collaborators
  const fetchCollaborators = async () => {
    try {
      const res = await axios.get(`/api/v1/quiz/${quizId}/collaborators`)
      setCollaborators(res.data)
    } catch (e) {}
  }

  useEffect(() => {
    if (activeSubTab === 'collab') {
      fetchCollaborators()
    }
  }, [activeSubTab, quizId])

  // Search users with debounce
  useEffect(() => {
    if (userSearch.trim().length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearchingCollab(true)
      try {
        const res = await axios.get(`/api/v1/quiz/users/search`, { params: { q: userSearch } })
        setSearchResults(res.data)
      } catch (e) {}
      finally {
        setIsSearchingCollab(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch])

  const handleAddCollaborator = async (userId: number) => {
    try {
      await axios.post(`/api/v1/quiz/${quizId}/collaborators`, { user_id: userId })
      fetchCollaborators()
      setUserSearch('')
      setSearchResults([])
    } catch (e) {
      alert('Error adding collaborator!')
    }
  }

  const handleRemoveCollaborator = async (userId: number) => {
    try {
      await axios.delete(`/api/v1/quiz/${quizId}/collaborators/${userId}`)
      fetchCollaborators()
    } catch (e) {
      alert('Error removing collaborator!')
    }
  }

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!title.trim()) {
      setSaveError('Quiz title cannot be empty')
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    const practiceSettingsPayload = {
      default_batch_count: defaultBatchCount,
      pass_threshold: passThreshold,
      instant_feedback: instantFeedback,
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions
    }

    try {
      await axios.patch(`/api/v1/quiz/${quizId}`, {
        title: title.trim(),
        description: description.trim(),
        category_name: categoryName.trim(),
        cover_image: coverImage.trim() || null,
        time_limit: Number(timeLimit) || 0,
        instruction: instruction.trim(),
        ai_prompt: aiPrompt.trim(),
        tags: parsedTags,
        practice_settings: practiceSettingsPayload
      })

      queryClient.invalidateQueries({ queryKey: ['quiz', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      if (onSaved) onSaved()
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || 'Failed to update quiz settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetProgress = async () => {
    if (!window.confirm('⚠️ Are you sure you want to reset your practice attempts and Leitner box mastery for this quiz? All your learning statistics for this quiz will be reset to 0.')) {
      return
    }

    setIsResetting(true)
    try {
      await axios.post(`/api/v1/quiz/${quizId}/reset-progress`)
      queryClient.invalidateQueries({ queryKey: ['quiz-mastery', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
      alert('Quiz study progress and mastery reset successfully!')
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to reset progress.')
    } finally {
      setIsResetting(false)
    }
  }

  const handleDeleteQuiz = async () => {
    if (!window.confirm('🚨 PERMANENT ACTION: Delete this quiz along with all questions, options, and attempt logs? This CANNOT be undone!')) {
      return
    }

    setIsDeleting(true)
    try {
      await axios.delete(`/api/v1/quiz/${quizId}`)
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      alert('Quiz permanently deleted!')
      navigate('/quizzes', { replace: true })
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to delete quiz.')
      setIsDeleting(false)
    }
  }

  const subTabs = [
    { id: 'general' as const, label: 'General', shortLabel: 'General', icon: FileText, color: 'text-indigo-600 dark:text-indigo-400' },
    { id: 'practice' as const, label: 'Practice & Exam', shortLabel: 'Practice', icon: Sliders, color: 'text-amber-600 dark:text-amber-400' },
    { id: 'ai' as const, label: 'AI & Guidance', shortLabel: 'AI Rules', icon: Sparkles, color: 'text-purple-600 dark:text-purple-400', badge: 'AI' },
    { id: 'excel' as const, label: 'Excel Data', shortLabel: 'Excel', icon: FileSpreadsheet, color: 'text-emerald-600 dark:text-emerald-400' },
    { id: 'collab' as const, label: 'Collaborators', shortLabel: 'Collab', icon: Users, color: 'text-blue-600 dark:text-blue-400' },
    { id: 'danger' as const, label: 'Danger Zone', shortLabel: 'Danger', icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400' }
  ]

  return (
    <div className="space-y-4 text-left">
      {/* ─── STICKY TOP SUB-TAB PILL BAR ────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#F8FAFC]/95 dark:bg-[#0b0f19]/95 backdrop-blur-md pt-0.5 pb-2">
        <div className="bg-white/95 dark:bg-slate-900/95 p-1 sm:p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="grid grid-cols-3 sm:flex sm:items-center sm:gap-1">
            {subTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeSubTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(6)
                    setActiveSubTab(tab.id)
                  }}
                  className={cn(
                    "relative flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-3 rounded-xl transition-all cursor-pointer select-none",
                    isActive
                      ? "text-slate-900 dark:text-slate-100 font-black shadow-2xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeQuizSettingsSubTab"
                      className="absolute inset-0 bg-slate-100/90 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <Icon className={cn("w-4 h-4 sm:w-3.5 sm:h-3.5 relative z-10 shrink-0", isActive ? tab.color : "text-slate-400")} />
                  <span className="relative z-10 text-[10px] sm:text-xs truncate">
                    <span className="inline sm:hidden">{tab.shortLabel}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </span>
                  {tab.badge && (
                    <span className="hidden sm:inline relative z-10 px-1 py-0.2 rounded text-[9px] font-black bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 leading-none">
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Global Status Banner */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-2xl font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" /> Quiz settings saved successfully!
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-2xl font-bold animate-in fade-in">
          {saveError}
        </div>
      )}

      {/* ─── SUB-TAB CONTENT PANELS ────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {/* ══════════════ SUBTAB 1: GENERAL SETTINGS ══════════════ */}
          {activeSubTab === 'general' && (
            <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
                      Basic Quiz Properties
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Quiz title, category, description, and cover artwork
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Quiz Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter quiz title..."
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g. IT, JLPT, Security, English..."
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="AWS, SAA-C03, Practice, Exam..."
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe quiz scope, target passing score, or instructions..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Cover Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://example.com/cover.png"
                    className="flex-1 h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                {coverImage && (
                  <div className="mt-2.5 w-36 h-22 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save General Settings'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ══════════════ SUBTAB 2: PRACTICE CONFIG ══════════════ */}
          {activeSubTab === 'practice' && (
            <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
                      Practice & Exam Configuration
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Session batch counts, timers, shuffle rules, and instant feedback
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Time Limit */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-200 outline-none"
                  />
                  <span className="text-[9px] text-slate-400 font-medium mt-1 block">
                    0 = No time limit (free practice)
                  </span>
                </div>

                {/* Default Batch Size */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Default Question Count
                  </label>
                  <select
                    value={defaultBatchCount}
                    onChange={(e) => setDefaultBatchCount(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    <option value={10}>10 Questions</option>
                    <option value={20}>20 Questions</option>
                    <option value={30}>30 Questions</option>
                    <option value={50}>50 Questions</option>
                    <option value="all">All Questions</option>
                  </select>
                  <span className="text-[9px] text-slate-400 font-medium mt-1 block">
                    Preselected count in launch modal
                  </span>
                </div>

                {/* Passing Threshold */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Pass Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={passThreshold}
                    onChange={(e) => setPassThreshold(Math.min(100, Math.max(1, parseInt(e.target.value) || 75)))}
                    className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-200 outline-none"
                  />
                  <span className="text-[9px] text-slate-400 font-medium mt-1 block">
                    Target accuracy to pass exam
                  </span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2">
                {/* Instant Feedback Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                      Instant Answer Feedback
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Show correct answer and explanation immediately upon selection in practice mode
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInstantFeedback(!instantFeedback)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      instantFeedback ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-2xs transition-transform ${
                        instantFeedback ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Shuffle Questions Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                      Shuffle Questions
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Randomize the question sequence to prevent pattern memorization
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShuffleQuestions(!shuffleQuestions)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      shuffleQuestions ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-2xs transition-transform ${
                        shuffleQuestions ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Shuffle Options Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                      Shuffle Multiple Choices (A/B/C/D)
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Randomize option positions for questions that allow shuffling
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShuffleOptions(!shuffleOptions)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      shuffleOptions ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-2xs transition-transform ${
                        shuffleOptions ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs shadow-amber-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Practice Config'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ══════════════ SUBTAB 3: AI & GUIDANCE ══════════════ */}
          {activeSubTab === 'ai' && (
            <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
                      AI & Prompting Guidance
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Quiz instructions and automated AI explanation prompts
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Quiz General Instruction / Problem Context
                </label>
                <textarea
                  rows={4}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Instructions presented to examinees before starting (e.g. JLPT problem instructions, TOEIC directions, test rules)..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white focus:border-purple-500 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  AI System Prompt & Explanation Generator Rules
                </label>
                <textarea
                  rows={4}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="System prompt guidance for AI when explaining answers (e.g. 'Explain in clear Vietnamese, highlighting the core grammar point and why incorrect options fail')..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:bg-white focus:border-purple-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs shadow-purple-200 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save AI Instructions'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ══════════════ SUBTAB 4: EXCEL DATA MANAGER ══════════════ */}
          {activeSubTab === 'excel' && (
            <QuizExcelManager
              quizId={quizId}
              questionsCount={initialData?.questions_count || 0}
              quizTitle={title || 'Quiz'}
            />
          )}

          {/* ══════════════ SUBTAB 5: COLLABORATORS ══════════════ */}
          {activeSubTab === 'collab' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
                      Manage Collaborators
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Grant fellow ecosystem users editing and question management permissions
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by username or full name..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="max-w-md p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1">
                  {searchResults.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{u.username}</span>
                        {u.full_name && <span className="text-[10px] text-slate-400">{u.full_name}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddCollaborator(u.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-xs active:scale-95 transition-all"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {collaborators.length > 0 ? (
                <div className="space-y-2 max-w-md">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Active Collaborators ({collaborators.length})
                  </span>
                  {collaborators.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                      <div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{c.username}</span>
                        {c.full_name && <span className="text-[10px] text-slate-400">{c.full_name}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(c.id)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Remove Collaborator"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-center max-w-md">
                  <p className="text-xs text-slate-400 font-medium">No external collaborators added yet.</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ SUBTAB 6: DANGER ZONE ══════════════ */}
          {activeSubTab === 'danger' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-rose-200 dark:border-rose-900/60 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest leading-none">
                      Danger Zone
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Irreversible actions affecting learning progress and quiz data
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Reset Progress */}
                <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">Reset Study Progress</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Clear your attempt history and reset Leitner spaced repetition box mastery back to initial state.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetProgress}
                    disabled={isResetting}
                    className="h-9 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isResetting ? 'Resetting Progress...' : 'Reset Study Progress'}</span>
                  </button>
                </div>

                {/* Delete Quiz */}
                {isOwner && (
                  <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black text-rose-700 dark:text-rose-400">Permanently Delete Quiz</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Permanently delete this quiz along with all its questions, choices, explanations, and attempts.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDeleteQuiz}
                      disabled={isDeleting}
                      className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs shadow-rose-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeleting ? 'Deleting Quiz...' : 'Delete This Quiz'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default QuizSettingsTab
