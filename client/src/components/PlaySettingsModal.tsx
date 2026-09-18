import React, { useState } from 'react'
import {
  Sliders,
  Type,
  Volume2,
  Zap,
  X,
  Check,
  RotateCcw,
  LogOut,
  Copy,
  EyeOff,
  Eye,
  Edit3,
  Star,
  ListOrdered,
  Shuffle,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  VolumeX,
  Headphones,
  Vibrate,
  Layers,
  HelpCircle,
  Compass
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { ToggleRow } from '@/components/settings/ToggleRow'
import { SegmentedControl } from '@/components/settings/SegmentedControl'

export type PlaySettingsTab = 'mode' | 'display' | 'audio' | 'actions'

interface PlaySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  activeMode: string
  applyLearningMode: (mode: string) => void
  currentQuestion?: any
  copyQuestionToClipboard?: () => void
  handleIgnoreQuestion?: () => void
  handleStarQuestion?: () => void
  isStarred?: boolean
  openEditModal?: () => void
  canEdit?: boolean
  setIsQuitModalOpen?: (open: boolean) => void
  currentIndex?: number
  totalQuestions?: number
}

export const PlaySettingsModal: React.FC<PlaySettingsModalProps> = ({
  isOpen,
  onClose,
  activeMode,
  applyLearningMode,
  currentQuestion,
  copyQuestionToClipboard,
  handleIgnoreQuestion,
  handleStarQuestion,
  isStarred = false,
  openEditModal,
  canEdit = false,
  setIsQuitModalOpen,
  currentIndex = 0,
  totalQuestions = 0,
}) => {
  const [activeTab, setActiveTab] = useState<PlaySettingsTab>('mode')
  const [isCopied, setIsCopied] = useState(false)
  const { userSettings, updateUserSettings } = useAppStore()

  if (!isOpen) return null

  const handleCopy = () => {
    if (copyQuestionToClipboard) {
      copyQuestionToClipboard()
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1800)
    } else if (currentQuestion) {
      const text = `Question: ${currentQuestion.content}\n` +
        (currentQuestion.options || []).map((opt: any, i: number) => `${String.fromCharCode(65 + i)}: ${opt.content}`).join('\n')
      navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1800)
    }
  }

  const LEARNING_MODES = [
    {
      id: 'mcq',
      label: 'MCQ Practice',
      desc: 'Balanced study across all cards in this deck',
      icon: CheckCircle2,
      color: 'from-indigo-500 to-purple-600',
      tag: 'ALL CARDS'
    },
    {
      id: 'sequential',
      label: 'Sequential Order',
      desc: 'Chronological progression from question #1 to end',
      icon: ListOrdered,
      color: 'from-blue-500 to-indigo-500',
      tag: 'CHRONOLOGICAL'
    },
    {
      id: 'random',
      label: 'Shuffle Mode',
      desc: 'Unpredictable random order across question pool',
      icon: Shuffle,
      color: 'from-purple-500 to-pink-500',
      tag: 'RANDOM'
    },
    {
      id: 'unseen',
      label: 'New Cards First',
      desc: 'Prioritize unattempted questions with 0 history',
      icon: EyeOff,
      color: 'from-teal-500 to-emerald-500',
      tag: 'FRESH'
    },
    {
      id: 'review',
      label: 'Mistakes First',
      desc: 'Drill cards you previously answered incorrectly',
      icon: AlertCircle,
      color: 'from-amber-500 to-orange-600',
      tag: 'WEAK POINTS'
    },
    {
      id: 'hardest',
      label: 'Hardest First (SRS)',
      desc: 'Target cards with lowest historical accuracy ratio',
      icon: TrendingUp,
      color: 'from-rose-500 to-red-600',
      tag: 'DIFFICULT'
    }
  ]

  const FONT_SIZE_OPTIONS = [
    { id: '85%', label: '85% Compact' },
    { id: '100%', label: '100% Normal' },
    { id: '115%', label: '115% Large' },
    { id: '130%', label: '130% XL' }
  ]

  const AUTOPLAY_AUDIO_OPTIONS = [
    { id: 'never', label: 'Never' },
    { id: 'question', label: 'On Question' },
    { id: 'always', label: 'Always' }
  ]

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md pointer-events-auto"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 25 }}
        transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden z-[1010] pointer-events-auto max-h-[90vh]"
      >
        {/* Top Gradient Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                Study Settings
              </h2>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                Question {currentIndex + 1} of {totalQuestions || '--'} • Realtime Sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-all active:scale-95 shadow-2xs cursor-pointer"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tab Navigation Bar */}
        <div className="px-5 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/60 dark:bg-slate-950/60 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('mode')}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer truncate",
                activeTab === 'mode'
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/90 dark:border-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Mode</span>
            </button>

            <button
              onClick={() => setActiveTab('display')}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer truncate",
                activeTab === 'display'
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/90 dark:border-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Type className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Display</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer truncate",
                activeTab === 'audio'
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/90 dark:border-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Audio</span>
            </button>

            <button
              onClick={() => setActiveTab('actions')}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer truncate",
                activeTab === 'actions'
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/90 dark:border-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Actions</span>
            </button>
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* ========================================================================= */}
          {/* TAB 1: MODE & FLOW                                                        */}
          {/* ========================================================================= */}
          {activeTab === 'mode' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Active Learning Mode
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    6 Pathways
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LEARNING_MODES.map((m) => {
                    const Icon = m.icon
                    const isSelected = activeMode === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => applyLearningMode(m.id)}
                        className={cn(
                          "p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all duration-200 active:scale-[0.98] cursor-pointer group relative overflow-hidden",
                          isSelected
                            ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm"
                            : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br shadow-xs shrink-0",
                          m.color
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-black text-xs text-slate-800 dark:text-slate-100 truncate">
                              {m.label}
                            </span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {m.desc}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Flow Toggles */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">
                  Question & Choice Flow
                </span>

                <ToggleRow
                  icon={Shuffle}
                  label="Shuffle Question Order"
                  desc="Randomize the presentation order of questions in this deck"
                  checked={userSettings.shuffle_questions !== false}
                  onChange={(val) => updateUserSettings({ shuffle_questions: val })}
                  compact
                />

                <ToggleRow
                  icon={Layers}
                  label="Shuffle Choices (A, B, C, D)"
                  desc="Randomize option order for each multiple-choice question"
                  checked={userSettings.shuffle_choices !== false}
                  onChange={(val) => updateUserSettings({ shuffle_choices: val })}
                  compact
                />

                <ToggleRow
                  icon={Sparkles}
                  label="Auto-Advance (Quick Learn)"
                  desc="Advance automatically to the next question ~1.2s after correct answer"
                  checked={Boolean(userSettings.auto_advance)}
                  onChange={(val) => updateUserSettings({ auto_advance: val })}
                  compact
                />
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: DISPLAY                                                            */}
          {/* ========================================================================= */}
          {activeTab === 'display' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Font Scale Control */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Question & Option Font Scale
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    {userSettings.font_size || '100%'}
                  </span>
                </div>

                <SegmentedControl
                  value={userSettings.font_size || '100%'}
                  onChange={(val) => updateUserSettings({ font_size: val })}
                  options={FONT_SIZE_OPTIONS}
                />
              </div>

              {/* Visual Toggles */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">
                  Visual Details & Guidance
                </span>

                <ToggleRow
                  icon={HelpCircle}
                  label="Auto-Expand Explanation"
                  desc="Automatically show learning insight & breakdown upon answering"
                  checked={userSettings.auto_expand_explanation !== false}
                  onChange={(val) => updateUserSettings({ auto_expand_explanation: val })}
                  compact
                />

                <ToggleRow
                  icon={CheckCircle2}
                  label="Instant Feedback"
                  desc="Show immediate green/red cues and answer badge on selection"
                  checked={userSettings.instant_feedback !== false}
                  onChange={(val) => updateUserSettings({ instant_feedback: val })}
                  compact
                />

                <ToggleRow
                  icon={TrendingUp}
                  label="Show Mastery Levels"
                  desc="Display SRS / Leitner level badges (New, Learning, Familiar, Mastered)"
                  checked={userSettings.show_mastery !== false}
                  onChange={(val) => updateUserSettings({ show_mastery: val })}
                  compact
                />
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: AUDIO & HAPTICS                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'audio' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Sound & Vibration Toggles */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">
                  Audio & Tactile Feedback
                </span>

                <ToggleRow
                  icon={userSettings.sfx_enabled !== false ? Volume2 : VolumeX}
                  label="Sound Effects (SFX)"
                  desc="Play pleasant acoustic feedback on correct and incorrect answers"
                  checked={userSettings.sfx_enabled !== false}
                  onChange={(val) => updateUserSettings({ sfx_enabled: val })}
                  compact
                />

                <ToggleRow
                  icon={Vibrate}
                  label="Haptic Vibration"
                  desc="Subtle physical tactile vibration on answer selection and button clicks"
                  checked={userSettings.haptic_enabled !== false}
                  onChange={(val) => updateUserSettings({ haptic_enabled: val })}
                  compact
                />
              </div>

              {/* Autoplay Audio Track */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Autoplay Question Audio
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                    {userSettings.autoplay_audio || 'never'}
                  </span>
                </div>

                <SegmentedControl
                  value={userSettings.autoplay_audio || 'never'}
                  onChange={(val) => updateUserSettings({ autoplay_audio: val })}
                  options={AUTOPLAY_AUDIO_OPTIONS}
                />
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                  When enabled, questions with attached MP3 listening tracks or pronunciation audio will play automatically upon navigation.
                </p>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: QUICK ACTIONS                                                      */}
          {/* ========================================================================= */}
          {activeTab === 'actions' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Question Context Banner */}
              {currentQuestion && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                  <div className="flex items-center justify-between text-[11px] font-black text-indigo-700 dark:text-indigo-300 mb-1">
                    <span>Question #{currentIndex + 1}</span>
                    {currentQuestion.group_code && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-200/60 dark:bg-indigo-900/80 text-[10px]">
                        Group {currentQuestion.group_code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">
                    {currentQuestion.content}
                  </p>
                </div>
              )}

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Star / Unstar Question */}
                {handleStarQuestion && (
                  <button
                    type="button"
                    onClick={handleStarQuestion}
                    className={cn(
                      "p-3 rounded-2xl border flex items-center gap-2.5 text-left transition-all active:scale-95 cursor-pointer shadow-2xs",
                      isStarred
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-amber-300"
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0">
                      <Star className={cn("w-4 h-4", isStarred ? "fill-amber-500 text-amber-500" : "text-amber-600")} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black block truncate">
                        {isStarred ? "Starred" : "Star Question"}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 block truncate">
                        {isStarred ? "Marked for review" : "Save for favorites"}
                      </span>
                    </div>
                  </button>
                )}

                {/* Ignore / Unignore Question */}
                {handleIgnoreQuestion && (
                  <button
                    type="button"
                    onClick={handleIgnoreQuestion}
                    className={cn(
                      "p-3 rounded-2xl border flex items-center gap-2.5 text-left transition-all active:scale-95 cursor-pointer shadow-2xs",
                      currentQuestion?.is_ignored
                        ? "bg-slate-700 dark:bg-slate-800 border-slate-800 text-white"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-300"
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                      {currentQuestion?.is_ignored ? (
                        <Eye className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black block truncate">
                        {currentQuestion?.is_ignored ? "Restore Card" : "Ignore Question"}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 block truncate">
                        {currentQuestion?.is_ignored ? "Include in study" : "Skip from reviews"}
                      </span>
                    </div>
                  </button>
                )}

                {/* Copy to Clipboard */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 text-left transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center shrink-0">
                    {isCopied ? (
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    ) : (
                      <Copy className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black block truncate">
                      {isCopied ? "Copied!" : "Copy Question"}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 block truncate">
                      Prompt &amp; 4 choices
                    </span>
                  </div>
                </button>

                {/* Edit Question (Admin/Creator) */}
                {canEdit && openEditModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      openEditModal()
                    }}
                    className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 text-left transition-all active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                      <Edit3 className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black block truncate">
                        Edit Question
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 block truncate">
                        Creator controls
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {/* Reset & Exit Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    updateUserSettings({
                      font_size: '100%',
                      auto_advance: false,
                      show_mastery: true,
                      shuffle_choices: true,
                      shuffle_questions: true,
                      auto_expand_explanation: true,
                      instant_feedback: true,
                      sfx_enabled: true,
                      haptic_enabled: true,
                      autoplay_audio: 'never'
                    })
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Study Settings to Default</span>
                </button>

                {setIsQuitModalOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      setIsQuitModalOpen(true)
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Quit Study Session</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            Settings persist automatically to your account
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  )
}
