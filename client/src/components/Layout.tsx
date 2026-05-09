import { Outlet, Link, useLocation } from 'react-router-dom'
import { Home, Compass, BarChart3, User, BrainCircuit, Bell, Settings } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

export default function Layout() {
  const { user } = useAppStore()
  const location = useLocation()
  
  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Explore', path: '/discover', icon: Compass },
    { label: 'Stats', path: '/stats', icon: BarChart3 },
    { label: 'Profile', path: '/profile', icon: User },
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
            {navItems.slice(0, 3).map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={cn(
                  "text-xs font-black uppercase tracking-widest transition-colors",
                  location.pathname === item.path ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="h-10 w-px bg-slate-100 mx-2" />
          <div className="flex items-center gap-3 pl-2 group cursor-pointer">
            <div className="text-right hidden lg:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Học viên</p>
              <p className="text-xs font-bold text-slate-900 leading-none">{user?.username || 'Guest'}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all">
              <User className="w-5 h-5" />
            </div>
          </div>
          <button className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-[110] bg-white/90 backdrop-blur-3xl border-t border-slate-100 px-6 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] md:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link 
                key={item.path}
                to={item.path} 
                className={cn(
                  "flex flex-col items-center gap-1.5 group relative transition-all",
                  !isActive && "opacity-40"
                )}
              >
                <div className={cn(
                  "p-2.5 rounded-2xl transition-all group-active:scale-90",
                  isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-400"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  isActive ? "text-indigo-600" : "text-slate-400"
                )}>
                  {item.label}
                </span>
                {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full" />}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
