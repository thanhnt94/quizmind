import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { ChevronLeft, Award, BookOpen, Search, StickyNote, BarChart2 } from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'

interface Question {
  id: number
  content: string
  orig_index: number
  stats: { total: number, correct: number, wrong: number }
}

export default function QuizDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: quiz } = useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${id}/data`) // Need this endpoint
      return res.data
    }
  })

  const { data: notes } = useQuery({
    queryKey: ['quiz-notes', id],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/quiz/${id}/notes`)
      return res.data
    }
  })

  const { 
    data: questionsData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['quiz-questions', id, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await axios.get(`/api/v1/quiz/${id}/questions`, {
        params: { page: pageParam, size: 50, search: searchQuery }
      })
      return res.data
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentLoaded = allPages.length * 50
      return currentLoaded < lastPage.total ? allPages.length + 1 : undefined
    },
    initialPageParam: 1
  })

  const allQuestions = questionsData?.pages.flatMap(p => p.questions) || []

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile Header */}
      <nav className="fixed top-0 left-0 right-0 z-[120] bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-4 py-3 flex items-center gap-4 md:hidden">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-indigo-600 shadow-sm active:scale-90 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">QUIZ DETAIL</p>
          <h2 className="text-sm font-black text-slate-900 truncate tracking-tight">{quiz?.title}</h2>
        </div>
      </nav>

      <div className="pt-20 md:pt-12 pb-40">
        {/* Quiz Header */}
        <div className="px-6 max-w-5xl mx-auto mb-10">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03]"><Award className="w-48 h-48" /></div>
            
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm">
              <BookOpen className="w-10 h-10 text-indigo-600" />
            </div>
            
            <div className="flex-1 text-center md:text-left relative z-10">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                  {quiz?.questions_count || 0} CÂU HỎI
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                  LUYỆN TẬP
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tighter">{quiz?.title}</h1>
              <p className="text-slate-400 font-medium text-base leading-relaxed max-w-2xl">{quiz?.description || "Hệ thống trắc nghiệm thông minh QuizMind."}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-10 border-b border-slate-100 mb-8 overflow-x-auto no-scrollbar">
            {['list', 'stats'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)} 
                className={cn(
                  "pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap",
                  activeTab === tab ? 'text-indigo-600' : 'text-slate-400'
                )}
              >
                {tab === 'list' ? 'DANH SÁCH CÂU HỎI' : 'THỐNG KÊ CHI TIẾT'}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />}
              </button>
            ))}
          </div>

          {activeTab === 'list' ? (
            <div className="space-y-1">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm nội dung câu hỏi..." 
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" 
                />
              </div>

              <div className="space-y-2">
                {allQuestions.map((q) => (
                  <div key={q.id} className="group bg-white p-5 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50/10 hover:shadow-sm transition-all">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-shrink-0 min-w-[40px]">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{q.orig_index}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-700 leading-relaxed md:line-clamp-2">{q.content}</h3>
                      </div>
                      <div className="flex items-center gap-5 md:ml-auto flex-shrink-0 pt-2 md:pt-0">
                        <StatItem label="LẦN LÀM" value={q.stats.total} color="slate" />
                        <div className="w-px h-6 bg-slate-100" />
                        <StatItem label="ĐÚNG" value={q.stats.correct} color="emerald" />
                        <StatItem label="SAI" value={q.stats.wrong} color="rose" />
                        {notes?.[q.id] && (
                          <>
                            <div className="w-px h-6 bg-slate-100" />
                            <div className="flex items-center text-indigo-400" title={notes[q.id]}>
                              <StickyNote className="w-4 h-4" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {notes?.[q.id] && (
                      <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/30">
                        <p className="text-[10px] font-medium text-slate-500 italic line-clamp-2">{notes[q.id]}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {hasNextPage && (
                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => fetchNextPage()} 
                    disabled={isFetchingNextPage}
                    className="px-8 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isFetchingNextPage ? 'ĐANG TẢI...' : 'TẢI THÊM'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 md:p-20 rounded-[3rem] text-center border border-slate-100 shadow-sm">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-indigo-600">
                <BarChart2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">Phân tích chuyên sâu</h3>
              <p className="text-slate-500 font-medium mb-10 max-w-md mx-auto">Dữ liệu đang được tổng hợp.</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 bg-white/80 backdrop-blur-2xl border-t border-slate-100 z-[130] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto">
          <Link to={`/quiz/${id}/play`} className="w-full flex items-center justify-center py-5 bg-indigo-600 text-white font-black text-sm md:text-base rounded-2xl shadow-xl shadow-indigo-500/30 active:scale-95 transition-all tracking-widest uppercase">
            BẮT ĐẦU LUYỆN TẬP
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatItem({ label, value, color }: { label: string, value: number, color: string }) {
  const textColors: any = {
    slate: 'text-slate-500',
    emerald: 'text-emerald-500',
    rose: 'text-rose-500'
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{label}</span>
      <span className={cn("text-xs font-black", textColors[color])}>{value}</span>
    </div>
  )
}
