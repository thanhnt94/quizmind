import React from 'react'
import {
  Send,
  ShieldCheck,
  Bell,
  Clock,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react'
import { ToggleRow } from './ToggleRow'

interface TelegramAlertsTabProps {
  telegramConfig: any
  pushActive: boolean
  updateTelegram: (data: any) => Promise<void>
  togglePushNotifications: () => Promise<void>
}

export function TelegramAlertsTab({
  telegramConfig,
  pushActive,
  updateTelegram,
  togglePushNotifications,
}: TelegramAlertsTabProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopyLinkCode = () => {
    if (telegramConfig?.connect_token) {
      navigator.clipboard.writeText(`/start ${telegramConfig.connect_token}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const botName = (telegramConfig?.bot_username || 'inmind_auth_bot').replace(/^@/, '')

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ═══════════ SECTION 1: TELEGRAM BOT INTEGRATION ═══════════ */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[2rem] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-3 mb-5 sm:mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs border border-blue-200/60 dark:border-blue-800/40">
            <Send className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Telegram Bot Integration
            </h2>
            <p className="text-[11px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
              Receive spaced repetition quizzes, daily streak protection, and weekly digests on Telegram
            </p>
          </div>
        </div>

        <div className="bg-blue-50/40 dark:bg-blue-950/20 p-4 sm:p-6 rounded-2xl md:rounded-3xl border border-blue-100/70 dark:border-blue-900/40">
          {!telegramConfig?.is_linked ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl mx-auto mb-3 flex items-center justify-center text-blue-500 shadow-sm border border-slate-200/80 dark:border-slate-700">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-1.5">
                Connect Telegram Bot
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
                Link your account once to receive daily quiz reminders and track your streak on Telegram.
              </p>

              {/* Link Code Box */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-4 rounded-2xl flex flex-col items-center gap-1.5 shadow-xs max-w-xs mx-auto">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em]">
                  Your Link Code
                </span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-widest font-mono">
                  {telegramConfig?.connect_token || '...'}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Send <code className="font-mono text-slate-700 dark:text-slate-300 font-bold bg-slate-200/70 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">/start {telegramConfig?.connect_token}</code> to our bot.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyLinkCode}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Copy command"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <a
                  href={`https://t.me/${botName}?start=${telegramConfig?.connect_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full max-w-xs py-3 bg-blue-600 text-white font-bold rounded-2xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
                >
                  <span>Open Bot</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Linked Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-blue-100/60 dark:border-blue-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                      Telegram Connected
                    </h3>
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      Notifications and reminders active
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateTelegram({ unlink: true })}
                  className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 px-3.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors active:scale-95 cursor-pointer"
                >
                  Unlink
                </button>
              </div>

              {/* Reminder Time Picker */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Daily Reminder Time
                  </span>
                </div>
                <select
                  value={telegramConfig?.reminder_time || "20:00"}
                  onChange={(e) => updateTelegram({ reminder_time: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {Array.from({ length: 18 }).map((_, i) => {
                    const hour = (i + 6).toString().padStart(2, '0');
                    return <option key={`${hour}:00`} value={`${hour}:00`}>{`${hour}:00`}</option>
                  })}
                </select>
              </div>

              {/* Advanced Alerts Toggles */}
              <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Automated Digest & Alerts
                </h4>

                <div
                  className="flex items-center justify-between group cursor-pointer py-1"
                  onClick={() => updateTelegram({ streak_guard_enabled: !(telegramConfig?.streak_guard_enabled ?? true) })}
                >
                  <div>
                    <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>🛡️</span> Streak Guard
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                      Urgent alert at 22:00 if daily quiz goal is incomplete
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${telegramConfig?.streak_guard_enabled !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${telegramConfig?.streak_guard_enabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div
                  className="flex items-center justify-between group cursor-pointer py-1 border-t border-slate-100 dark:border-slate-700/60 pt-2.5"
                  onClick={() => updateTelegram({ weekly_summary_enabled: !(telegramConfig?.weekly_summary_enabled ?? true) })}
                >
                  <div>
                    <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>📊</span> Weekly Summary
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                      Progress digest and velocity analysis every Sunday at 09:00
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${telegramConfig?.weekly_summary_enabled !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${telegramConfig?.weekly_summary_enabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div
                  className="flex items-center justify-between group cursor-pointer py-1 border-t border-slate-100 dark:border-slate-700/60 pt-2.5"
                  onClick={() => updateTelegram({ inactivity_alert_enabled: !(telegramConfig?.inactivity_alert_enabled ?? true) })}
                >
                  <div>
                    <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>💤</span> Inactivity Alert
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                      Motivational reminder after 3 consecutive days of absence
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${telegramConfig?.inactivity_alert_enabled !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${telegramConfig?.inactivity_alert_enabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ SECTION 2: BROWSER PUSH NOTIFICATIONS ═══════════ */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[2rem] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs border border-indigo-200/60 dark:border-indigo-800/40">
            <Bell className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Browser Push Notifications
            </h2>
            <p className="text-[11px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
              Receive instant web alerts directly on your mobile device or computer
            </p>
          </div>
        </div>

        <ToggleRow
          icon={Bell}
          label="Daily Quiz Review Push"
          desc="Trigger web push alerts when daily review questions are ready"
          checked={pushActive}
          onChange={() => togglePushNotifications()}
        />
      </section>
    </div>
  )
}
