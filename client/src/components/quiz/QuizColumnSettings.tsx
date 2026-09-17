import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  Columns3,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Lock,
  Database,
  Search,
  Lightbulb,
  CheckCircle2,
  Layers,
  HelpCircle,
  Sliders
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface QuizColumnSettingsProps {
  quizId: string | number
  isOwner?: boolean
}

export interface ColumnOverviewResponse {
  total_questions: number
  custom_columns: string[]
  dynamic_columns: string[]
  column_counts: Record<string, number>
  insight_columns: string[]
}

const CORE_SYSTEM_COLUMNS = [
  { name: 'content', label: 'Question Stem (content)', desc: 'Primary question content or problem statement', locked: true },
  { name: 'options', label: 'Choices & Options (A, B, C, D...)', desc: 'Multiple choice options and marked correct keys', locked: true },
  { name: 'explanation', label: 'Main Explanation', desc: 'Standard explanation and solution rationale', locked: false, isInsightDefault: true },
  { name: 'ai_explanation', label: 'AI Deep Analysis', desc: 'AI-generated pedagogical breakdown and insights', locked: false, isInsightDefault: true },
  { name: 'image', label: 'Question Image (URL)', desc: 'Attached illustration, diagram, or photo URL', locked: false },
  { name: 'audio', label: 'Question Audio (URL)', desc: 'Pronunciation or listening prompt audio URL', locked: false },
]

const POPULAR_COLUMN_SUGGESTIONS = [
  { name: 'grammar', label: 'Grammar Points' },
  { name: 'translation', label: 'Vietnamese / Target Translation' },
  { name: 'vocabulary', label: 'Key Vocabulary & Idioms' },
  { name: 'example', label: 'Example Sentence' },
  { name: 'reference', label: 'Source / Book Reference' },
  { name: 'hints', label: 'Step-by-step Hints' },
  { name: 'notes', label: 'Teacher & Author Notes' },
  { name: 'context', label: 'Situational Context' },
  { name: 'pronunciation', label: 'Pronunciation / IPA Guide' },
]

export function QuizColumnSettings({ quizId, isOwner = true }: QuizColumnSettingsProps) {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColIsInsight, setNewColIsInsight] = useState(true)
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmCol, setDeleteConfirmCol] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // 1. Fetch Column Overview
  const { data: overview, isLoading, refetch } = useQuery<ColumnOverviewResponse>({
    queryKey: ['quiz-columns-overview', String(quizId)],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${quizId}/columns-overview`)
      return res.data
    },
    enabled: !!quizId,
    staleTime: 10 * 1000
  })

  // 2. Fetch Practice Settings
  const { data: practiceSettingsData } = useQuery({
    queryKey: ['quiz-practice-settings', String(quizId)],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${quizId}/practice-settings`)
      return res.data
    },
    enabled: !!quizId,
    staleTime: 10 * 1000,
  })

  // Current configured insight columns
  const currentInsightCols: string[] = useMemo(() => {
    const saved = overview?.insight_columns ?? practiceSettingsData?.creator_settings?.insight_columns
    if (Array.isArray(saved)) return saved
    return ['explanation']
  }, [overview, practiceSettingsData])

  // Clear toast after 3s
  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(null), 4000)
    } else {
      setSuccessMsg(msg)
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  // 3. Mutations
  const toggleInsightMutation = useMutation({
    mutationFn: async ({ column, isInsight }: { column: string; isInsight: boolean }) => {
      let updated: string[]
      if (isInsight) {
        updated = Array.from(new Set([...currentInsightCols, column]))
      } else {
        updated = currentInsightCols.filter(c => c !== column)
      }

      const res = await axios.post(`/api/v1/quiz/${quizId}/practice-settings`, {
        is_creator: true,
        settings: {
          insight_columns: updated
        }
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-columns-overview', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz-practice-settings', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz-play', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(quizId)] })
      showToast('Insight visibility updated successfully!')
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to update insight column settings.', true)
    }
  })

  const addColumnMutation = useMutation({
    mutationFn: async ({ column_name, isInsight }: { column_name: string; isInsight: boolean }) => {
      const cleanName = column_name.trim().toLowerCase().replace(/\s+/g, '_')
      const res = await axios.post(`/api/v1/quiz/${quizId}/add-column`, {
        column_name: cleanName,
        is_insight: isInsight
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-columns-overview', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz-practice-settings', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz-play', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(quizId)] })
      setIsAddModalOpen(false)
      setNewColumnName('')
      setNewColIsInsight(true)
      showToast('Custom column added successfully!')
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to add custom column.', true)
    }
  })

  const renameColumnMutation = useMutation({
    mutationFn: async ({ old_name, new_name }: { old_name: string; new_name: string }) => {
      const cleanNew = new_name.trim().toLowerCase().replace(/\s+/g, '_')
      const res = await axios.post(`/api/v1/quiz/${quizId}/rename-column`, {
        old_name,
        new_name: cleanNew
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-columns-overview', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz-practice-settings', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz-play', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(quizId)] })
      setEditingColumn(null)
      setRenameValue('')
      showToast('Column renamed across all questions!')
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to rename column.', true)
    }
  })

  const deleteColumnMutation = useMutation({
    mutationFn: async (column_name: string) => {
      const res = await axios.post(`/api/v1/quiz/${quizId}/delete-column`, { column_name })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-columns-overview', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz-practice-settings', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz-play', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz', String(quizId)] })
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(quizId)] })
      setDeleteConfirmCol(null)
      showToast('Column and its question data deleted.')
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to delete column.', true)
    }
  })

  // Dynamic columns list
  const allDynamicCols = useMemo(() => {
    const set = new Set<string>()
    overview?.dynamic_columns?.forEach(c => set.add(c))
    overview?.custom_columns?.forEach(c => set.add(c))
    return Array.from(set).sort()
  }, [overview])

  const filteredDynamicCols = useMemo(() => {
    if (!searchTerm.trim()) return allDynamicCols
    const q = searchTerm.toLowerCase()
    return allDynamicCols.filter(c => c.toLowerCase().includes(q))
  }, [allDynamicCols, searchTerm])

  const totalQuestions = overview?.total_questions || 0

  return (
    <div className="space-y-6 text-left">
      {/* ─── TOAST NOTIFICATIONS ────────────────────────────────────────────── */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── OVERVIEW BANNER & METRICS ──────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-400/20">
              <Columns3 className="w-3.5 h-3.5" />
              <span>Custom Columns & Learning Insights</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">Quiz Fields Architecture</h2>
            <p className="text-xs text-indigo-200/80 max-w-xl font-medium leading-relaxed">
              Organize custom auxiliary fields like Grammar, Translation, or Vocabulary. Enable columns to display dynamically inside the Learning Insight drawer during quiz practice.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Column</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-indigo-800/40">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Total Questions</span>
            <span className="text-lg sm:text-xl font-black mt-0.5 block">{totalQuestions}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Custom Columns</span>
            <span className="text-lg sm:text-xl font-black mt-0.5 block">{allDynamicCols.length}</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Insight Enabled</span>
            <span className="text-lg sm:text-xl font-black mt-0.5 block text-amber-300">{currentInsightCols.length}</span>
          </div>
        </div>
      </div>

      {/* ─── SEARCH & FILTER TOOLBAR ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search custom columns..."
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-indigo-500 outline-none transition-all shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Toggle switch controls appearance in Quiz Insight tab</span>
        </div>
      </div>

      {/* ─── SECTION 1: CUSTOM / DYNAMIC COLUMNS ────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
                Custom Auxiliary Columns ({allDynamicCols.length})
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                Dynamic fields stored per-question and exported with Excel
              </p>
            </div>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Column</span>
            </button>
          )}
        </div>

        {allDynamicCols.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
            <Columns3 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">No Custom Columns Yet</h4>
            <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto mt-1 mb-4">
              Add custom columns like Grammar, Translation, or Notes to enrich explanations and present multifaceted insights during practice.
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Column</span>
              </button>
            )}
          </div>
        ) : filteredDynamicCols.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 font-bold">
            No columns match "{searchTerm}"
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDynamicCols.map((col) => {
              const count = overview?.column_counts?.[col] ?? 0
              const isInsight = currentInsightCols.includes(col)
              const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0
              const isEditing = editingColumn === col

              return (
                <div
                  key={col}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 relative overflow-hidden",
                    isInsight
                      ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-2xs"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-500 text-xs font-black text-slate-800 dark:text-slate-100 outline-none w-full max-w-[180px]"
                            placeholder="column_name"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => renameColumnMutation.mutate({ old_name: col, new_name: renameValue })}
                            disabled={!renameValue.trim() || renameValue.trim() === col || renameColumnMutation.isPending}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-40"
                            title="Save Rename"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingColumn(null)}
                            className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                            {col}
                          </span>
                          {isInsight && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                              <Lightbulb className="w-2.5 h-2.5" />
                              <span>Insight Tab</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Fill rate progress */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>Filled: {count} / {totalQuestions} questions</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              pct > 70 ? "bg-emerald-500" : pct > 30 ? "bg-indigo-500" : "bg-amber-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Column Actions */}
                    {isOwner && !isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingColumn(col)
                            setRenameValue(col)
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Rename Column"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmCol(col)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Delete Column"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Insight Visibility Toggle Row */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      Show in Insight Drawer
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInsight}
                        onChange={(e) => toggleInsightMutation.mutate({ column: col, isInsight: e.target.checked })}
                        disabled={toggleInsightMutation.isPending}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── SECTION 2: CORE SYSTEM COLUMNS ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
              Standard Quiz Fields
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Built-in core schema fields powering the quiz engine
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CORE_SYSTEM_COLUMNS.map((col) => {
            const count = overview?.column_counts?.[col.name] ?? (col.name === 'options' ? totalQuestions : 0)
            const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0

            return (
              <div
                key={col.name}
                className="p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-800 flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">
                      {col.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase">
                      {col.locked ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {col.desc}
                  </p>
                  <div className="text-[10px] font-bold text-slate-400 pt-0.5">
                    Filled: {count} / {totalQuestions} ({pct}%)
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── ADD COLUMN MODAL ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Add Custom Column
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Suggestions Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Quick Suggestions
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_COLUMN_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => setNewColumnName(sug.name)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                        newColumnName === sug.name
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                      )}
                    >
                      {sug.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Column Field Name
                </label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder="e.g. grammar, translation, example..."
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  Use lowercase alphanumeric with underscores (e.g. <code>grammar_point</code>)
                </p>
              </div>

              {/* Insight Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newColIsInsight}
                  onChange={(e) => setNewColIsInsight(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Show in Learning Insight tab
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Make this column available as a tab during quiz practice
                  </span>
                </div>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => addColumnMutation.mutate({ column_name: newColumnName, isInsight: newColIsInsight })}
                  disabled={!newColumnName.trim() || addColumnMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{addColumnMutation.isPending ? 'Creating...' : 'Create Column'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DELETE CONFIRM MODAL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmCol && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Delete Column "{deleteConfirmCol}"?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  This action will permanently remove this field and clear its value across all {totalQuestions} questions. This cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCol(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteColumnMutation.mutate(deleteConfirmCol)}
                  disabled={deleteColumnMutation.isPending}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {deleteColumnMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
