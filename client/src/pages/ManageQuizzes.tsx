import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit3, Trash2, Search, Filter, LayoutGrid, ChevronRight, Archive, CheckCircle2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'

export default function ManageQuizzes() {
  const queryClient = useQueryClient()

  const { data: quizzes, isLoading } = useQuery<any[]>({
    queryKey: ['manage-quizzes'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/dashboard/data')
      return res.data.created_quizzes
    }
  })

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this quiz collection?')) return
    try {
      await axios.delete(`/api/v1/quiz/${id}`)
      queryClient.invalidateQueries({ queryKey: ['manage-quizzes'] })
    } catch (err) {
      alert('Failed to delete collection')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      <div className="bg-white border-b border-slate-100 px-6 py-10 mb-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
               <LayoutGrid className="w-8 h-8" />
            </div>
            <div>
               <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Creator Studio</h1>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Manage Your Collections</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <a 
              href="/api/v1/quiz/template/download" 
              className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black rounded-2xl hover:bg-white transition-all uppercase tracking-widest whitespace-nowrap"
            >
               Excel Template
            </a>
            <Link 
              to="/manage/import"
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest whitespace-nowrap"
            >
               <Plus className="w-4 h-4" />
               Import Quiz Set
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-6xl mx-auto">
         <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
               <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input type="text" placeholder="Search your collections..." className="w-full pl-11 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                  </div>
               </div>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead>
                     <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Quiz Name</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Questions</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {quizzes?.map((quiz) => (
                        <tr key={quiz.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <LayoutGrid className="w-4 h-4" />
                                 </div>
                                 <span className="text-sm font-bold text-slate-700">{quiz.title}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-xs font-black text-slate-400">{quiz.questions_count} Cards</td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg w-fit">
                                 <CheckCircle2 className="w-3 h-3" />
                                 <span className="text-[9px] font-black uppercase">Active</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                 <Link 
                                    to={`/manage/edit/${quiz.id}`}
                                    className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 text-slate-400 hover:text-indigo-600 transition-all"
                                 >
                                    <Edit3 className="w-4 h-4" />
                                 </Link>
                                 <button 
                                    onClick={() => handleDelete(quiz.id)}
                                    className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 text-slate-400 hover:text-rose-600 transition-all"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               {isLoading && <div className="p-20 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest">Loading Collections...</div>}
               {!isLoading && quizzes?.length === 0 && (
                  <div className="p-20 text-center text-slate-300">
                     <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                     <p className="text-sm font-black uppercase tracking-widest">No Quizzes Found</p>
                  </div>
               )}
            </div>
         </div>
      </div>

    </div>
  )
}
