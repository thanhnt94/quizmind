import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ChevronLeft, Compass, Target, Flame, Brain, Play, CheckCircle2, Circle, Clock, 
  ArrowRight, Settings, RotateCcw, Sparkles, BookOpen, Layers, Lock, ShieldCheck,
  Plus, Trash2, ArrowUp, ArrowDown, Check, Trophy, Calendar, BarChart3, History,
  Zap, ChevronRight, TrendingUp, Star
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'

export type StepType = 'new_cards' | 'mcq' | 'typing' | 'review' | 'study_time'

export interface PipelineStep {
  id?: string
  type: StepType
  label?: string
  daily_count?: number
  question_count?: number
  pass_threshold?: number
  max_count?: number
  target_minutes?: number
}

const STEP_META: Record<StepType, { title: string; icon: string; gradient: string; color: string; desc: string; ring: string }> = {
  new_cards: {
    title: 'Học Câu Mới',
    icon: '📝',
    gradient: 'from-orange-500 to-amber-500',
    color: 'text-orange-500',
    desc: 'Luyện tập các câu hỏi mới tinh trong bộ đề',
    ring: 'ring-orange-500/20'
  },
  mcq: {
    title: 'Trắc Nghiệm MCQ',
    icon: '🎯',
    gradient: 'from-purple-500 to-fuchsia-500',
    color: 'text-purple-500',
    desc: 'Bài test trắc nghiệm chọn đáp án đúng để đánh giá',
    ring: 'ring-purple-500/20'
  },
  typing: {
    title: 'Gõ Đáp Án',
    icon: '⌨️',
    gradient: 'from-emerald-500 to-teal-500',
    color: 'text-emerald-500',
    desc: 'Bài test gõ chính xác đáp án cần ghi nhớ',
    ring: 'ring-emerald-500/20'
  },
  review: {
    title: 'Ôn Tập Củng Cố',
    icon: '🔄',
    gradient: 'from-indigo-500 to-blue-500',
    color: 'text-indigo-500',
    desc: 'Ôn tập câu hỏi sai hoặc chưa nắm vững',
    ring: 'ring-indigo-500/20'
  },
  study_time: {
    title: 'Thời Gian Học',
    icon: '⏱️',
    gradient: 'from-blue-500 to-cyan-500',
    color: 'text-blue-500',
    desc: 'Tích lũy tổng thời gian học trong ngày',
    ring: 'ring-blue-500/20'
  }
}

const TABS = [
  { id: 'today', label: 'Hôm Nay', icon: Zap },
  { id: 'history', label: 'Lịch Sử', icon: History },
  { id: 'config', label: 'Cấu Hình', icon: Settings },
  { id: 'stats', label: 'Thống Kê', icon: BarChart3 },
] as const

type TabId = typeof TABS[number]['id']

export default function QuizRoadmap() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = (searchParams.get('tab') as TabId) || 'today'
  const setActiveTab = (tab: TabId) => {
    setSearchParams({ tab }, { replace: true })
  }

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Fetch roadmap status
  const { data: status, isLoading: isStatusLoading, refetch } = useQuery({
    queryKey: ['quiz-roadmap-status', id, selectedDate || 'today'],
    queryFn: async () => {
      const url = selectedDate 
        ? `/api/v1/quiz/${id}/roadmap-status?target_date=${selectedDate}`
        : `/api/v1/quiz/${id}/roadmap-status`
      const res = await axios.get(url)
      return res.data
    },
    enabled: Boolean(id)
  })

  // Fetch practice/roadmap settings
  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ['quiz-practice-settings', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${id}/practice-settings`)
      return res.data
    },
    enabled: Boolean(id)
  })

  // Fetch calendar heatmap
  const { data: calendarData, isLoading: isCalendarLoading } = useQuery({
    queryKey: ['quiz-roadmap-calendar', id, calendarMonth],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${id}/roadmap-calendar?month=${calendarMonth}`)
      return res.data
    },
    enabled: Boolean(id) && activeTab === 'history'
  })

  const [roadmapActive, setRoadmapActive] = useState(false)
  const [roadmapDailyNew, setRoadmapDailyNew] = useState(10)
  const [roadmapPassThreshold, setRoadmapPassThreshold] = useState(80)
  const [roadmapDailyReviewMax, setRoadmapDailyReviewMax] = useState(30)

  useEffect(() => {
    if (settingsData?.user_settings) {
      const us = settingsData.user_settings
      setRoadmapActive(Boolean(us.roadmap_active))
      if (us.roadmap_daily_new) setRoadmapDailyNew(us.roadmap_daily_new)
      if (us.roadmap_pass_threshold) setRoadmapPassThreshold(us.roadmap_pass_threshold)
      if (us.roadmap_daily_review_max) setRoadmapDailyReviewMax(us.roadmap_daily_review_max)
    } else if (status) {
      setRoadmapActive(Boolean(status.roadmap_active))
      if (status.roadmap_daily_new) setRoadmapDailyNew(status.roadmap_daily_new)
      if (status.roadmap_pass_threshold) setRoadmapPassThreshold(status.roadmap_pass_threshold)
    }
  }, [settingsData, status])

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const newSettings = {
        ...(settingsData?.user_settings || {}),
        roadmap_active: roadmapActive,
        roadmap_daily_new: roadmapDailyNew,
        roadmap_pass_threshold: roadmapPassThreshold,
        roadmap_daily_review_max: roadmapDailyReviewMax,
        pipeline: [
          { id: 'step_new', type: 'new_cards', label: 'Học câu mới', daily_count: roadmapDailyNew },
          { id: 'step_mcq', type: 'mcq', label: 'Bài kiểm tra MCQ', question_count: roadmapDailyNew, pass_threshold: roadmapPassThreshold },
          { id: 'step_review', type: 'review', label: 'Ôn tập củng cố', max_count: roadmapDailyReviewMax }
        ]
      }
      await axios.post(`/api/v1/quiz/${id}/practice-settings`, {
        settings: newSettings,
        is_creator: false
      })
      await queryClient.invalidateQueries({ queryKey: ['quiz-roadmap-status', id] })
      await queryClient.invalidateQueries({ queryKey: ['quiz-practice-settings', id] })
      await queryClient.invalidateQueries({ queryKey: ['roadmap-global-decks'] })
      await queryClient.invalidateQueries({ queryKey: ['roadmapDecks'] })
      refetch()
      refetchSettings()
      alert('Đã lưu cấu hình Lộ Trình thành công!')
    } catch (e: any) {
      alert('Lỗi khi lưu cấu hình: ' + (e?.response?.data?.error || e.message))
    } finally {
      setIsSavingSettings(false)
    }
  }

  const pipeline = status?.pipeline || []
  const allDone = Boolean(status?.all_done)
  const currentStepIndex = status?.current_step_index ?? 0
  const quizTitle = status?.quiz_title || status?.deck_title || 'Lộ Trình Bộ Đề'

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-800 selection:bg-indigo-100">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
              title="Quay lại"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  Roadmap
                </span>
                <span className="text-xs text-slate-400 font-semibold truncate">
                  {status?.total_questions || 0} câu hỏi
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 truncate" title={quizTitle}>
                {quizTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Streak Badge */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs shadow-xs">
              <Flame className="w-4 h-4 fill-white" />
              <span>{status?.streak || 0}d</span>
            </div>

            {/* Quick Play CTA */}
            <button
              onClick={() => navigate(status?.next_action_url || `/quiz/${id}/play?mode=roadmap`)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span className="hidden sm:inline">{status?.next_action_label || 'Bắt Đầu'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 border-t border-slate-100 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer shrink-0",
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* TAB 1: TODAY (PIPELINE & ACTION) */}
        {activeTab === 'today' && (
          <div className="space-y-6">
            {/* Status Summary Banner */}
            <div className={cn(
              "rounded-3xl p-5 sm:p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden",
              allDone 
                ? "bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border-emerald-200" 
                : "bg-white border-slate-200"
            )}>
              <div className="space-y-2 z-10">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border",
                    allDone ? "bg-emerald-500 text-white border-emerald-600" : "bg-amber-100 text-amber-900 border-amber-300"
                  )}>
                    {allDone ? '✓ Đã hoàn thành hôm nay' : `Đang học: Bước ${currentStepIndex + 1}/${pipeline.length}`}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    🎯 Mục tiêu: {status?.new_target_today || 10} câu/ngày
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {allDone ? 'Xuất sắc! Bạn đã xong lộ trình hôm nay! 🎉' : 'Hoàn thành các bước để duy trì chuỗi Streak 🔥'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-xl">
                  {allDone 
                    ? 'Hãy nghỉ ngơi hoặc ôn tập thêm nếu muốn củng cố kiến thức vững chắc hơn.' 
                    : 'Học đều đặn mỗi ngày theo lộ trình giúp bạn thuộc nhanh và nhớ lâu gấp 10 lần.'}
                </p>
              </div>

              <div className="flex items-center gap-3 z-10 shrink-0">
                <button
                  onClick={() => navigate(status?.next_action_url || `/quiz/${id}/play?mode=roadmap`)}
                  className={cn(
                    "px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer",
                    allDone
                      ? "bg-slate-900 hover:bg-slate-800 text-white"
                      : "bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 hover:from-indigo-700 hover:to-rose-600 text-white shadow-indigo-200"
                  )}
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{status?.next_action_label || 'Bắt Đầu Học'}</span>
                </button>
              </div>
            </div>

            {/* Pipeline Stepper List */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                Các bước luyện tập trong ngày
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {pipeline.map((step: any, idx: number) => {
                  const isCurrent = idx === currentStepIndex && !allDone
                  const isCompleted = Boolean(step.done)
                  const stepType = (step.type as StepType) || 'new_cards'
                  const meta = STEP_META[stepType] || STEP_META.new_cards

                  return (
                    <div
                      key={step.id || idx}
                      className={cn(
                        "rounded-3xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden",
                        isCompleted
                          ? "bg-emerald-50/40 border-emerald-200 shadow-2xs"
                          : isCurrent
                            ? "bg-white border-indigo-400 ring-2 ring-indigo-500/20 shadow-md"
                            : "bg-white/70 border-slate-200 opacity-80"
                      )}
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 border shadow-2xs",
                          isCompleted
                            ? "bg-emerald-500 text-white border-emerald-600"
                            : isCurrent
                              ? "bg-indigo-50 border-indigo-200"
                              : "bg-slate-100 border-slate-200"
                        )}>
                          {isCompleted ? '✓' : meta.icon}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-400">
                              Bước {idx + 1}
                            </span>
                            <h4 className="text-sm font-black text-slate-900">
                              {step.label || meta.title}
                            </h4>
                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                                Đã xong
                              </span>
                            )}
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider animate-pulse">
                                Đang thực hiện
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {meta.desc}
                          </p>

                          {/* Progress text */}
                          {step.progress && (
                            <div className="text-[11px] font-bold text-slate-600 pt-1">
                              {step.type === 'new_cards' && (
                                <span>Tiến độ: {step.progress.done || 0} / {step.progress.target || 10} câu</span>
                              )}
                              {step.type === 'mcq' && (
                                <span>Điểm cao nhất hôm nay: {step.progress.best_score || 0}% (Cần đạt ≥ {step.progress.threshold || 80}%)</span>
                              )}
                              {step.type === 'review' && (
                                <span>Đã ôn: {step.progress.done || 0} / {step.progress.target || 0} câu</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Link
                          to={step.url || `/quiz/${id}/play?mode=roadmap`}
                          className={cn(
                            "px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all flex items-center gap-1.5 active:scale-95",
                            isCompleted
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : isCurrent
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          )}
                        >
                          <span>{isCompleted ? 'Học Lại' : 'Bắt Đầu'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HISTORY (CALENDAR HEATMAP) */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">Lịch Sử Học Tập Theo Tháng</h3>
                  <p className="text-xs font-medium text-slate-500">Theo dõi chuỗi ngày duy trì bài học</p>
                </div>
                <input
                  type="month"
                  value={calendarMonth}
                  onChange={(e) => setCalendarMonth(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                />
              </div>

              {isCalendarLoading ? (
                <div className="py-12 text-center text-xs font-bold text-slate-400">Đang tải lịch sử...</div>
              ) : (
                <div className="grid grid-cols-7 gap-2 pt-2">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-black text-slate-400 uppercase py-1">
                      {d}
                    </div>
                  ))}
                  {calendarData?.days?.map((day: any) => {
                    const isDone = day.is_target_met || day.completion_percent === 100
                    const isActive = day.active
                    const dayNum = parseInt(day.date.split('-')[2], 10)

                    return (
                      <div
                        key={day.date}
                        className={cn(
                          "aspect-square rounded-2xl border flex flex-col items-center justify-center p-1 relative transition-all",
                          isDone
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs font-black"
                            : isActive
                              ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                              : "bg-slate-50 text-slate-400 border-slate-100 font-medium"
                        )}
                        title={`${day.date}: ${day.study_minutes} phút học, ${day.answer_count} câu`}
                      >
                        <span className="text-xs">{dayNum}</span>
                        {isDone && <span className="text-[9px]">🔥</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CONFIG (ROADMAP SETTINGS) */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-black text-slate-900">Cài Đặt Lộ Trình Học</h3>
                <p className="text-xs font-medium text-slate-500">Tùy biến số câu hỏi mỗi ngày và tiêu chuẩn đạt bài test</p>
              </div>

              <div className="space-y-4">
                {/* Active Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Kích hoạt Lộ Trình cho bộ đề này</h4>
                    <p className="text-xs text-slate-500 font-medium">Hiển thị trên trang chủ và nhắc nhở học hàng ngày</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={roadmapActive}
                    onChange={(e) => setRoadmapActive(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {/* Daily Target */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-900">Mục tiêu câu hỏi mới mỗi ngày</label>
                    <span className="text-sm font-black text-indigo-600">{roadmapDailyNew} câu</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={roadmapDailyNew}
                    onChange={(e) => setRoadmapDailyNew(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Pass Threshold */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-900">Ngưỡng điểm đạt bài kiểm tra MCQ</label>
                    <span className="text-sm font-black text-purple-600">{roadmapPassThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={roadmapPassThreshold}
                    onChange={(e) => setRoadmapPassThreshold(parseInt(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                {/* Daily Review Max */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-900">Số câu ôn tập tối đa mỗi ngày</label>
                    <span className="text-sm font-black text-emerald-600">{roadmapDailyReviewMax} câu</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={roadmapDailyReviewMax}
                    onChange={(e) => setRoadmapDailyReviewMax(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-200 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingSettings ? 'Đang lưu...' : 'Lưu Cấu Hình 💾'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Đã Thuộc</span>
                <div className="text-2xl font-black text-emerald-600">{status?.learned_questions || 0}</div>
                <span className="text-[10px] font-semibold text-slate-500">trên {status?.total_questions || 0} câu</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Còn Lại</span>
                <div className="text-2xl font-black text-slate-800">{status?.unlearned_questions || 0}</div>
                <span className="text-[10px] font-semibold text-slate-500">cần nạp thêm</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ghi Nhớ</span>
                <div className="text-2xl font-black text-indigo-600">{status?.retention_rate || 0}%</div>
                <span className="text-[10px] font-semibold text-slate-500">Retention rate</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dự Kiến Xong</span>
                <div className="text-lg font-black text-slate-900 truncate">{status?.estimated_completion_date || '—'}</div>
                <span className="text-[10px] font-semibold text-slate-500">Khoảng {status?.days_left || 0} ngày</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
