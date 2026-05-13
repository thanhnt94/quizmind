import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit3, Trash2, Search, Filter, LayoutGrid, ChevronRight, Archive, CheckCircle2, AlertCircle, BookOpen, MoreVertical, Image as ImageIcon, X, Settings as SettingsIcon, Layers } from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export default function ManageQuizzes() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newQuiz, setNewQuiz] = useState({ title: '', description: '', cover_image: '' })

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

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await axios.post('/api/v1/quiz/create', newQuiz)
      setIsCreateModalOpen(false)
      setNewQuiz({ title: '', description: '', cover_image: '' })
      queryClient.invalidateQueries({ queryKey: ['manage-quizzes'] })
    } catch (err) {
      alert('Failed to create quiz')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredQuizzes = quizzes?.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      {/* Sticky Compact Header for Creator Studio (Mobile Only) */}
      <div className="sticky top-0 z-[120] bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-4 py-3 shadow-sm md:hidden">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
             <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search collections..." 
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" 
             />
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all"
            title="New Collection"
          >
             <Plus className="w-5 h-5" />
          </button>
          <Link 
            to="/manage/import"
            className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-100 active:scale-90 transition-all"
            title="Import Excel"
          >
             <Archive className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="bg-white border-b border-slate-100 px-6 py-10 mb-8 hidden md:block">
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
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white text-[10px] font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest whitespace-nowrap"
            >
               <Plus className="w-4 h-4" />
               New Collection
            </button>
            <Link 
              to="/manage/import"
              className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white text-[10px] font-black rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-100 uppercase tracking-widest whitespace-nowrap"
            >
               <Archive className="w-4 h-4" />
               Import Excel
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-6xl mx-auto mt-6 md:mt-0">
         <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your collections..." 
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 shadow-sm transition-all" 
               />
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{filteredQuizzes?.length || 0} Collections Found</span>
            </div>
         </div>

         {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[1,2,3].map(i => (
                  <div key={i} className="h-64 bg-white rounded-[2.5rem] border border-slate-100 animate-pulse" />
               ))}
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <AnimatePresence mode="popLayout">
               {filteredQuizzes?.map((quiz) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={quiz.id} 
                    className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
                  >
                     <div className="aspect-[16/9] bg-slate-50 relative overflow-hidden">
                        {quiz.cover_image ? (
                           <img src={quiz.cover_image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 opacity-80">
                              <BookOpen className="w-12 h-12 text-white/40" />
                           </div>
                        )}
                        <div className="absolute top-4 left-4">
                           <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-white/20">
                              <span className="text-[10px] font-black text-indigo-600 uppercase">{quiz.questions_count} Cards</span>
                           </div>
                        </div>
                        <div className="absolute top-4 right-4 flex gap-1">
                           <button 
                              onClick={() => handleDelete(quiz.id)}
                              className="w-9 h-9 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm border border-white/20 transition-all active:scale-90"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                     
                     <div className="p-6">
                        <div className="mb-4">
                           <h3 className="text-lg font-black text-slate-800 line-clamp-1 leading-tight">{quiz.title}</h3>
                           <p className="text-xs text-slate-400 font-medium line-clamp-2 mt-2 leading-relaxed">
                              {quiz.description || "No description provided for this collection."}
                           </p>
                        </div>
                        
                         <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                            <Link 
                               to={`/manage/edit/${quiz.id}`}
                               className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 text-[9px] font-black rounded-xl hover:bg-slate-100 transition-all uppercase tracking-widest border border-slate-100"
                            >
                               <SettingsIcon className="w-3.5 h-3.5" />
                               Settings
                            </Link>
                            <Link 
                               to={`/manage/edit/${quiz.id}/questions`}
                               className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-[9px] font-black rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-widest shadow-lg shadow-indigo-100"
                            >
                               <Layers className="w-3.5 h-3.5" />
                               Cards
                            </Link>
                         </div>
                     </div>
                  </motion.div>
               ))}
               </AnimatePresence>
            </div>
         )}

         {!isLoading && filteredQuizzes?.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[3rem] border border-slate-100">
               <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-200" />
               <h3 className="text-xl font-black text-slate-800 uppercase italic">Empty Studio</h3>
               <p className="text-slate-400 text-sm font-medium mt-2">No collections match your search or you haven't created any yet.</p>
               <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white text-[10px] font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest"
               >
                  Create Your First Quiz
               </button>
            </div>
         )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
         {isCreateModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
               <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
               />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
               >
                  <div className="p-8">
                     <div className="flex items-center justify-between mb-8">
                        <div>
                           <h2 className="text-xl font-black text-slate-800 uppercase italic">Create New Quiz</h2>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Define your collection baseline</p>
                        </div>
                        <button onClick={() => setIsCreateModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                           <X className="w-5 h-5" />
                        </button>
                     </div>

                     <form onSubmit={handleCreateQuiz} className="space-y-6">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quiz Title</label>
                           <input 
                              required
                              type="text" 
                              value={newQuiz.title}
                              onChange={(e) => setNewQuiz({...newQuiz, title: e.target.value})}
                              placeholder="e.g. Advanced Kanji N1"
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                           />
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                           <textarea 
                              value={newQuiz.description}
                              onChange={(e) => setNewQuiz({...newQuiz, description: e.target.value})}
                              placeholder="What is this collection about?"
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none h-32 resize-none transition-all"
                           />
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cover Image URL</label>
                           <div className="relative">
                              <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input 
                                 type="text" 
                                 value={newQuiz.cover_image}
                                 onChange={(e) => setNewQuiz({...newQuiz, cover_image: e.target.value})}
                                 placeholder="https://images.unsplash.com/..."
                                 className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                              />
                           </div>
                        </div>

                        <button 
                           disabled={isSubmitting}
                           type="submit"
                           className="w-full py-5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                        >
                           {isSubmitting ? 'INITIALIZING...' : 'START CREATING'}
                        </button>
                     </form>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  )
}
