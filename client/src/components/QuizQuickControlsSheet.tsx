import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sliders,
  Settings,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  MoveHorizontal,
  Layers,
  Eye,
  EyeOff,
  Type,
  Shuffle,
  Star,
  Flag,
  Lightbulb,
  MousePointer,
  Pencil,
  FileText,
  Brain,
  TrendingUp,
  ChevronRight,
  Lock,
  BookOpen,
  ListOrdered,
  Award,
  AlertCircle,
  CheckCircle2,
  Vibrate,
  VibrateOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

export interface QuizQuickControlsSheetProps {
  isOpen: boolean
  onClose: () => void
  onOpenSettings: () => void
  activeMode?: string
  onSelectMode?: (mode: string) => void
  currentQuestion?: any
  onOpenCardHub?: (tab: 'stats' | 'insight' | 'note' | 'community') => void
  canEdit?: boolean
  onOpenEditModal?: () => void
  isFlagged?: boolean
  onToggleFlag?: () => void
  isIgnored?: boolean
  onToggleIgnore?: () => void
  showingHint?: boolean
  onToggleHint?: () => void
  showMasteryBadges?: boolean
  onToggleMasteryBadges?: () => void
  showLocalToast?: (msg: string, type?: 'info' | 'success' | 'warning') => void
}

const QUIZ_MODES = [
  {
    id: 'sequential',
    short: 'CLASSIC',
    name: 'Sequential 1 to End',
    icon: '📖',
    activeClass: 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
  },
  {
    id: 'random',
    short: 'SHUFFLE',
    name: 'Randomized Order',
    icon: '🔀',
    activeClass: 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
  },
  {
    id: 'hardest',
    short: 'MASTERY',
    name: 'Leitner Spaced Repetition',
    icon: '🏆',
    activeClass: 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
  },
  {
    id: 'review',
    short: 'REV',
    name: 'Review Mistakes',
    icon: '📚',
    activeClass: 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
  },
  {
    id: 'unseen',
    short: 'NEW',
    name: 'New & Unattempted First',
    icon: '✨',
    activeClass: 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
  }
]

export const QuizQuickControlsSheet: React.FC<QuizQuickControlsSheetProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  activeMode = 'sequential',
  onSelectMode,
  currentQuestion,
  onOpenCardHub,
  canEdit = false,
  onOpenEditModal,
  isFlagged = false,
  onToggleFlag,
  isIgnored = false,
  onToggleIgnore,
  showingHint = false,
  onToggleHint,
  showMasteryBadges = true,
  onToggleMasteryBadges,
  showLocalToast
}) => {
  const { userSettings, updateUserSettings } = useAppStore()

  if (typeof document === 'undefined') return null

  // 1. Autoplay cycle & meta
  const autoPlayAudio = userSettings?.autoplay_audio ?? 'none'
  const autoplayMeta = (() => {
    switch (autoPlayAudio) {
      case 'always':
        return {
          label: 'ON',
          color: 'text-emerald-600',
          container: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs',
          iconBox: 'bg-emerald-500 text-white shadow-2xs',
          icon: <Volume2 className="w-4 h-4" />,
          title: 'Autoplay: Questions Aloud'
        }
      default:
        return {
          label: 'OFF',
          color: 'text-slate-400',
          container: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500',
          iconBox: 'bg-white text-slate-400 border border-slate-200/60',
          icon: <VolumeX className="w-4 h-4" />,
          title: 'Autoplay: OFF'
        }
    }
  })()

  const handleCycleAutoplay = () => {
    const nextVal = autoPlayAudio === 'always' ? 'never' : 'always'
    updateUserSettings({ autoplay_audio: nextVal })
    showLocalToast?.(`Question TTS: ${nextVal === 'always' ? 'ON' : 'OFF'}`, 'info')
  }

  // 2. SFX Sounds
  const sfxEnabled = userSettings?.sfx_enabled ?? true
  const handleToggleSfx = () => {
    const nextVal = !sfxEnabled
    updateUserSettings({ sfx_enabled: nextVal })
    showLocalToast?.(`SFX Sounds: ${nextVal ? 'ON' : 'OFF'}`, 'info')
  }

  // 3. Haptic Feedback
  const hapticEnabled = userSettings?.haptic_enabled ?? true
  const handleToggleHaptic = () => {
    const nextVal = !hapticEnabled
    updateUserSettings({ haptic_enabled: nextVal })
    if (nextVal && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50)
    }
    showLocalToast?.(`Haptic Feedback: ${nextVal ? 'ON' : 'OFF'}`, 'info')
  }

  // 4. Auto Next
  const autoAdvance = userSettings?.auto_advance && userSettings.auto_advance !== 'off'
  const handleToggleAutoAdvance = () => {
    const nextVal = autoAdvance ? 'off' : '2s'
    updateUserSettings({ auto_advance: nextVal })
    showLocalToast?.(`Auto Next: ${nextVal !== 'off' ? 'ON (2s)' : 'OFF'}`, 'info')
  }

  // 5. Font Size cycle (100% -> 115% -> 130% -> 85%)
  const fontSize = userSettings?.font_size ?? '100%'
  const fontMeta = (() => {
    const pct = parseInt(fontSize, 10) || 100
    if (pct <= 85) return { label: '85%', sub: 'Compact', active: true, color: 'text-violet-600' }
    if (pct <= 105) return { label: '100%', sub: 'Normal', active: false, color: 'text-slate-500' }
    if (pct <= 120) return { label: '115%', sub: 'Large', active: true, color: 'text-indigo-600' }
    return { label: '130%', sub: 'XL', active: true, color: 'text-purple-600' }
  })()

  const handleCycleFontSize = () => {
    const pct = parseInt(fontSize, 10) || 100
    let nextVal = '100%'
    if (pct <= 85) nextVal = '100%'
    else if (pct <= 105) nextVal = '115%'
    else if (pct <= 120) nextVal = '130%'
    else nextVal = '85%'

    updateUserSettings({ font_size: nextVal })
    showLocalToast?.(`Font Size: ${nextVal}`, 'info')
  }

  // 6. Options Layout (Full vs Compact)
  const isCompactOptions = userSettings?.options_layout === 'compact'
  const handleToggleOptionsLayout = () => {
    const nextVal = isCompactOptions ? 'full' : 'compact'
    updateUserSettings({ options_layout: nextVal })
    showLocalToast?.(`Options: ${nextVal === 'compact' ? 'COMPACT' : 'FULL'}`, 'info')
  }

  // 7. Shuffle toggle
  const isShuffleActive = activeMode === 'random'
  const handleToggleShuffle = () => {
    if (onSelectMode) {
      onSelectMode(isShuffleActive ? 'sequential' : 'random')
      showLocalToast?.(`Shuffle: ${!isShuffleActive ? 'ON' : 'OFF'}`, 'info')
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col justify-end pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          />

          {/* Bottom Drawer Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg mx-auto bg-white rounded-t-[2.2rem] border-t border-slate-200/90 shadow-2xl p-4 sm:p-5 pb-6 sm:pb-8 flex flex-col gap-3.5 select-none z-10 max-h-[85vh] overflow-y-auto"
          >
            {/* Drag Handle Bar */}
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto -mt-1 mb-0.5" />

            {/* Header Bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Quick Controls</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Quiz Preferences</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* All Settings Button */}
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenSettings()
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 flex items-center justify-center transition-all active:scale-90 cursor-pointer border border-slate-200/60 shadow-2xs group"
                  title="All Quiz Settings"
                >
                  <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 5 Quiz Study Modes Switcher */}
            {onSelectMode && (
              <div className="flex flex-col gap-1 text-left px-0.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Quiz Study Mode
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    5 Modes Available
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
                  {QUIZ_MODES.map((m) => {
                    const isActive = activeMode === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectMode(m.id)}
                        className={cn(
                          "flex flex-col items-center justify-center py-2 px-0.5 rounded-xl transition-all cursor-pointer select-none",
                          isActive
                            ? cn(m.activeClass, "scale-[1.02]")
                            : "bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900"
                        )}
                        title={m.name}
                      >
                        <span className="text-base leading-none mb-1">{m.icon}</span>
                        <span className="text-[9.5px] font-black tracking-tight uppercase leading-tight">{m.short}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ══════ SECTION 1: AUDIO & FLOW ══════ */}
            <div className="flex flex-col gap-1.5 text-left px-0.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Audio & Flow
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  Sound & Pacing
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                {/* 1. Autoplay */}
                <button
                  type="button"
                  onClick={handleCycleAutoplay}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                    autoplayMeta.container
                  )}
                  title={autoplayMeta.title}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", autoplayMeta.iconBox)}>
                    {autoplayMeta.icon}
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">Autoplay</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", autoplayMeta.color)}>
                      {autoplayMeta.label}
                    </span>
                  </div>
                </button>

                {/* 2. SFX Audio */}
                <button
                  type="button"
                  onClick={handleToggleSfx}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                    sfxEnabled
                      ? "bg-purple-50 border-purple-300 text-purple-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={`SFX Audio: ${sfxEnabled ? 'ON' : 'OFF'}`}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", sfxEnabled ? "bg-purple-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">SFX Audio</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", sfxEnabled ? "text-purple-600" : "text-slate-400")}>
                      {sfxEnabled ? "ON" : "OFF"}
                    </span>
                  </div>
                </button>

                {/* 3. Haptic */}
                <button
                  type="button"
                  onClick={handleToggleHaptic}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                    hapticEnabled
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={`Haptic Vibration: ${hapticEnabled ? 'ON' : 'OFF'}`}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", hapticEnabled ? "bg-emerald-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    {hapticEnabled ? <Vibrate className="w-4 h-4" /> : <VibrateOff className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">Haptic</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", hapticEnabled ? "text-emerald-600" : "text-slate-400")}>
                      {hapticEnabled ? "ON" : "OFF"}
                    </span>
                  </div>
                </button>

                {/* 4. Auto Next */}
                <button
                  type="button"
                  onClick={handleToggleAutoAdvance}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                    autoAdvance
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={`Auto Next: ${autoAdvance ? 'ON (2s)' : 'OFF'}`}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", autoAdvance ? "bg-indigo-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">Auto Next</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", autoAdvance ? "text-indigo-600" : "text-slate-400")}>
                      {autoAdvance ? "ON" : "OFF"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* ══════ SECTION 2: DISPLAY & GESTURES ══════ */}
            <div className="flex flex-col gap-1.5 text-left px-0.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Display & Gestures
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  Visuals & Controls
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                {/* 1. Rate Mode / Question Flow */}
                <button
                  type="button"
                  onClick={() => {
                    showLocalToast?.("Instant Answer Flow: TAP", 'info')
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl border bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none"
                  title="Question Flow: Instant Tap"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white shadow-2xs flex items-center justify-center">
                    <MoveHorizontal className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">Rate Mode</span>
                    <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600">
                      TAP
                    </span>
                  </div>
                </button>

                {/* 2. Options layout */}
                <button
                  type="button"
                  onClick={handleToggleOptionsLayout}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                    isCompactOptions
                      ? "bg-teal-50 border-teal-300 text-teal-700 shadow-2xs"
                      : "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                  )}
                  title={`Options: ${isCompactOptions ? 'COMPACT' : 'FULL'}`}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isCompactOptions ? "bg-teal-600 text-white" : "bg-emerald-500 text-white")}>
                    <Eye className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">Options</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", isCompactOptions ? "text-teal-600" : "text-emerald-600")}>
                      {isCompactOptions ? "COMPACT" : "FULL"}
                    </span>
                  </div>
                </button>

                {/* 3. Font Size */}
                <button
                  type="button"
                  onClick={handleCycleFontSize}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                    fontMeta.active
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={`Font Size: ${fontMeta.label} (${fontMeta.sub})`}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", fontMeta.active ? "bg-indigo-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <Type className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">Font Size</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", fontMeta.color)}>
                      {fontMeta.label}
                    </span>
                  </div>
                </button>

                {/* 4. Shuffle */}
                <button
                  type="button"
                  onClick={handleToggleShuffle}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                    isShuffleActive
                      ? "bg-violet-50 border-violet-300 text-violet-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={`Shuffle Order: ${isShuffleActive ? 'ON' : 'OFF'}`}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isShuffleActive ? "bg-violet-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <Shuffle className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">Shuffle</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", isShuffleActive ? "text-violet-600" : "text-slate-400")}>
                      {isShuffleActive ? "ON" : "OFF"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* ══════ SECTION 3: STUDY SHORTCUTS ══════ */}
            <div className="flex flex-col gap-1.5 text-left px-0.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Study Shortcuts
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  Card State & Badges
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                {/* 1. Star / Flag */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleFlag?.()
                    showLocalToast?.(`Question: ${!isFlagged ? 'FLAGGED' : 'UNFLAGGED'}`, 'info')
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                    isFlagged
                      ? "bg-violet-50 border-violet-200 text-violet-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={isFlagged ? "Unflag Question" : "Flag Question"}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isFlagged ? "bg-violet-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <Star className={cn("w-4 h-4", isFlagged && "fill-white")} />
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">Star</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", isFlagged ? "text-violet-600" : "text-slate-400")}>
                      {isFlagged ? "STARRED" : "OFF"}
                    </span>
                  </div>
                </button>

                {/* 2. AI Hint */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleHint?.()
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                    showingHint
                      ? "bg-blue-50 border-blue-200 text-blue-800 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={showingHint ? "Hide AI Hint" : "Reveal AI Hint"}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", showingHint ? "bg-blue-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <Lightbulb className={cn("w-4 h-4", showingHint && "fill-white")} />
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">AI Hint</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", showingHint ? "text-blue-700" : "text-slate-400")}>
                      {showingHint ? "ACTIVE" : "OFF"}
                    </span>
                  </div>
                </button>

                {/* 3. Ignore Question */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleIgnore?.()
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                    isIgnored
                      ? "bg-rose-50 border-rose-300 text-rose-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={isIgnored ? "Restore Question" : "Ignore Question"}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", isIgnored ? "bg-rose-500 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    {isIgnored ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">Ignore</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", isIgnored ? "text-rose-600" : "text-slate-400")}>
                      {isIgnored ? "IGNORED" : "OFF"}
                    </span>
                  </div>
                </button>

                {/* 4. Mastery Badges */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleMasteryBadges?.()
                    showLocalToast?.(`Mastery Badges: ${!showMasteryBadges ? 'SHOWN' : 'OFF'}`, 'info')
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center min-h-[72px] gap-1.5 cursor-pointer select-none",
                    showMasteryBadges
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 text-slate-500"
                  )}
                  title={`Mastery Badges: ${showMasteryBadges ? 'SHOWN' : 'OFF'}`}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", showMasteryBadges ? "bg-emerald-600 text-white shadow-2xs" : "bg-white text-slate-400 border border-slate-200/60")}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-bold tracking-tight">Badges</span>
                    <span className={cn("text-[8px] font-black uppercase tracking-wider", showMasteryBadges ? "text-emerald-600" : "text-slate-400")}>
                      {showMasteryBadges ? "SHOWN" : "OFF"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* ══════ SECTION 4: CARD ACTIONS & DRAWERS ══════ */}
            <div className="flex flex-col gap-1.5 text-left px-0.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Card Actions & Drawers
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  Open Modals & Panels
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {/* 1. Edit Question */}
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => {
                    onClose()
                    onOpenEditModal?.()
                  }}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-2xl border transition-all active:scale-98 text-left select-none group shadow-2xs",
                    canEdit
                      ? "bg-slate-50 hover:bg-blue-50/70 border-slate-200/80 hover:border-blue-300 cursor-pointer"
                      : "bg-slate-50/60 border-slate-200/50 opacity-60 cursor-not-allowed"
                  )}
                  title={canEdit ? "Open Question Editor" : "Editing locked"}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105",
                      canEdit ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"
                    )}>
                      <Pencil className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 leading-none gap-0.5">
                      <span className="text-[11px] font-bold text-slate-800 tracking-tight truncate">Edit Question</span>
                      <span className="text-[9px] text-slate-400 font-medium truncate">
                        {canEdit ? "Question Editor" : "Locked"}
                      </span>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ml-1",
                    canEdit
                      ? "bg-slate-200/60 group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600"
                      : "text-slate-300"
                  )}>
                    {canEdit ? (
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* 2. Card Note */}
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenCardHub?.('note')
                  }}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 hover:bg-violet-50/70 border border-slate-200/80 hover:border-violet-200 transition-all active:scale-98 text-left select-none group shadow-2xs cursor-pointer"
                  title="Open Personal Notes Drawer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 leading-none gap-0.5">
                      <span className="text-[11px] font-bold text-slate-800 tracking-tight truncate">Card Note</span>
                      <span className="text-[9px] text-slate-400 font-medium truncate">Personal Notes</span>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-slate-200/60 group-hover:bg-violet-100 flex items-center justify-center text-slate-400 group-hover:text-violet-600 shrink-0 transition-colors ml-1">
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 3. AI Explain */}
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenCardHub?.('insight')
                  }}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-300 transition-all active:scale-98 text-left select-none group shadow-2xs cursor-pointer"
                  title="Open AI Explanations Drawer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 leading-none gap-0.5">
                      <span className="text-[11px] font-bold text-slate-800 tracking-tight truncate">AI Explain</span>
                      <span className="text-[9px] text-slate-400 font-medium truncate">Deep Insights</span>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-slate-200/60 group-hover:bg-purple-100 flex items-center justify-center text-slate-400 group-hover:text-purple-600 shrink-0 transition-colors ml-1">
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 4. Card Stats */}
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenCardHub?.('stats')
                  }}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200/80 hover:border-teal-300 transition-all active:scale-98 text-left select-none group shadow-2xs cursor-pointer"
                  title="Open Detailed Card Stats & History"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 leading-none gap-0.5">
                      <span className="text-[11px] font-bold text-slate-800 tracking-tight truncate">Card Stats</span>
                      <span className="text-[9px] text-slate-400 font-medium truncate">Mastery & Stats</span>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-slate-200/60 group-hover:bg-teal-100 flex items-center justify-center text-slate-400 group-hover:text-teal-600 shrink-0 transition-colors ml-1">
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
