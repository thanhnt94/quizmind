import React, { useState } from 'react'
import axios from 'axios'
import {
  ShieldCheck,
  Moon,
  Clock,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { ToggleRow } from './ToggleRow'
import type { UserSettings } from '@/store/useAppStore'

interface GeneralSecurityTabProps {
  userSettings: UserSettings
  updateUserSettings: (partial: Partial<UserSettings>) => Promise<void>
  authConfig: any
}

export function GeneralSecurityTab({
  userSettings,
  updateUserSettings,
  authConfig,
}: GeneralSecurityTabProps) {
  const darkMode = userSettings.theme === 'dark'
  const focusTimer = userSettings.focus_timer_active

  const toggleDarkMode = () => {
    const nextMode = darkMode ? 'light' : 'dark'
    if (nextMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    updateUserSettings({ theme: nextMode })
  }

  const toggleFocusTimer = () => {
    updateUserSettings({ focus_timer_active: !focusTimer })
  }

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })
  const [passLoading, setPassLoading] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassMsg({ type: '', text: '' })
    if (!currentPassword || !newPassword) {
      setPassMsg({ type: 'error', text: 'Please fill in both current and new password fields.' })
      return
    }

    setPassLoading(true)
    try {
      const res = await axios.post('/api/v1/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      if (res.data.status === 'success') {
        setPassMsg({ type: 'success', text: res.data.message || 'Password updated successfully!' })
        setCurrentPassword('')
        setNewPassword('')
      } else {
        setPassMsg({ type: 'error', text: res.data.message || 'Failed to update password.' })
      }
    } catch (err: any) {
      setPassMsg({
        type: 'error',
        text: err.response?.data?.detail || err.response?.data?.message || 'Failed to change password. Please check your current password.',
      })
    } finally {
      setPassLoading(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ═══════════ SECTION 1: SYSTEM PREFERENCES ═══════════ */}
      <section id="preferences" className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[2rem] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs border border-emerald-200/60 dark:border-emerald-800/40">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              System Preferences
            </h2>
            <p className="text-[11px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
              Visual theme, interface styles, and telemetry behaviors
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <ToggleRow
            icon={Moon}
            label="Dark Matrix Mode"
            desc="Switch application interface to deep high-contrast dark theme"
            checked={darkMode}
            onChange={toggleDarkMode}
          />
          <ToggleRow
            icon={Clock}
            label="Focus Stopwatch Active"
            desc="Keep neural focus timer running during active quiz attempts"
            checked={focusTimer}
            onChange={toggleFocusTimer}
          />
        </div>
      </section>

      {/* ═══════════ SECTION 2: ACCOUNT & SECURITY ═══════════ */}
      <section id="security" className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[2rem] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs border border-rose-200/60 dark:border-rose-800/40">
            <Lock className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Account & Security
            </h2>
            <p className="text-[11px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
              Authentication credentials and ecosystem single sign-on link
            </p>
          </div>
        </div>

        {authConfig?.sso_enabled ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-5 sm:p-7 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-700 text-center">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-2xs border border-indigo-200/60 dark:border-indigo-800/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-1.5">
              SSO Managed Account
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5 max-w-md mx-auto leading-relaxed">
              Your account authentication and credentials are centrally managed by <strong>CentralAuth</strong>. To update your password, email, or profile security, please visit the SSO hub.
            </p>
            <a
              href={authConfig.jump_url || 'https://auth.inmind.site'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full max-w-xs py-3 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>Manage in SSO</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="bg-slate-50 dark:bg-slate-800/50 p-5 sm:p-7 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-700 max-w-lg space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Change Local Password
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {passMsg.text && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  passMsg.type === 'error'
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60'
                }`}
              >
                {passMsg.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{passMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={passLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {passLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
