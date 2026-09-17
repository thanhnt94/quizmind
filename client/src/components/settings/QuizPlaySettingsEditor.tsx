import React from 'react'
import {
  Sparkles,
  Zap,
  Volume2,
  Clock,
  Shuffle,
  HelpCircle,
  Headphones,
  CheckCircle2,
  Layers,
  BookOpen,
  Target
} from 'lucide-react'
import { ToggleRow } from './ToggleRow'
import { SegmentedControl, type SegmentedOption } from './SegmentedControl'
import type { UserSettings } from '@/store/useAppStore'

interface QuizPlaySettingsEditorProps {
  settings: Partial<UserSettings>
  onChange: (key: string, value: any) => void
  compact?: boolean
}

export function QuizPlaySettingsEditor({
  settings,
  onChange,
  compact = false,
}: QuizPlaySettingsEditorProps) {
  const gap = compact ? "gap-3" : "gap-5"
  const sectionPadding = compact ? "p-3 sm:p-4" : "p-4 sm:p-6"

  const audioOptions: SegmentedOption<string>[] = [
    { id: 'never', label: 'Never' },
    { id: 'question', label: 'Questions' },
    { id: 'always', label: 'Always' },
  ]

  const defaultModeOptions: SegmentedOption<string>[] = [
    { id: 'mcq', label: 'Practice (Instant)' },
    { id: 'exam', label: 'Exam (Batch)' },
  ]

  const defaultScopeOptions: SegmentedOption<string>[] = [
    { id: 'all', label: 'Smart Mix' },
    { id: 'new', label: 'New Only' },
    { id: 'missed', label: 'Review Due' },
  ]

  const defaultBatchOptions: SegmentedOption<number>[] = [
    { id: 5, label: '5' },
    { id: 10, label: '10' },
    { id: 20, label: '20' },
    { id: 50, label: '50' },
  ]

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 ${gap}`}>
      {/* ════════ GROUP 1: Interaction & Feedback ════════ */}
      <div className={`space-y-3 ${sectionPadding} rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800`}>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Zap className="w-4 h-4" />
          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Interaction & Feedback
          </h4>
        </div>

        <ToggleRow
          icon={CheckCircle2}
          label="Instant Answer Feedback"
          desc="Show correct answer and explanation immediately upon selecting choice"
          checked={settings.instant_feedback ?? true}
          onChange={(val) => onChange('instant_feedback', val)}
          compact={compact}
        />

        <ToggleRow
          icon={Volume2}
          label="Sound Effects (SFX)"
          desc="Play audio feedback on answer selection and completion"
          checked={settings.sfx_enabled ?? true}
          onChange={(val) => onChange('sfx_enabled', val)}
          compact={compact}
        />

        <ToggleRow
          icon={Zap}
          label="Haptic Feedback"
          desc="Trigger subtle vibration on mobile taps and card selections"
          checked={settings.haptic_enabled ?? true}
          onChange={(val) => onChange('haptic_enabled', val)}
          compact={compact}
        />

        <ToggleRow
          icon={Clock}
          label="Session Timer HUD"
          desc="Display active timer and per-question pace indicator"
          checked={settings.focus_timer_active ?? true}
          onChange={(val) => onChange('focus_timer_active', val)}
          compact={compact}
        />
      </div>

      {/* ════════ GROUP 2: Display & Shuffling ════════ */}
      <div className={`space-y-3 ${sectionPadding} rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800`}>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Shuffle className="w-4 h-4" />
          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Display & Shuffling
          </h4>
        </div>

        <ToggleRow
          icon={Shuffle}
          label="Shuffle Answer Choices"
          desc="Randomize choices order (A, B, C, D) when questions permit"
          checked={settings.shuffle_choices ?? true}
          onChange={(val) => onChange('shuffle_choices', val)}
          compact={compact}
        />

        <ToggleRow
          icon={Layers}
          label="Shuffle Question Order"
          desc="Randomize question sequence across practice sessions"
          checked={settings.shuffle_questions ?? true}
          onChange={(val) => onChange('shuffle_questions', val)}
          compact={compact}
        />

        <ToggleRow
          icon={HelpCircle}
          label="Auto-Expand Explanations"
          desc="Automatically expand detailed solution reasoning after answering"
          checked={settings.auto_expand_explanation ?? true}
          onChange={(val) => onChange('auto_expand_explanation', val)}
          compact={compact}
        />

        {/* Audio Autoplay Selector */}
        <div className="pt-1.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-indigo-500" />
              Autoplay Listening Audio
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              {settings.autoplay_audio === 'always' ? 'All Audio' : settings.autoplay_audio === 'question' ? 'Questions Only' : 'Disabled'}
            </span>
          </div>
          <SegmentedControl
            value={settings.autoplay_audio || 'never'}
            onChange={(val) => onChange('autoplay_audio', val)}
            options={audioOptions}
            compact={compact}
          />
        </div>
      </div>

      {/* ════════ GROUP 3: Session Launch Defaults ════════ */}
      <div className={`space-y-4 ${sectionPadding} rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 lg:col-span-2`}>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Target className="w-4 h-4" />
          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Session Launch Defaults
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Default Mode */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
              Default Format
            </label>
            <SegmentedControl
              value={settings.quiz_learning_mode === 'exam' ? 'exam' : 'mcq'}
              onChange={(val) => onChange('quiz_learning_mode', val)}
              options={defaultModeOptions}
              compact={compact}
            />
          </div>

          {/* Default Scope */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
              Default Question Scope
            </label>
            <SegmentedControl
              value={settings.practice_range || 'all'}
              onChange={(val) => onChange('practice_range', val)}
              options={defaultScopeOptions}
              compact={compact}
            />
          </div>

          {/* Default Batch Size */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
              Default Batch Size
            </label>
            <SegmentedControl
              value={settings.exam_batch_size || 10}
              onChange={(val) => onChange('exam_batch_size', Number(val))}
              options={defaultBatchOptions}
              compact={compact}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
