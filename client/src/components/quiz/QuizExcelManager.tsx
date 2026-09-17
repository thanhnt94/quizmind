import React, { useState } from 'react'
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  TableProperties
} from 'lucide-react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'

export interface QuizExcelManagerProps {
  quizId: string | number
  questionsCount?: number
  quizTitle?: string
}

export function QuizExcelManager({ quizId, questionsCount = 0, quizTitle = 'Quiz' }: QuizExcelManagerProps) {
  const queryClient = useQueryClient()
  const [isUploading, setIsUploading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setFeedback(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axios.post(`/api/v1/quiz/${quizId}/import-update`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data?.status === 'ok') {
        const uCount = res.data.updated_count ?? 0
        const aCount = res.data.added_count ?? 0
        const totalRows = res.data.total_excel_rows ?? (uCount + aCount)
        setFeedback({
          type: 'success',
          text: `Excel sync completed! ${totalRows} rows processed (${uCount} updated, ${aCount} newly created).`
        })

        // Invalidate all relevant React Query caches
        queryClient.invalidateQueries({ queryKey: ['quiz', String(quizId)] })
        queryClient.invalidateQueries({ queryKey: ['quiz-questions', String(quizId)] })
        queryClient.invalidateQueries({ queryKey: ['quiz-mastery', String(quizId)] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      } else {
        setFeedback({
          type: 'error',
          text: res.data?.error || 'Failed to update quiz from spreadsheet.'
        })
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to parse or upload Excel file. Ensure valid structure.'
      })
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs text-left space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none">
              Excel Data Sync & Backup
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              Download template, export questions to .xlsx, or update via spreadsheet
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 text-xs rounded-2xl font-bold flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 3 Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Download Template */}
        <a
          href="/api/v1/quiz/template/download"
          download
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all flex flex-col justify-between gap-3 text-left group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <TableProperties className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-slate-100">Download Template</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Standard spreadsheet template with pre-configured columns (question, options A-D, answer, guidance, etc.).
            </p>
          </div>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <Download className="w-3.5 h-3.5" /> Get .xlsx template
          </span>
        </a>

        {/* 2. Export Quiz */}
        <a
          href={`/api/v1/quiz/${quizId}/export`}
          download={`${quizTitle}.xlsx`}
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all flex flex-col justify-between gap-3 text-left group"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Download className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-slate-100">Export Quiz</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Export all {questionsCount} questions, multiple choices, answers, explanations, and metadata to .xlsx.
            </p>
          </div>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <Download className="w-3.5 h-3.5" /> Export Data ({questionsCount})
          </span>
        </a>

        {/* 3. Upload & Update */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-3 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Upload className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-slate-100">Update via Excel</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Upload an Excel file to match existing question IDs, insert new questions, and sync quiz properties.
            </p>
          </div>

          <label className="w-full h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all">
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing Excel...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Select Excel File</span>
              </>
            )}
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleSelectFile}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export default QuizExcelManager
