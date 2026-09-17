import { Outlet, Link, useLocation } from 'react-router-dom'
import { Home, Layers, BarChart3, Settings, BrainCircuit, Flame, Award, Users, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { QuizMindLogo } from './QuizMindLogo'

export default function Layout() {
  const { user, gamify, setUser, setGamify, isLoggedIn, authConfig } = useAppStore()
  const location = useLocation()

  // Ensure data is loaded even if we land on subpages (only if logged in)
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      setUser(res.data.user)
      setGamify(res.data.gamify)
      return res.data
    },
    staleTime: 5 * 60 * 1000, // 5 mins
    enabled: isLoggedIn
  })
  
  // Exactly 4 core items for clean mobile-first reachability
  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Quizzes', path: '/quizzes', icon: Layers },
    { label: 'Stats', path: '/stats', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ]

  const isLandingPage = location.pathname === '/' && !isLoggedIn
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard'
  const isQuizDetail = /^\/quiz\/[^/]+$/.test(location.pathname)
  const isQuizPlay = location.pathname.includes('/play')
  const isQuizRoadmap = location.pathname.includes('/roadmap')
  const isQuizRoom = location.pathname.includes('/room/')
  const isImmersiveView = isQuizDetail || isQuizPlay || isQuizRoadmap || isQuizRoom
  const showDesktopHeader = !isLandingPage && !isQuizPlay
  const showBottomNav = isLoggedIn && !isImmersiveView

  return (
    <div className={cn(
      "min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans",
      isLoggedIn 
        ? (isImmersiveView
            ? "pb-0 h-screen h-[100dvh] overflow-hidden" 
            : "pb-20 md:pb-0 md:h-screen md:w-screen md:overflow-hidden")
        : ""
    )}>

      {/* Desktop Header */}
      {showDesktopHeader && (
        <header className={cn(
          "fixed top-0 left-0 right-0 z-[110] border-b hidden md:flex items-center transition-all duration-300",
          isLoggedIn 
            ? "bg-white/95 backdrop-blur-xl border-slate-200/90 text-slate-900 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]" 
            : "bg-slate-950/80 border-white/5 text-white"
        )}>
          <div className="w-full max-w-[1700px] 2xl:max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-6 lg:gap-8">
              <Link to="/" className="flex items-center group active:scale-95 transition-all select-none">
                <QuizMindLogo height="md" />
              </Link>

              {isLoggedIn && (
                <nav className="flex items-center p-1 bg-slate-100/80 border border-slate-200/80 rounded-2xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = item.path === '/' 
                      ? (location.pathname === '/' || location.pathname === '/dashboard')
                      : (location.pathname.startsWith(item.path) || (item.path === '/quizzes' && location.pathname.startsWith('/library')))
                    return (
                      <Link 
                        key={item.path}
                        to={item.path} 
                        className={cn(
                          "relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs tracking-tight transition-all duration-200 select-none cursor-pointer",
                          isActive 
                            ? "text-indigo-600 font-extrabold" 
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
                        )}
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="desktopNavActive"
                            className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/90"
                            transition={{ type: "spring", stiffness: 450, damping: 32 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          <Icon className={cn(
                            "w-4 h-4 transition-all duration-200",
                            isActive 
                              ? "text-indigo-600 fill-indigo-500/20 stroke-[2.2]" 
                              : "text-slate-400 group-hover:text-slate-600 stroke-[1.8]"
                          )} />
                          <span>{item.label}</span>
                        </span>
                      </Link>
                    )
                  })}
                </nav>
              )}
            </div>
            
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                {/* Streak Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-xl shadow-2xs">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                  <span className="text-xs font-black text-amber-800">{gamify.streak}d</span>
                </div>

                {/* Level / XP Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200/90 rounded-xl shadow-2xs">
                  <Award className="w-4 h-4 text-indigo-600 stroke-[2.2]" />
                  <span className="text-xs font-black text-indigo-800">Lv.{gamify.level}</span>
                </div>

                {/* Room Join Quick Link */}
                <Link
                  to="/room/join"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100/90 border border-purple-200/90 rounded-xl text-xs font-black text-purple-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Live Multi-player Quiz Room"
                >
                  <Users className="w-4 h-4 text-purple-500 stroke-[2.2]" />
                  <span>Room</span>
                </Link>

                {/* Admin Quick Link */}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100/90 border border-rose-200/90 rounded-xl text-xs font-black text-rose-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title="Admin Control Panel"
                  >
                    <span>Admin</span>
                  </Link>
                )}

                {/* User Info / Avatar */}
                <Link to="/profile" className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-85 transition-opacity">
                  <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-xs shadow-xs ring-2 ring-slate-100">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 max-w-[120px] truncate hidden lg:inline">
                    {user?.username || 'User'}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </Link>
                {authConfig?.sso_enabled ? (
                  <a
                    href={authConfig.jump_url ? authConfig.jump_url.replace('/api/auth/jump/', '/auth/register?client_id=') : 'http://localhost:5000/auth/register?client_id=quizmind-v1'}
                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    Sign Up
                  </a>
                ) : (
                  <Link
                    to="/login"
                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    Sign Up
                  </Link>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 w-full min-h-0",
        isLoggedIn 
          ? (isImmersiveView 
              ? "pt-0 h-full overflow-hidden" 
              : "pt-0 md:pt-[58px] md:h-full md:min-h-0 md:overflow-hidden")
          : ""
      )}>
        <Outlet />
      </main>

      {/* Reference-Styled Mobile Bottom Nav (Strictly 4 items, clean, filled active icon, soft indigo pill) */}
      {showBottomNav && (
        <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_25px_rgba(0,0,0,0.05)] px-3 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))]">
          <nav className="grid grid-cols-4 items-center w-full max-w-md mx-auto gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = item.path === '/' 
                ? (location.pathname === '/' || location.pathname === '/dashboard')
                : (location.pathname.startsWith(item.path) || (item.path === '/quizzes' && location.pathname.startsWith('/library')))
              
              return (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={cn(
                    "relative flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl select-none transition-all duration-200 cursor-pointer active:scale-95",
                    isActive 
                      ? "bg-indigo-50/90 text-indigo-600" 
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isActive 
                      ? "text-indigo-600 fill-indigo-500/20 stroke-[2.2] scale-105" 
                      : "text-slate-400 stroke-[1.75]"
                  )} />
                  <span className={cn(
                    "text-[10.5px] tracking-tight mt-1 transition-colors duration-200 leading-none",
                    isActive 
                      ? "font-extrabold text-indigo-600" 
                      : "font-semibold text-slate-400"
                  )}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}
