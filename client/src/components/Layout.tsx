import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutGrid, Compass, BarChart3, User, BrainCircuit, Bell, Settings, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export default function Layout() {
  const { user, gamify, setUser, setGamify } = useAppStore()
  const location = useLocation()

  // Ensure data is loaded even if we land on subpages
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      setUser(res.data.user)
      setGamify(res.data.gamify)
      return res.data
    },
    staleTime: 5 * 60 * 1000 // 5 mins
  })
  
  const navItems = [
    { label: 'Home', path: '/', icon: LayoutGrid },
    { label: 'Stats', path: '/stats', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Manage', path: '/manage', icon: BrainCircuit },
  ]

  return (
    <div className="min-h-screen flex flex-col pb-24 md:pb-0 md:pt-20">
      {/* Desktop Header */}
      <header className="fixed top-0 left-0 right-0 z-[110] bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-8 py-4 hidden md:flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:rotate-12 transition-transform">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tighter">QuizMind</span>
          </Link>
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest transition-colors",
                  location.pathname === item.path ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-xl">
                <LayoutGrid className="w-4 h-4" />
                <span className="text-[10px] font-black">{gamify.streak}D STREAK</span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <BrainCircuit className="w-4 h-4" />
                <span className="text-[10px] font-black">LVL {gamify.level}</span>
             </div>
          </div>

          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="text-right hidden lg:block">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authenticated</p>
              <p className="text-[11px] font-black text-slate-900 leading-none">{user?.username || 'GUEST'}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* RemiNote-Style Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-white/80 backdrop-blur-2xl border-t border-slate-100 px-6 py-3">
        <nav className="flex items-center justify-between max-w-md mx-auto h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link 
                key={item.path}
                to={item.path} 
                className="relative flex items-center justify-center w-14 h-14"
              >
                {isActive && (
                  <motion.div 
                    layoutId="navActiveSquircle"
                    className="absolute inset-0 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-200"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={cn(
                  "w-6 h-6 relative z-10 transition-all duration-300",
                  isActive ? "text-white scale-110" : "text-slate-400"
                )} />
              </Link>
            )
          })}
          
          <Link 
            to="/manage" 
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-[1.5rem] text-white shadow-xl active:scale-90 transition-all",
              location.pathname === '/manage' ? "bg-indigo-600 shadow-indigo-200" : "bg-slate-900"
            )}
          >
            <Plus className="w-6 h-6" />
          </Link>
        </nav>
      </div>
    </div>
  )
}
