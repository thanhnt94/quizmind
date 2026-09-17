import React from 'react'
import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string | number | boolean> {
  id: T
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

interface SegmentedControlProps<T extends string | number | boolean> {
  value: T
  onChange: (val: T) => void
  options: SegmentedOption<T>[]
  className?: string
  compact?: boolean
}

export function SegmentedControl<T extends string | number | boolean>({
  value,
  onChange,
  options,
  className,
  compact = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "grid gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const isSelected = value === opt.id
        const Icon = opt.icon
        return (
          <button
            key={String(opt.id)}
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(6)
              onChange(opt.id)
            }}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-xl text-xs font-black transition-all select-none cursor-pointer truncate",
              compact ? "py-1.5 px-1" : "py-2 px-1.5",
              isSelected
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/90 dark:border-slate-600 font-black"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
