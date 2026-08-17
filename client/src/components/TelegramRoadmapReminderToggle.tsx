import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Lock, Check } from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface TelegramRoadmapReminderToggleProps {
  className?: string
  size?: 'sm' | 'md'
}

export function TelegramRoadmapReminderToggle({ className, size = 'sm' }: TelegramRoadmapReminderToggleProps) {
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)

  const { data: config, isLoading } = useQuery({
    queryKey: ['telegram-config'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/notifications/telegram/config')
      return res.data
    },
    staleTime: 30000
  })

  if (isLoading || !config) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/40 text-slate-400 text-[11px] font-medium border border-slate-700/50 animate-pulse", className)}>
        <Send className="w-3 h-3 text-slate-500" />
        <span>Đang kiểm tra Telegram...</span>
      </div>
    )
  }

  const isLinked = config.is_linked
  const isActive = config.is_active
  const reminderTime = config.reminder_time || '20:00'
  const botUsername = config.bot_username || 'VocaburnBot'
  const connectToken = config.connect_token

  const handleToggle = async () => {
    if (!isLinked) {
      if (connectToken) {
        window.open(`https://t.me/${botUsername}?start=${connectToken}`, '_blank')
      } else {
        window.open(`https://t.me/${botUsername}`, '_blank')
      }
      return
    }

    try {
      setIsSaving(true)
      await axios.post('/api/v1/notifications/telegram/config', {
        is_active: !isActive
      })
      queryClient.invalidateQueries({ queryKey: ['telegram-config'] })
    } catch (err) {
      console.error("Failed to toggle Telegram reminder:", err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLinked) {
    return (
      <button
        onClick={handleToggle}
        disabled={isSaving}
        title={isActive ? `Bật nhắc nhở lúc ${reminderTime} hằng ngày qua Telegram` : 'Bấm để bật nhắc nhở lộ trình qua Telegram'}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer active:scale-95 shadow-xs",
          isActive 
            ? "bg-sky-500/20 text-sky-300 border-sky-400/40 hover:bg-sky-500/30" 
            : "bg-slate-800/60 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300",
          isSaving && "opacity-60 cursor-wait",
          className
        )}
      >
        <Send className={cn("w-3 h-3 transition-transform", isActive ? "text-sky-400 fill-sky-400/30" : "text-slate-500")} />
        <span>{isActive ? `Nhắc Telegram (${reminderTime})` : 'Bật Nhắc Telegram'}</span>
        {isActive && <Check className="w-3 h-3 text-sky-400 ml-0.5" />}
      </button>
    )
  }

  // Not linked state
  return (
    <button
      onClick={handleToggle}
      title="Tài khoản chưa kết nối Telegram Bot. Bấm để kết nối nhận nhắc nhở Lộ trình!"
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-800/60 text-slate-400 border border-slate-700/80 hover:border-sky-500/50 hover:text-sky-300 transition-all cursor-pointer active:scale-95 group opacity-85",
        className
      )}
    >
      <Lock className="w-3 h-3 text-slate-500 group-hover:text-sky-400 transition-colors" />
      <span>Chưa nối Telegram</span>
      <span className="text-[9px] bg-slate-700 group-hover:bg-sky-500/30 text-slate-300 group-hover:text-sky-200 px-1.5 py-0.2 rounded-full font-bold transition-colors">Nối ngay</span>
    </button>
  )
}
