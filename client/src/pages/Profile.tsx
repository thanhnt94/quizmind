import { useAppStore } from '@/store/useAppStore'
import { Settings, Shield, LogOut, ChevronRight, Zap, Flame, Award, CheckCircle2, Activity, Target, Trophy, X, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BadgeData {
  id: string
  name: string
  description: string
  icon: string
  criteria_type: string
  criteria_value: number
  is_unlocked: boolean
  progress: number
}

interface BadgesResponse {
  badges: BadgeData[]
  total_unlocked: number
  total_count: number
}

const ICON_MAP: Record<string, any> = {
  Zap,
  Flame,
  Award,
  CheckCircle2,
  Activity,
  Target,
  Trophy
}

const BADGE_THEMES: Record<string, { bg: string, text: string, glow: string, border: string, color: string }> = {
  first_steps: { bg: 'bg-amber-500/10', text: 'text-amber-500', glow: 'shadow-amber-500/20', border: 'border-amber-500/20', color: '#f59e0b' },
  streak_starter: { bg: 'bg-rose-500/10', text: 'text-rose-500', glow: 'shadow-rose-500/20', border: 'border-rose-500/20', color: '#f43f5e' },
  streak_legend: { bg: 'bg-purple-500/10', text: 'text-purple-500', glow: 'shadow-purple-500/20', border: 'border-purple-500/20', color: '#a855f7' },
  perfect_score: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', glow: 'shadow-emerald-500/20', border: 'border-emerald-500/20', color: '#10b981' },
  speed_demon: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', glow: 'shadow-cyan-500/20', border: 'border-cyan-500/20', color: '#06b6d4' },
  goal_crusher: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', glow: 'shadow-indigo-500/20', border: 'border-indigo-500/20', color: '#6366f1' },
  card_master: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', glow: 'shadow-yellow-500/20', border: 'border-yellow-500/20', color: '#eab308' },
}

export default function Profile() {
  const { user, gamify } = useAppStore()
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null)

  const progress = (gamify.xp % 1000) / 10

  const { data: badgesData, isLoading } = useQuery<BadgesResponse>({
    queryKey: ['user-badges'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/quiz/gamification/badges')
      return res.data
    }
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      {/* Mobile Header */}
      <div className="md:hidden px-6 pt-10 pb-6 bg-white border-b border-slate-100">
        <h1 className="text-xl font-black text-slate-900 tracking-tighter text-center">My Profile</h1>
      </div>

      <div className="px-6 max-w-2xl mx-auto mt-10 md:mt-12">
        {/* User Info Card */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm text-center relative overflow-hidden mb-8 border border-slate-100">
          <div className="absolute top-0 left-0 right-0 h-32 bg-indigo-50/50 -z-10" />
          
          <div className="relative inline-block mb-6">
            <div className="w-32 h-32 rounded-[2.5rem] bg-white border-4 border-white shadow-xl overflow-hidden mx-auto">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl border-4 border-white shadow-lg">
              LV. {gamify.level}
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-900 mb-1">{user?.username}</h2>
          <p className="text-sm font-medium text-slate-400 mb-8">MindStack Learner</p>

          <div className="bg-slate-50 rounded-3xl p-6 mb-8 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LEVEL PROGRESS</span>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{gamify.xp % 1000} / 1000 XP</span>
            </div>
            <div className="h-3 bg-white border border-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[9px] font-medium text-slate-400 mt-3">Earn <span className="font-bold">{1000 - (gamify.xp % 1000)} XP</span> more to reach Level {gamify.level + 1}!</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-50">
              <p className="text-xl font-black text-indigo-600">{gamify.streak}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Day Streak</p>
            </div>
            <div className="p-4 bg-purple-50/30 rounded-2xl border border-purple-50">
              <p className="text-xl font-black text-purple-600">{gamify.xp}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total XP</p>
            </div>
          </div>
        </div>

        {/* Achievements / Badges Showcase */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">ACHIEVEMENTS</h3>
              <p className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">
                Badge <span className="text-indigo-600">Showcase</span>
              </p>
            </div>
            <div className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3.5 py-2 rounded-2xl border border-indigo-100">
              {badgesData?.total_unlocked || 0} / {badgesData?.total_count || 7} UNLOCKED
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {badgesData?.badges.map((badge) => {
                const Icon = ICON_MAP[badge.icon] || Trophy
                const theme = BADGE_THEMES[badge.id] || BADGE_THEMES.first_steps
                
                return (
                  <motion.div
                    key={badge.id}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setSelectedBadge(badge)}
                    className={cn(
                      "p-4 rounded-3xl border text-center cursor-pointer transition-all relative overflow-hidden flex flex-col items-center justify-between min-h-[140px]",
                      badge.is_unlocked 
                        ? cn("bg-white border-slate-100 shadow-sm shadow-slate-100", theme.glow) 
                        : "bg-slate-50/50 border-slate-100"
                    )}
                  >
                    <div className="absolute top-2 right-2">
                      {!badge.is_unlocked && <Lock className="w-3.5 h-3.5 text-slate-300" />}
                    </div>

                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all",
                      badge.is_unlocked 
                        ? cn(theme.bg, theme.text, "shadow-md") 
                        : "bg-slate-100 text-slate-300"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="w-full">
                      <h4 className={cn(
                        "text-[10px] font-black uppercase tracking-wider leading-tight mb-1 truncate px-1",
                        badge.is_unlocked ? "text-slate-800" : "text-slate-400"
                      )}>
                        {badge.name}
                      </h4>
                      
                      {/* Sub progress line */}
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            badge.is_unlocked ? "bg-indigo-600" : "bg-slate-300"
                          )} 
                          style={{ width: `${Math.min(100, badge.progress)}%` }} 
                        />
                      </div>
                      <p className="text-[8px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                        {Math.round(badge.progress)}%
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Account Settings */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-4">ACCOUNT SETTINGS</h3>
          
          <MenuLink icon={Settings} label="Account Preferences" />
          <MenuLink icon={Shield} label="Security & Privacy" />
          <MenuLink icon={LogOut} label="Sign Out" variant="danger" href="/logout" />
        </div>
      </div>

      {/* Frosted Glass Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (() => {
          const Icon = ICON_MAP[selectedBadge.icon] || Trophy
          const theme = BADGE_THEMES[selectedBadge.id] || BADGE_THEMES.first_steps
          
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setSelectedBadge(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full border border-slate-100 shadow-2xl relative overflow-hidden text-center"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Backdrop Glow */}
                <div 
                  className={cn("absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[60px] opacity-40 -z-10 transition-all", 
                    selectedBadge.is_unlocked ? theme.bg : "bg-slate-300"
                  )} 
                />

                <button
                  onClick={() => setSelectedBadge(null)}
                  className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="mt-4 flex flex-col items-center">
                  <div className={cn(
                    "w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl transition-all relative",
                    selectedBadge.is_unlocked 
                      ? cn(theme.bg, theme.text, theme.glow, "scale-110") 
                      : "bg-slate-100 text-slate-300 shadow-inner"
                  )}>
                    <Icon className="w-10 h-10 animate-pulse" />
                    {!selectedBadge.is_unlocked && (
                      <div className="absolute bottom-0 right-0 bg-slate-400 text-white rounded-full p-1.5 border-4 border-white shadow-lg">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-slate-950 uppercase tracking-tighter mb-2 italic">
                    {selectedBadge.name}
                  </h3>
                  
                  <div className={cn(
                    "text-[8px] font-black px-3.5 py-1.5 rounded-full border mb-6 uppercase tracking-widest",
                    selectedBadge.is_unlocked 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                      : "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    {selectedBadge.is_unlocked ? '🏆 UNLOCKED' : '🔒 LOCKED'}
                  </div>

                  <p className="text-sm font-medium text-slate-500 leading-relaxed px-4 mb-6">
                    {selectedBadge.description}
                  </p>

                  {/* Progress Block */}
                  <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        CRITERIA PROGRESS
                      </span>
                      <span className="text-[10px] font-black text-slate-700">
                        {Math.round(selectedBadge.progress)}%
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-white border border-slate-100 rounded-full overflow-hidden mb-2">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          selectedBadge.is_unlocked ? "bg-indigo-600" : "bg-slate-300"
                        )} 
                        style={{ width: `${Math.min(100, selectedBadge.progress)}%` }} 
                      />
                    </div>
                    
                    <p className="text-[9px] font-medium text-slate-400 mt-1">
                      {selectedBadge.is_unlocked 
                        ? 'Achievement unlocked! You completed the challenge. 🎉'
                        : `Progress: ${Math.round(selectedBadge.progress)}% towards completion.`}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

function MenuLink({ icon: Icon, label, variant = 'default', href = '#' }: any) {
  return (
    <a href={href} className={cn(
      "bg-white rounded-[2.5rem] p-6 border border-slate-100 flex items-center justify-between group transition-all",
      variant === 'danger' && "border-rose-50 hover:bg-rose-50/30"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
          variant === 'danger' ? "bg-rose-50 text-rose-500" : "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={cn(
          "text-sm font-bold",
          variant === 'danger' ? "text-rose-500" : "text-slate-700"
        )}>{label}</span>
      </div>
      <ChevronRight className={cn(
        "w-4 h-4 transition-all",
        variant === 'danger' ? "text-rose-200" : "text-slate-300"
      )} />
    </a>
  )
}
