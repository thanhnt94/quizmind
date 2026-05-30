import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import { 
  Settings as SettingsIcon, 
  Brain, 
  Zap, 
  Clock, 
  RotateCcw, 
  Shuffle, 
  ListOrdered,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Bell,
  Moon,
  Send
} from 'lucide-react'

const Settings = () => {
  const [telegramConfig, setTelegramConfig] = useState<any>(null)
  
  const [pushActive, setPushActive] = useState(false)
  const [checkingPush, setCheckingPush] = useState(true)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  const [focusTimer, setFocusTimer] = useState(() => localStorage.getItem('focus_timer_active') !== 'false')

  const toggleDarkMode = () => {
    const nextMode = !darkMode
    setDarkMode(nextMode)
    if (nextMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const toggleFocusTimer = () => {
    const nextVal = !focusTimer
    setFocusTimer(nextVal)
    localStorage.setItem('focus_timer_active', String(nextVal))
  }

  
  const fetchTelegramConfig = async () => {
    try {
      const res = await axios.get('/api/v1/notifications/telegram/config')
      setTelegramConfig(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const updateTelegram = async (data: any) => {
    try {
      await axios.post('/api/v1/notifications/telegram/config', data)
      fetchTelegramConfig()
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchTelegramConfig()
    
    // Check if browser has push subscription active
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
      setCheckingPush(false)
    }
    checkSubscription()
  }, [])

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const togglePushNotifications = async () => {
    if (pushActive) {
      // Unsubscribe
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
      // Subscribe
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-12 mb-8">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">System Configuration</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Optimize Your Neural Link</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Telegram Settings */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8">
          <div className="flex items-center gap-2 mb-8">
            <Send className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Telegram Integration</h2>
          </div>
          
          <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-50">
            {!telegramConfig?.is_linked ? (
              <div className="text-center">
                <div className="w-12 h-12 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center text-blue-500 shadow-sm border border-slate-100">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Connect Telegram Bot</h3>
                <p className="text-[10px] font-medium text-slate-400 mb-6">Get daily reminders and practice directly on Telegram.</p>
                <div className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm max-w-xs mx-auto">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Your Link Code</span>
                  <span className="text-2xl font-black text-blue-600 tracking-widest">{telegramConfig?.connect_token || '...'}</span>
                </div>
                <div className="mt-6">
                  <p className="text-[10px] font-medium text-slate-400 mb-3">
                    Send <span className="font-mono text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded">/start {telegramConfig?.connect_token}</span> to our bot.
                  </p>
                  <a href={`https://t.me/${(telegramConfig?.bot_username || 'QuizMindBot').replace(/^@/, '')}?start=${telegramConfig?.connect_token}`} target="_blank" rel="noreferrer" className="inline-block w-full max-w-xs py-3.5 bg-blue-600 text-white font-bold rounded-2xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                    Open Bot
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Connected</h3>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">Reminders are active</p>
                    </div>
                  </div>
                  <button onClick={() => updateTelegram({ unlink: true })} className="text-[10px] font-black uppercase tracking-wider text-rose-500 px-4 py-2 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors">
                    Unlink
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Reminder Time</span>
                    <select 
                      value={telegramConfig?.reminder_time || "20:00"} 
                      onChange={(e) => updateTelegram({ reminder_time: e.target.value })} 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-indigo-600 focus:outline-none focus:border-indigo-300 transition-all cursor-pointer" 
                    >
                      {Array.from({ length: 18 }).map((_, i) => {
                        const hour = (i + 6).toString().padStart(2, '0');
                        return <option key={`${hour}:00`} value={`${hour}:00`}>{`${hour}:00`}</option>
                      })}
                    </select>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Advanced Alerts</h4>
                    
                    <div className="flex items-center justify-between group cursor-pointer" onClick={() => updateTelegram({ streak_guard_enabled: !(telegramConfig?.streak_guard_enabled ?? true) })}>
                      <div>
                        <div className="text-xs font-black text-slate-700 flex items-center gap-2">
                          <span>🛡️</span> Streak Guard
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium mt-0.5">Alert at 22:00 if streak is at risk</div>
                      </div>
                      <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${telegramConfig?.streak_guard_enabled !== false ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${telegramConfig?.streak_guard_enabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between group cursor-pointer" onClick={() => updateTelegram({ weekly_summary_enabled: !(telegramConfig?.weekly_summary_enabled ?? true) })}>
                      <div>
                        <div className="text-xs font-black text-slate-700 flex items-center gap-2">
                          <span>📊</span> Weekly Summary
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium mt-0.5">Progress report on Sunday 09:00</div>
                      </div>
                      <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${telegramConfig?.weekly_summary_enabled !== false ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${telegramConfig?.weekly_summary_enabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between group cursor-pointer" onClick={() => updateTelegram({ inactivity_alert_enabled: !(telegramConfig?.inactivity_alert_enabled ?? true) })}>
                      <div>
                        <div className="text-xs font-black text-slate-700 flex items-center gap-2">
                          <span>💤</span> Inactivity Alert
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium mt-0.5">Reminder after 3 days of missing study</div>
                      </div>
                      <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${telegramConfig?.inactivity_alert_enabled !== false ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${telegramConfig?.inactivity_alert_enabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* General Settings */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8">
           <div className="flex items-center gap-2 mb-8">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">System Preferences</h2>
          </div>

          <div className="space-y-2">
            <SettingItem 
              icon={Bell} 
              label="Neural Notifications" 
              desc="Get alerted when daily patterns refresh" 
              active={pushActive} 
              onClick={togglePushNotifications}
            />
            <SettingItem 
              icon={Moon} 
              label="Dark Matrix Mode" 
              desc="Switch interface to high-contrast dark mode" 
              active={darkMode}
              onClick={toggleDarkMode}
            />
            <SettingItem 
              icon={Clock} 
              label="Focus Timer" 
              desc="Display time spent per neural node during sessions" 
              active={focusTimer}
              onClick={toggleFocusTimer}
            />
          </div>
        </section>

        <div className="pt-8 text-center">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">QuizMind v3.4.2 // Neural OS</p>
        </div>
      </div>
    </div>
  )
}

const SettingItem = ({ icon: Icon, label, desc, active = false, onClick }: any) => (
  <div onClick={onClick} className="flex items-center justify-between p-4 rounded-3xl hover:bg-slate-50 transition-all group cursor-pointer border border-transparent hover:border-slate-100">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{label}</h4>
        <p className="text-[9px] font-medium text-slate-400 mt-0.5">{desc}</p>
      </div>
    </div>
    <div className={`w-10 h-6 rounded-full transition-all flex items-center px-1 ${active ? 'bg-indigo-600' : 'bg-slate-200'}`}>
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${active ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  </div>
)

export default Settings
