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
  Check,
  X,
  Layers,
  Image as ImageIcon,
  Music,
  Sparkles
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
        params: { page, size: 50, search }
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

  const handleDelete = async (questionId: number) => {
    if (!confirm('Are you sure? This card will be erased.')) return
    try {
      await axios.delete(`/api/v1/quiz/question/${questionId}`)
      setQuestions(questions.filter(q => q.id !== questionId))
      setTotal(prev => prev - 1)
    } catch (err) {
      alert('Deletion failed')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      {/* Ultra-compact Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-2 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/manage/edit/${id}`)}
              className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight italic">Card Manager</h1>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{total} Items</p>
            </div>
          </div>

          <div className="relative flex-1 max-w-sm hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 h-8 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
             <div className="flex items-center gap-4 mr-4 hidden md:flex">
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                   <span className="text-[7px] font-black text-slate-400 uppercase">Manual</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                   <span className="text-[7px] font-black text-slate-400 uppercase">AI</span>
                </div>
             </div>
             <button className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg active:scale-90 transition-all">
                <Layers className="w-3.5 h-3.5" />
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-4">
         {/* Question Row List */}
         <div className="space-y-2">
            {isLoading ? (
               <div className="py-20 text-center">
                  <Zap className="w-8 h-8 text-indigo-600 animate-pulse mx-auto" />
               </div>
            ) : questions.map((q, idx) => (
               <motion.div 
                 key={q.id}
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="group bg-white rounded-2xl border border-slate-100 p-3 md:p-4 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex items-stretch gap-4 md:gap-6"
               >
                  {/* Left: Metadata & Status */}
                  <div className="flex flex-col items-center justify-center gap-2 shrink-0 border-r border-slate-50 pr-4">
                     <span className="text-[8px] font-black text-slate-300 italic">#{(page-1)*50 + idx + 1}</span>
                     <div className="flex flex-col gap-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full", q.explanation ? "bg-emerald-500 shadow-sm shadow-emerald-200" : "bg-slate-100")} />
                        <div className={cn("w-1.5 h-1.5 rounded-full", q.ai_explanation ? "bg-indigo-500 shadow-sm shadow-indigo-200" : "bg-slate-100")} />
                     </div>
                  </div>

                  {/* Middle: Content & High Contrast Options */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <h3 className="text-[13px] md:text-sm font-bold text-slate-900 leading-tight mb-3 line-clamp-1 group-hover:line-clamp-none transition-all">
                        {q.content}
                     </h3>
                     
                     <div className="flex flex-wrap items-center gap-1.5">
                        {q.options.map((opt: any, oIdx: number) => (
                           <div 
                              key={oIdx}
                              className={cn(
                                 "px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 border transition-all",
                                 opt.is_correct 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                                    : "bg-white border-slate-200 text-slate-600"
                              )}
                           >
                              <span className={cn("w-3.5 h-3.5 rounded flex items-center justify-center text-[8px]", opt.is_correct ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
                                 {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="max-w-[120px] truncate">{opt.content}</span>
                           </div>
                        ))}
                        {(q.image || q.audio) && (
                           <div className="flex items-center gap-1.5 ml-1 px-2 py-1 bg-slate-50 rounded-lg">
                              {q.image && <ImageIcon className="w-3 h-3 text-slate-400" />}
                              {q.audio && <Music className="w-3 h-3 text-slate-400" />}
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Right: Vertical Actions (Always Visible but compact) */}
                  <div className="flex flex-col gap-1.5 shrink-0 border-l border-slate-50 pl-4 py-1">
                     <button 
                        onClick={() => setEditingQuestion(q)}
                        className="w-10 md:w-11 h-8 md:h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100"
                     >
                        <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     </button>
                     <button 
                        onClick={() => handleDelete(q.id)}
                        className="w-10 md:w-11 h-8 md:h-10 bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                     >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     </button>
                  </div>
               </motion.div>
            ))}
         </div>

         {/* Full-width Numeric Pagination - White Theme */}
         <div className="fixed bottom-20 left-0 right-0 z-[110] bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
               <button 
                 disabled={page === 1}
                 onClick={() => { setPage(page - 1); window.scrollTo(0, 0); }}
                 className="flex items-center gap-2 px-3 h-10 bg-slate-50 text-slate-400 text-[10px] font-black uppercase rounded-xl border border-slate-100 disabled:opacity-30"
               >
                  <ChevronLeft className="w-4 h-4" />
               </button>

               <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                  {(() => {
                     const totalPages = Math.ceil(total / 50)
                     const pages = []
                     const start = Math.max(1, page - 2)
                     const end = Math.min(totalPages, start + 5)
                     const finalStart = Math.max(1, end - 5)
                     
                     for (let i = finalStart; i <= end; i++) {
                        if (i < 1) continue;
                        pages.push(
                           <button
                              key={i}
                              onClick={() => { setPage(i); window.scrollTo(0, 0); }}
                              className={cn(
                                 "min-w-[36px] h-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all",
                                 page === i 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                                    : "bg-slate-50 text-slate-400 border border-slate-100"
                              )}
                           >
                              {i}
                           </button>
                        )
                     }
                     return pages
                  })()}
               </div>

               <button 
                 disabled={page * 50 >= total}
                 onClick={() => { setPage(page + 1); window.scrollTo(0, 0); }}
                 className="flex items-center gap-2 px-3 h-10 bg-slate-50 text-slate-400 text-[10px] font-black uppercase rounded-xl border border-slate-100 disabled:opacity-30"
               >
                  <ChevronRight className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
         {editingQuestion && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingQuestion(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
               <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
                  <div className="p-6 md:p-10 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                     <div className="flex items-center justify-between sticky top-0 bg-white pb-6 z-10 border-b border-slate-50 mb-6">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                              <Brain className="w-6 h-6" />
                           </div>
                           <div>
                              <h2 className="text-xl font-black text-slate-900 uppercase italic">Card Logic</h2>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Modification Module</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <button onClick={() => setEditingQuestion(null)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><X className="w-5 h-5" /></button>
                           <button onClick={handleUpdate} disabled={isSaving} className="flex items-center gap-2 px-6 h-10 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-xl shadow-indigo-100">
                              {isSaving ? <Zap className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Commit
                           </button>
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Question Content</label>
                           <textarea rows={3} value={editingQuestion.content} onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none leading-relaxed" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {editingQuestion.options.map((opt: any, idx: number) => (
                              <div key={idx} className={cn("flex items-center gap-3 p-3 rounded-2xl border transition-all", opt.is_correct ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-100")}>
                                 <button onClick={() => { const newOpts = editingQuestion.options.map((o: any, i: number) => ({ ...o, is_correct: i === idx })); setEditingQuestion({ ...editingQuestion, options: newOpts }) }} className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all shadow-sm shrink-0", opt.is_correct ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400")}>
                                    {opt.is_correct ? <Check className="w-4 h-4" /> : String.fromCharCode(65 + idx)}
                                 </button>
                                 <input type="text" value={opt.content} onChange={(e) => { const newOpts = [...editingQuestion.options]; newOpts[idx].content = e.target.value; setEditingQuestion({ ...editingQuestion, options: newOpts }) }} className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-900" />
                              </div>
                           ))}
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Explanation</label>
                           <textarea rows={3} value={editingQuestion.explanation} onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs font-medium text-indigo-100 outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all resize-none shadow-2xl leading-relaxed" />
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
