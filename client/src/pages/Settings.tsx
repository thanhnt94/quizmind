import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { 
  Settings as SettingsIcon, 
  Sparkles,
  ShieldCheck,
  Send,
  Check,
  X,
  Sliders
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { 
  QuizPlaySettingsEditor, 
  TelegramAlertsTab, 
  GeneralSecurityTab 
} from '@/components/settings'

export type SettingsTab = 'study' | 'alerts' | 'general'

interface TabConfig {
  id: SettingsTab
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const SETTINGS_TABS: TabConfig[] = [
  {
    id: 'study',
    label: 'Quiz & Play',
    shortLabel: 'Quiz',
    icon: Sparkles,
    description: 'Interaction, audio & question shuffling'
  },
  {
    id: 'alerts',
    label: 'Telegram & Alerts',
    shortLabel: 'Alerts',
    icon: Send,
    description: 'Telegram bot & push notifications'
  },
  {
    id: 'general',
    label: 'General & Security',
    shortLabel: 'General',
    icon: ShieldCheck,
    description: 'Theme, focus timer & account security'
  }
]

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const { userSettings, updateUserSettings, authConfig, fetchAuthConfig } = useAppStore()

  // ─── Tab navigation ───
  const tabFromUrl = searchParams.get('tab') as SettingsTab | null
  const initialTab: SettingsTab = (tabFromUrl && SETTINGS_TABS.some(t => t.id === tabFromUrl))
    ? tabFromUrl
    : 'study'

  const [activeTab, setActiveTabState] = useState<SettingsTab>(initialTab)

  const setActiveTab = (tab: SettingsTab) => {
    setActiveTabState(tab)
    setSearchParams({ tab }, { replace: true })
  }

  // ─── Study tab state ───
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUpdateStudySetting = async (key: string, value: any) => {
    try {
      await updateUserSettings({ [key]: value })
    } catch (err) {
      console.error(`Failed to update ${key}`, err)
      setToastMessage({ type: 'error', text: `Failed to save ${key}.` })
    }
  }

  // ─── Telegram & Alerts state ───
  const [pushActive, setPushActive] = useState(false)
  const [telegramConfig, setTelegramConfig] = useState<any>(null)

  const fetchTelegramConfig = async () => {
    try {
      const res = await axios.get('/api/v1/notifications/telegram/config')
      setTelegramConfig(res.data)
    } catch (e) {
      console.error("Failed to fetch telegram config:", e)
    }
  }

  const updateTelegram = async (data: any) => {
    try {
      await axios.post('/api/v1/notifications/telegram/config', data)
      await fetchTelegramConfig()
    } catch (e) {
      console.error("Failed to update telegram config:", e)
    }
  }

  useEffect(() => {
    fetchTelegramConfig()
    fetchAuthConfig()
    
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready
          const sub = await registration.pushManager.getSubscription()
          setPushActive(!!sub && Notification.permission === 'granted')
        } catch (e) {
          console.error("Error checking push subscription status:", e)
        }
      }
    }
    checkSubscription()
  }, [])

  // Deep linking via hash
  useEffect(() => {
    if (location.hash) {
      if (location.hash === '#preferences' || location.hash === '#security') {
        setActiveTabState('general')
      } else if (location.hash === '#telegram') {
        setActiveTabState('alerts')
      } else {
        setActiveTabState('study')
      }
    }
  }, [location.hash])

  const togglePushNotifications = async () => {
    if (pushActive) {
      setPushActive(false)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()
          if (subscription) {
            await subscription.unsubscribe()
            await axios.post('/api/v1/notifications/push/unsubscribe', {
              endpoint: subscription.endpoint
            })
          }
        } catch (e) {
          console.error("Failed to unsubscribe", e)
        }
      }
    } else {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert("Push notifications are not supported in this browser.")
        return
      }
      
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert("Notification permission denied. Please allow notifications in browser settings.")
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        const keyRes = await axios.get('/api/v1/notifications/vapid-public-key')
        const vapidPublicKey = keyRes.data.public_key
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        })

        const subJson = subscription.toJSON()
        await axios.post('/api/v1/notifications/push/subscribe', {
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth
          }
        })
        setPushActive(true)
      } catch (error) {
        console.error("Push subscription failed", error)
        alert("Failed to subscribe. Please try again.")
      }
    }
  }

  // ─── Swipe Gestures for Mobile Tab Switching ───
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const diffX = touchStartX.current - e.changedTouches[0].clientX
    const diffY = touchStartY.current - e.changedTouches[0].clientY

    // Ensure horizontal swipe is dominant and exceeds threshold
    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      const tabOrder: SettingsTab[] = ['study', 'alerts', 'general']
      const currentIndex = tabOrder.indexOf(activeTab)

      if (diffX > 0 && currentIndex < tabOrder.length - 1) {
        // Swipe left -> Next tab
        if (navigator.vibrate) navigator.vibrate(8)
        setActiveTab(tabOrder[currentIndex + 1])
      } else if (diffX < 0 && currentIndex > 0) {
        // Swipe right -> Previous tab
        if (navigator.vibrate) navigator.vibrate(8)
        setActiveTab(tabOrder[currentIndex - 1])
      }
    }

    touchStartX.current = null
    touchStartY.current = null
  }

  // ══════════════ TAB 1: QUIZ & PLAY ══════════════
  const renderStudyTab = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              "p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm border",
              toastMessage.type === 'success'
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            )}
          >
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Settings Card */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[2rem] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider mb-2 border border-indigo-200/70 dark:border-indigo-800/60">
            <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>Account Play Preferences</span>
          </div>
          <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Quiz Controls & Preferences
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Configure instant feedback, sound effects, question shuffling, audio autoplay, and session defaults.
          </p>
        </div>

        {/* Modular Editor */}
        <QuizPlaySettingsEditor
          settings={userSettings}
          onChange={handleUpdateStudySetting}
        />
      </section>
    </div>
  )

  // ══════════════ TAB 2: TELEGRAM & ALERTS ══════════════
  const renderAlertsTab = () => (
    <TelegramAlertsTab
      telegramConfig={telegramConfig}
      pushActive={pushActive}
      updateTelegram={updateTelegram}
      togglePushNotifications={togglePushNotifications}
    />
  )

  // ══════════════ TAB 3: GENERAL & SECURITY ══════════════
  const renderGeneralTab = () => (
    <GeneralSecurityTab
      userSettings={userSettings}
      updateUserSettings={updateUserSettings}
      authConfig={authConfig}
    />
  )

  return (
    <div className="fixed inset-0 top-0 bottom-[calc(56px+env(safe-area-inset-bottom))] md:relative md:inset-auto md:top-auto md:bottom-auto md:h-full md:min-h-0 md:w-full flex flex-col bg-[#F8FAFC] dark:bg-[#0b0f19] overflow-hidden text-left select-none">
      {/* ═══════════ TOP UNIFIED HEADER ═══════════ */}
      <div className="shrink-0 z-30 bg-white/95 dark:bg-slate-900/95 md:backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs md:shadow-none px-3.5 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-2.5">
        <div className="w-full max-w-[1400px] 2xl:max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 text-left">
          {/* Left: Indigo Brand Badge with Squircle */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs shrink-0">
              <SettingsIcon className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">
                  Settings & Preferences
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 text-[10px] font-black shrink-0 leading-none">
                  Config
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 leading-none truncate">
                <span>Configure quiz controls, audio, alerts & security</span>
                <span className="text-amber-500">✨</span>
              </p>
            </div>
          </div>

          {/* Unified Responsive Segmented Tab Switcher */}
          <div className="w-full sm:w-auto">
            <div className="grid grid-cols-3 sm:flex sm:items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/70 shadow-inner gap-1">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(8)
                      setActiveTab(tab.id)
                    }}
                    className={cn(
                      "relative py-1.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 min-w-0",
                      isActive
                        ? "text-slate-900 dark:text-slate-100 font-black shadow-xs bg-white dark:bg-slate-700"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    <Icon className={cn(
                      "w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors",
                      isActive ? "text-indigo-600 dark:text-indigo-400 stroke-[2.4]" : "text-slate-400 dark:text-slate-500"
                    )} />
                    <span className="truncate text-[11px] sm:text-xs leading-tight">{tab.shortLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ MAIN TAB CONTENT WITH TOUCH SWIPE ═══════════ */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3.5 sm:px-6 lg:px-8 xl:px-10 py-3.5 md:py-6"
      >
        <div className="w-full max-w-[1400px] 2xl:max-w-[1600px] mx-auto space-y-4 md:space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-4 md:space-y-6"
            >
              {activeTab === 'study' && renderStudyTab()}
              {activeTab === 'alerts' && renderAlertsTab()}
              {activeTab === 'general' && renderGeneralTab()}
            </motion.div>
          </AnimatePresence>

          <div className="pt-2 pb-6 text-center">
            <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">
              QuizMind v2.0.0 // Neural Link
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
