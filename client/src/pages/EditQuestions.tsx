import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Save, 
  ChevronLeft, 
  Search,
  ChevronRight,
  Edit2,
  Trash2,
  Zap,
  AlertCircle,
  FileText,
  CheckCircle2,
  Brain,
  Filter,
  Check
} from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'

const EditQuestions = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [questions, setQuestions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const [editingQuestion, setEditingQuestion] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fetchQuestions = async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(`/api/v1/quiz/${id}/questions`, {
        params: { page, size: 20, search }
      })
      setQuestions(res.data.questions)
      setTotal(res.data.total)
    } catch (err) {
      setError('Failed to fetch questions')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [id, page, search])

  const handleUpdate = async () => {
    if (!editingQuestion) return
    setIsSaving(true)
    try {
      await axios.patch(`/api/v1/quiz/question/${editingQuestion.id}`, {
        content: editingQuestion.content,
        explanation: editingQuestion.explanation,
        options: editingQuestion.options,
        image: editingQuestion.image,
        audio: editingQuestion.audio
      })
      setQuestions(questions.map(q => q.id === editingQuestion.id ? editingQuestion : q))
      setEditingQuestion(null)
    } catch (err) {
      alert('Failed to update question')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      <div className="bg-white border-b border-slate-100 px-6 py-10 mb-8 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/manage/edit/${id}`)}
              className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Question Manager</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{total} Cards in Collection</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search cards..." 
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                />
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
         <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-8">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">#</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Card Content</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Answer Metadata</th>
                     <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                     <tr>
                        <td colSpan={4} className="p-20 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest">Analyzing Knowledge Base...</td>
                     </tr>
                  ) : questions.map((q, idx) => (
                     <tr key={q.id} className="group hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-6 text-xs font-black text-slate-300">{(page-1)*20 + idx + 1}</td>
                        <td className="px-8 py-6 max-w-xl">
                           <p className="text-sm font-bold text-slate-900 leading-relaxed line-clamp-2">{q.content}</p>
                           {q.explanation && (
                              <p className="text-[10px] font-medium text-slate-400 mt-1 line-clamp-1 italic">{q.explanation}</p>
                           )}
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-wrap gap-1.5">
                              {q.options.map((opt: any, oIdx: number) => (
                                 <span 
                                    key={oIdx}
                                    className={cn(
                                       "px-2 py-0.5 rounded-md text-[9px] font-black uppercase border transition-all",
                                       opt.is_correct 
                                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                          : "bg-slate-50 text-slate-400 border-slate-100 opacity-40"
                                    )}
                                 >
                                    {String.fromCharCode(65 + oIdx)}
                                 </span>
                              ))}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <button 
                             onClick={() => setEditingQuestion(q)}
                             className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-100 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                           >
                              <Edit2 className="w-4 h-4" />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Pagination */}
         <div className="flex items-center justify-between px-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               Showing {(page-1)*20 + 1} to {Math.min(page*20, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
               <button 
                 disabled={page === 1}
                 onClick={() => setPage(page - 1)}
                 className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all disabled:opacity-30"
               >
                  <ChevronLeft className="w-4 h-4" />
               </button>
               <div className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-xl shadow-lg shadow-indigo-100">
                  {page}
               </div>
               <button 
                 disabled={page*20 >= total}
                 onClick={() => setPage(page + 1)}
                 className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all disabled:opacity-30"
               >
                  <ChevronRight className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
         {editingQuestion && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  onClick={() => setEditingQuestion(null)}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
               />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
               >
                  <div className="p-10 space-y-8 max-h-[90vh] overflow-y-auto scrollbar-hide">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                              <Brain className="w-6 h-6" />
                           </div>
                           <div>
                              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Card Logic Editor</h2>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Full-spectrum modification</p>
                           </div>
                        </div>
                        <button 
                          onClick={handleUpdate}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 uppercase tracking-widest"
                        >
                           {isSaving ? <Zap className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                           Save Card
                        </button>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Question Content</label>
                           <textarea 
                              rows={3}
                              value={editingQuestion.content}
                              onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-6 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                           />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Image URL</label>
                              <input 
                                 type="text" 
                                 placeholder="https://example.com/image.jpg"
                                 value={editingQuestion.image || ''}
                                 onChange={(e) => setEditingQuestion({ ...editingQuestion, image: e.target.value })}
                                 className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              />
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Audio URL</label>
                              <input 
                                 type="text" 
                                 placeholder="https://example.com/audio.mp3"
                                 value={editingQuestion.audio || ''}
                                 onChange={(e) => setEditingQuestion({ ...editingQuestion, audio: e.target.value })}
                                 className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {editingQuestion.options.map((opt: any, idx: number) => (
                              <div key={idx} className="relative">
                                 <div className={cn(
                                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                                    opt.is_correct ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-100"
                                 )}>
                                    <button 
                                       onClick={() => {
                                          const newOpts = editingQuestion.options.map((o: any, i: number) => ({
                                             ...o,
                                             is_correct: i === idx
                                          }))
                                          setEditingQuestion({ ...editingQuestion, options: newOpts })
                                       }}
                                       className={cn(
                                          "w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black transition-all",
                                          opt.is_correct ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400"
                                       )}
                                    >
                                       {opt.is_correct ? <Check className="w-5 h-5" /> : String.fromCharCode(65 + idx)}
                                    </button>
                                    <input 
                                       type="text" 
                                       value={opt.content}
                                       onChange={(e) => {
                                          const newOpts = [...editingQuestion.options]
                                          newOpts[idx].content = e.target.value
                                          setEditingQuestion({ ...editingQuestion, options: newOpts })
                                       }}
                                       className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-900"
                                    />
                                 </div>
                              </div>
                           ))}
                        </div>

                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Knowledge Explanation</label>
                           <textarea 
                              rows={4}
                              value={editingQuestion.explanation}
                              onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-[1.5rem] p-6 text-xs font-medium text-indigo-100 outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all resize-none shadow-xl"
                           />
                        </div>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  )
}

export default EditQuestions
