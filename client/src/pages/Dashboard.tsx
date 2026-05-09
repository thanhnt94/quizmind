import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Bell, Flame, Target, Clock, Award, Play, Archive, FolderDown, FolderUp, Layers } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import axios from 'axios'

interface Quiz {
  id: number
  title: string
  description: string
  questions_count: number
}

interface DashboardData {
  my_quizzes: Quiz[]
  archived_quizzes: Quiz[]
  discover_quizzes: Quiz[]
  gamify: { level: number, xp: number, streak: number }
  stats_summary: { avg_accuracy: number, total_time_hours: number, total_questions: number }
  notifications: any[]
  unread_count: number
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'my' | 'archived' | 'discover'>('my')
  const [searchQuery, setSearchQuery] = useState('')
  const { setGamify } = useAppStore()

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      setGamify(res.data.gamify)
      return res.data
    }
  })

  if (isLoading || !data) return <div className="p-20 text-center font-black animate-pulse">LOADING ECOSYSTEM...</div>

  const filterQuizzes = (quizzes: Quiz[]) => 
    quizzes.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const tabs = [
    { id: 'my', label: 'My Quizzes', count: data.my_quizzes.length },
    { id: 'archived', label: 'Archive', count: data.archived_quizzes.length },
    { id: 'discover', label: 'Discover', count: data.discover_quizzes.length },
  ]

  return (
    <div className="hero-gradient min-h-screen pb-32">
      {/* Mobile Header / Hero Section */}
      <div className="px-6 pt-10 md:pt-12 pb-8">
        <div className="max-w-6xl mx-auto flex items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 border-2 border-white shadow-sm overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="avatar" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-lg border-2 border-white shadow-sm">
                LV. {data.gamify.level}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1">
                LEVEL {data.gamify.level} • {data.gamify.xp} XP
              </p>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">Quiz Center</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-12 h-12 md:hidden rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm active:scale-90 transition-all">
              <Bell className="w-6 h-6" />
              {data.unread_count > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white">
                  {data.unread_count}
                </div>
              )}
            </button>
            <Link to="/quiz/import" className="w-12 h-12 md:w-auto md:px-8 md:py-4 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/40 active:scale-90 transition-all">
              <Plus className="w-6 h-6" />
              <span className="hidden md:block font-black text-xs uppercase tracking-widest">New Quiz</span>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          <StatCard icon={Flame} value={data.gamify.streak} label="Streak" color="orange" />
          <StatCard icon={Target} value={`${data.stats_summary.avg_accuracy}%`} label="Accuracy" color="emerald" />
          <StatCard icon={Clock} value={data.stats_summary.total_time_hours} label="Hours Spent" color="indigo" hideMobile />
          <StatCard icon={Award} value={data.stats_summary.total_questions} label="Questions" color="purple" hideMobile />
        </div>
      </div>

      <div className="px-6 max-w-6xl mx-auto">
        {/* Search */}
        <div className="relative mb-10 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search your quizzes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 md:py-5 bg-white border border-slate-100 rounded-[2rem] text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-xl shadow-slate-200/20 transition-all" 
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 mb-10 overflow-x-auto no-scrollbar py-2">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm",
                activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-slate-900/20 scale-105" 
                  : "bg-white text-slate-400 border border-slate-100"
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filterQuizzes(data[`${activeTab}_quizzes` as keyof DashboardData] as Quiz[]).map(quiz => (
            <QuizCard 
              key={quiz.id} 
              quiz={quiz} 
              type={activeTab} 
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, color, hideMobile }: any) {
  const colors: any = {
    orange: 'bg-orange-50 text-orange-500',
    emerald: 'bg-emerald-50 text-emerald-500',
    indigo: 'bg-indigo-50 text-indigo-500',
    purple: 'bg-purple-50 text-purple-500',
  }
  return (
    <div className={cn(
      "bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3",
      hideMobile && "hidden md:flex"
    )}>
      <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center", colors[color])}>
        <Icon className="w-5 h-5 md:w-6 md:h-6 fill-current" />
      </div>
      <div>
        <p className="text-xl md:text-2xl font-black text-slate-900">{value}</p>
        <p className="text-[8px] font-black text-slate-400 uppercase">{label}</p>
      </div>
    </div>
  )
}

function QuizCard({ quiz, type }: { quiz: Quiz, type: string }) {
  const Icon = type === 'my' ? Play : (type === 'archived' ? Archive : Layers)
  
  return (
    <Link to={`/quiz/${quiz.id}`} className={cn(
      "group bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-5",
      type === 'archived' && "opacity-60 hover:opacity-100"
    )}>
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 shadow-sm",
        type === 'my' ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" : "bg-slate-50 text-slate-400"
      )}>
        <Icon className="w-6 h-6 fill-current" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
          {quiz.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{quiz.questions_count} Questions</span>
          {type === 'my' && (
            <>
              <div className="w-1 h-1 rounded-full bg-slate-100" />
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Active</span>
            </>
          )}
        </div>
      </div>
      {/* Actions (Archive/Enroll) - skipped for brevity in this initial port */}
    </Link>
  )
}
