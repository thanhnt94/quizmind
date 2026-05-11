import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Save, 
  ChevronLeft, 
  LayoutGrid,
  Zap,
  AlertCircle,
  FileText,
  CheckCircle2,
  Brain,
  Plus,
  Edit2,
  HelpCircle,
  X
} from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'

const EditQuiz = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ai_prompt: '',
    instruction: '',
    category_name: '',
    tags: ''
  })
  
  const [questions, setQuestions] = useState<any[]>([])
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null)
  const [showHelpModal, setShowHelpModal] = useState(false)

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`/api/v1/quiz/${id}/play-data`)
        setFormData({
          title: res.data.title,
          description: res.data.description || '',
          ai_prompt: res.data.ai_prompt || '',
          instruction: res.data.instruction || '',
          category_name: res.data.category_name || 'General',
          tags: res.data.tags?.join(', ') || ''
        })
        setQuestions(res.data.questions || [])
      } catch (err) {
        setError('Failed to load quiz data')
      } finally {
        setIsLoading(false)
      }
    }
    fetchQuiz()
  }, [id])

  const handleSaveMetadata = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await axios.patch(`/api/v1/quiz/${id}`, {
        title: formData.title,
        description: formData.description,
        ai_prompt: formData.ai_prompt,
        instruction: formData.instruction,
        tags: formData.tags.split(',').map(t => t.trim())
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateQuestion = async (qId: number, content: string, explanation: string) => {
    try {
      await axios.patch(`/api/v1/quiz/question/${qId}`, {
        content,
        explanation
      })
      setQuestions(questions.map(q => q.id === qId ? { ...q, content, explanation } : q))
      setEditingQuestionId(null)
    } catch (err) {
      alert('Failed to update question')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Zap className="w-10 h-10 text-indigo-600 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      <div className="bg-white border-b border-slate-100 px-6 py-10 mb-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/manage')}
              className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Collection Studio</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Refine Quiz Identity & Questions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 space-y-12">
        {/* Metadata Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <FileText className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Quiz Properties</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      Fundamental metadata and AI parameters
                    </p>
                </div>
              </div>
              <button 
                onClick={handleSaveMetadata}
                disabled={isSaving || success}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 text-white text-[10px] font-black rounded-xl transition-all shadow-lg uppercase tracking-widest",
                  success ? "bg-emerald-500 shadow-emerald-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                )}
              >
                {isSaving ? <Zap className="w-4 h-4 animate-spin" /> : success ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Saving..." : success ? "Changes Saved" : "Save Properties"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Quiz Title</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Description</label>
                  <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Global Instruction (Problem Set Header)</label>
                  <textarea 
                    rows={4}
                    placeholder="E.g. Choose the correct answer for the following questions..."
                    value={formData.instruction}
                    onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-xl shadow-slate-200">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <Brain className="w-5 h-5 text-indigo-400" />
                         <label className="text-[10px] font-black uppercase tracking-[0.2em]">AI System Prompt</label>
                      </div>
                      <button 
                        onClick={() => setShowHelpModal(true)}
                        className="text-white/40 hover:text-white transition-all"
                      >
                         <HelpCircle className="w-4 h-4" />
                      </button>
                   </div>
                   <textarea 
                    rows={6}
                    placeholder="Configure how AI should behave for this specific quiz..."
                    value={formData.ai_prompt}
                    onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                    className="w-full bg-white/10 border border-white/10 rounded-xl p-4 text-[11px] font-medium text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none leading-relaxed"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Tags (Comma Separated)</label>
                  <input 
                    type="text" 
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <button 
              onClick={() => navigate(`/manage/edit/${id}/questions`)}
              className="group relative bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all text-left overflow-hidden"
           >
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10 flex items-center gap-6">
                 <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <LayoutGrid className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Manage Questions</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Edit content, options, and explanations</p>
                 </div>
              </div>
           </button>

           <div className="bg-emerald-500 border border-emerald-400 p-8 rounded-[2.5rem] shadow-lg shadow-emerald-100 text-left relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10 flex items-center gap-6">
                 <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                    <CheckCircle2 className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Active Status</h3>
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Collection is live and discoverable</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowHelpModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Prompting Guide</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sử dụng các thẻ để cá nhân hóa prompt</p>
                </div>
              </div>
              <button onClick={() => setShowHelpModal(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-600 leading-relaxed mb-6">
                Bạn có thể chèn các thẻ dưới đây vào nội dung AI System Prompt. Khi nhấn nút <strong>Copy</strong> trong tab AI, hệ thống sẽ tự động thay thế chúng bằng dữ liệu thực tế:
              </p>
              
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {[
                  { tag: '{{question}}', desc: 'Nội dung câu hỏi hiện tại' },
                  { tag: '{{options}}', desc: 'Danh sách đáp án (A. nội dung, B. nội dung...)' },
                  { tag: '{{correct_answer}}', desc: 'Đáp án đúng (bao gồm chữ cái A/B/C/D)' },
                  { tag: '{{global_instruction}}', desc: 'Yêu cầu chung của bộ đề' },
                  { tag: '{{quiz_title}}', desc: 'Tiêu đề của bộ đề' },
                  { tag: '{{quiz_description}}', desc: 'Mô tả của bộ đề' },
                  { tag: '{{option_a}}', desc: 'Chỉ lấy nội dung đáp án A' },
                  { tag: '{{option_b}}', desc: 'Chỉ lấy nội dung đáp án B' },
                  { tag: '{{option_c}}', desc: 'Chỉ lấy nội dung đáp án C' },
                  { tag: '{{option_d}}', desc: 'Chỉ lấy nội dung đáp án D' },
                ].map((item) => (
                  <div key={item.tag} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all group">
                    <code className="text-xs font-black text-indigo-600 group-hover:scale-105 transition-transform">{item.tag}</code>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.desc}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 border-dashed">
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed italic">
                  * Mẹo: Bạn có thể viết một prompt chuẩn chỉnh và dùng các thẻ này để AI bên ngoài có đủ thông tin nhất để giải đáp.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default EditQuiz
