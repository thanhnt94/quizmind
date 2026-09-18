import React, { useState } from 'react'
import {
  Sliders,
  X,
  Check,
  RotateCcw,
  LogOut,
  Copy,
  EyeOff,
  Eye,
  Edit3,
  ListOrdered,
  Shuffle,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Volume2,
  VolumeX,
  Vibrate,
  Layers,
  Sparkles,
  Award
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { SegmentedControl } from '@/components/settings/SegmentedControl'

interface PlaySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  activeMode: string
  applyLearningMode: (mode: string) => void
  currentQuestion?: any
  copyQuestionToClipboard?: () => void
  handleIgnoreQuestion?: () => void
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
  openEditModal,
  canEdit = false,
  setIsQuitModalOpen,
  currentIndex = 0,
  totalQuestions = 0,
}) => {
  const [isCopied, setIsCopied] = useState(false)
  const { userSettings, updateUserSettings } = useAppStore()

  if (!isOpen) return null

  const handleCopy = () => {
    if (copyQuestionToClipboard) {
      copyQuestionToClipboard()
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1500)
    } else if (currentQuestion) {
      const text = `Question: ${currentQuestion.content}\n` +
        (currentQuestion.options || []).map((opt: any, i: number) => `${String.fromCharCode(65 + i)}: ${opt.content}`).join('\n')
      navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1500)
    }
  }

  const LEARNING_MODES = [
    { id: 'sequential', label: 'Sequential', icon: ListOrdered, desc: 'In order (1 to end)' },
    { id: 'random', label: 'Shuffle', icon: Shuffle, desc: 'Random order' },
    { id: 'unseen', label: 'New First', icon: EyeOff, desc: 'Unattempted' },
    { id: 'review', label: 'Mistakes', icon: AlertCircle, desc: 'Review wrongs' },
    { id: 'hardest', label: 'Hardest', icon: TrendingUp, desc: 'Lowest accuracy' },
    { id: 'mcq', label: 'MCQ All', icon: CheckCircle2, desc: 'All questions' },
  ]

  const FONT_SIZE_OPTIONS = [
    { id: '85%', label: '85% Compact' },
    { id: '100%', label: '100% Normal' },
    { id: '115%', label: '115% Large' },
    { id: '130%', label: '130% XL' }
  ]

  const toggles = [
    {
      id: 'sfx_enabled',
      label: 'Sound SFX',
      icon: userSettings.sfx_enabled !== false ? Volume2 : VolumeX,
      checked: userSettings.sfx_enabled !== false,
      color: 'text-emerald-500',
      activeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
      onToggle: () => updateUserSettings({ sfx_enabled: userSettings.sfx_enabled === false })
    },
    {
      id: 'haptic_enabled',
      label: 'Haptic Vibration',
      icon: Vibrate,
      checked: userSettings.haptic_enabled !== false,
      color: 'text-indigo-500',
      activeBg: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300',
      onToggle: () => updateUserSettings({ haptic_enabled: userSettings.haptic_enabled === false })
    },
    {
      id: 'shuffle_choices',
      label: 'Shuffle Choices',
      icon: Layers,
      checked: userSettings.shuffle_choices !== false,
      color: 'text-purple-500',
      activeBg: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300',
      onToggle: () => updateUserSettings({ shuffle_choices: userSettings.shuffle_choices === false })
    },
    {
      id: 'auto_advance',
      label: 'Auto-Advance',
      icon: Sparkles,
      checked: Boolean(userSettings.auto_advance),
      color: 'text-amber-500',
      activeBg: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
      onToggle: () => updateUserSettings({ auto_advance: !userSettings.auto_advance })
    },
    {
      id: 'show_mastery',
      label: 'Mastery Badges',
      icon: Award,
      checked: userSettings.show_mastery !== false,
      color: 'text-teal-500',
      activeBg: 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300',
      onToggle: () => updateUserSettings({ show_mastery: userSettings.show_mastery === false })
    },
  ]

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md pointer-events-auto"
      />

      {/* Single Compact Settings Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden z-[1010] pointer-events-auto max-h-[90vh]"
      >
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                Study Settings
              </h3>
              <p className="text-[10px] font-bold text-slate-400">
                Question {currentIndex + 1} of {totalQuestions || '--'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {/* 1. Learning Mode (2x3 Grid) */}
          <div>
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
              Learning Mode
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-50/80 dark:bg-slate-800/40 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              {LEARNING_MODES.map((m) => {
                const Icon = m.icon
                const isSelected = activeMode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      applyLearningMode(m.id)
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-center transition-all active:scale-95 cursor-pointer",
                      isSelected
                        ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-black"
                        : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50 font-bold"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")} />
                    <span className="text-[10px] leading-tight truncate w-full">{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Font Size Scaling */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Font Scale
              </label>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                {userSettings.font_size || '100%'}
              </span>
            </div>
            <SegmentedControl
              value={userSettings.font_size || '100%'}
              onChange={(val) => updateUserSettings({ font_size: val })}
              options={FONT_SIZE_OPTIONS}
              compact
            />
          </div>

          {/* 3. Quick Toggles (Grid) */}
          <div>
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
              Features & Audio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {toggles.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={t.onToggle}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer",
                      t.checked
                        ? t.activeBg
                        : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-slate-400 hover:bg-slate-100/60"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={cn("w-4 h-4 shrink-0", t.checked ? t.color : "text-slate-400")} />
                      <span className="text-[11px] font-bold truncate">{t.label}</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1",
                      t.checked ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700"
                    )}>
                      {t.checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 4. Quick Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="py-2.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer truncate"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-indigo-500" />}
                <span>{isCopied ? "Copied" : "Copy Q"}</span>
              </button>

              {handleIgnoreQuestion && (
                <button
                  type="button"
                  onClick={handleIgnoreQuestion}
                  className={cn(
                    "py-2.5 px-2 rounded-xl border font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer truncate",
                    currentQuestion?.is_ignored
                      ? "bg-slate-700 text-white border-slate-800"
                      : "bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {currentQuestion?.is_ignored ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-rose-500" />}
                  <span>{currentQuestion?.is_ignored ? "Restore" : "Ignore"}</span>
                </button>
              )}

              {canEdit && openEditModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    openEditModal()
                  }}
                  className="py-2.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer truncate"
                >
                  <Edit3 className="w-3.5 h-3.5 text-purple-500" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {setIsQuitModalOpen && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  setIsQuitModalOpen(true)
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200/70 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-black text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Quit Study Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              updateUserSettings({
                font_size: '100%',
                auto_advance: false,
                show_mastery: true,
                shuffle_choices: true,
                shuffle_questions: true,
                sfx_enabled: true,
                haptic_enabled: true
              })
            }}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  )
}
