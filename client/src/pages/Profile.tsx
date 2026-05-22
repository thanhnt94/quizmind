import { useAppStore } from '@/store/useAppStore'
import { Settings, Shield, LogOut, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Profile() {
  const { user, gamify } = useAppStore()

  const progress = (gamify.xp % 1000) / 10

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

        {/* Account Settings */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 ml-4">ACCOUNT SETTINGS</h3>
          
          <MenuLink icon={Settings} label="Account Preferences" />
          <MenuLink icon={Shield} label="Security & Privacy" />
          <MenuLink icon={LogOut} label="Sign Out" variant="danger" href="/logout" />
        </div>
      </div>
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
