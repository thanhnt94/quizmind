import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  X,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Tag,
  ChevronRight,
  Users,
  Search,
  Trash2,
  UserPlus,
  ShieldCheck,
  ArrowLeftRight
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
  const [activeTab, setActiveTab] = useState<'basic' | 'ai' | 'collaboration'>('basic')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ai_prompt: '',
    instruction: '',
    category_name: '',
    cover_image: '',
    tags: '',
    creator_id: 0
  })
  
  const [questions, setQuestions] = useState<any[]>([])
  const [showHelpModal, setShowHelpModal] = useState(false)

  // Collaboration State
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

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
          cover_image: res.data.cover_image || '',
          tags: res.data.tags?.join(', ') || '',
          creator_id: res.data.creator_id
        })
        setQuestions(res.data.questions || [])
        
        // Fetch collaborators
        const collabRes = await axios.get(`/api/v1/quiz/${id}/collaborators`)
        setCollaborators(collabRes.data)
      } catch (err) {
        setError('Failed to load quiz data')
      } finally {
        setIsLoading(false)
      }
    }
    fetchQuiz()
  }, [id])

  useEffect(() => {
    const searchUsers = async () => {
      if (userSearch.length < 2) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      try {
        const res = await axios.get(`/api/v1/quiz/users/search?q=${userSearch}`)
        setSearchResults(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearching(false)
      }
    }
    const timer = setTimeout(searchUsers, 500)
    return () => clearTimeout(timer)
  }, [userSearch])

  const handleSaveMetadata = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await axios.patch(`/api/v1/quiz/${id}`, {
        title: formData.title,
        description: formData.description,
        ai_prompt: formData.ai_prompt,
        instruction: formData.instruction,
        cover_image: formData.cover_image,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const addCollaborator = async (userId: number) => {
    try {
      await axios.post(`/api/v1/quiz/${id}/collaborators`, { user_id: userId })
      const res = await axios.get(`/api/v1/quiz/${id}/collaborators`)
      setCollaborators(res.data)
      setUserSearch('')
      setSearchResults([])
    } catch (err) {
      alert("Failed to add collaborator")
    }
  }

  const removeCollaborator = async (userId: number) => {
    if (!confirm("Remove this collaborator?")) return
    try {
      await axios.delete(`/api/v1/quiz/${id}/collaborators/${userId}`)
      setCollaborators(collaborators.filter(c => c.id !== userId))
    } catch (err) {
      alert("Failed to remove collaborator")
    }
  }

  const transferOwnership = async (userId: number) => {
    if (!confirm("Are you sure you want to transfer ownership? You will lose primary control over this collection.")) return
    try {
      await axios.post(`/api/v1/quiz/${id}/transfer-ownership`, { user_id: userId })
      alert("Ownership transferred successfully")
      navigate('/manage')
    } catch (err) {
      alert("Failed to transfer ownership")
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
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      {/* Sticky Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-4 md:py-8 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/manage')}
              className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 active:scale-90 transition-all border border-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-xl font-black text-slate-900 uppercase tracking-tight italic line-clamp-1">Edit Collection</h1>
              <p className="hidden md:block text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Refine Identity & AI Rules</p>
            </div>
          </div>

          <button 
            onClick={handleSaveMetadata}
            disabled={isSaving || success}
            className={cn(
              "flex items-center gap-2 px-4 md:px-8 py-2.5 text-white text-[10px] font-black rounded-xl transition-all shadow-lg uppercase tracking-widest active:scale-95",
              success ? "bg-emerald-500 shadow-emerald-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
            )}
          >
            {isSaving ? <Zap className="w-3.5 h-3.5 animate-spin" /> : success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isSaving ? "Saving..." : success ? "Saved" : "Save Changes"}</span>
            <span className="sm:hidden">{isSaving ? "..." : success ? "OK" : "Save"}</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 md:mt-10">
        {/* Mobile Tab Switcher */}
        <div className="flex items-center bg-white border border-slate-100 p-1.5 rounded-2xl mb-8 md:hidden shadow-sm">
           {['basic', 'ai', 'collaboration'].map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={cn(
                 "flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                 activeTab === tab ? "bg-slate-900 text-white shadow-md" : "text-slate-400"
               )}
             >
               {tab === 'basic' ? 'Identity' : tab === 'ai' ? 'AI Engine' : 'Rights'}
             </button>
           ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Navigation Aside (Desktop) */}
           <aside className="hidden md:flex flex-col gap-3">
              <NavButton active={activeTab === 'basic'} onClick={() => setActiveTab('basic')} icon={SettingsIcon} title="Basic Info" sub="Title, Cover, Tags" />
              <NavButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={Brain} title="AI Intelligence" sub="System Prompts & Rules" />
              <NavButton active={activeTab === 'collaboration'} onClick={() => setActiveTab('collaboration')} icon={Users} title="Collaboration" sub="Editors & Ownership" />

              <div className="mt-4 p-6 bg-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-200">
                 <LayoutGrid className="w-8 h-8 mb-4 opacity-50" />
                 <h4 className="text-sm font-black uppercase italic tracking-tighter">Quick Access</h4>
                 <p className="text-[10px] opacity-80 mt-2 font-medium leading-relaxed">Manage individual cards and options in the question studio.</p>
                 <button 
                    onClick={() => navigate(`/manage/edit/${id}/questions`)}
                    className="w-full mt-6 py-3 bg-white text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all active:scale-95"
                 >
                    Manage Cards
                 </button>
              </div>
           </aside>

           {/* Main Content Area */}
           <div className="md:col-span-2">
              <AnimatePresence mode="wait">
                 {activeTab === 'basic' && (
                    <motion.div key="basic" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
                         <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                               <SettingsIcon className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 uppercase italic">Identity</h2>
                         </div>

                         <div className="space-y-4">
                            <InputField label="Collection Title" value={formData.title} onChange={v => setFormData({...formData, title: v})} />
                            
                            <div className="space-y-1.5">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cover Image URL</label>
                               <div className="relative">
                                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input 
                                     type="text" 
                                     placeholder="https://..."
                                     value={formData.cover_image}
                                     onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                                     className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                  />
                               </div>
                            </div>

                            <Textarea label="Description" value={formData.description} onChange={v => setFormData({...formData, description: v})} rows={4} />
                            <Textarea label="Global Instruction (SSR Header)" value={formData.instruction} onChange={v => setFormData({...formData, instruction: v})} rows={3} placeholder="e.g. Choose the most appropriate answer..." />
                            
                            <div className="space-y-1.5">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tags (Comma Separated)</label>
                               <div className="relative">
                                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input 
                                     type="text" 
                                     placeholder="Kanji, JLPT N1, Grammar"
                                     value={formData.tags}
                                     onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                     className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                  />
                               </div>
                            </div>
                         </div>
                       </div>
                    </motion.div>
                 )}

                 {activeTab === 'ai' && (
                    <motion.div key="ai" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <div className="bg-slate-900 rounded-[2.5rem] p-6 md:p-10 border border-slate-800 shadow-2xl space-y-6">
                         <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-indigo-400">
                                  <Brain className="w-5 h-5" />
                               </div>
                               <h2 className="text-lg font-black text-white uppercase italic">AI Intelligence</h2>
                            </div>
                            <button 
                               onClick={() => setShowHelpModal(true)}
                               className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all"
                            >
                               <HelpCircle className="w-4 h-4" />
                            </button>
                         </div>

                         <div className="space-y-4">
                            <div className="space-y-2">
                               <div className="flex items-center justify-between ml-1">
                                  <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Master System Prompt</label>
                                  <span className="text-[8px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase">Gemini 2.0 Ready</span>
                               </div>
                               <textarea 
                                  rows={12}
                                  placeholder="Define how AI should analyze and explain questions in this collection..."
                                  value={formData.ai_prompt}
                                  onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-[13px] font-medium text-white placeholder:text-white/20 outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all resize-none leading-relaxed custom-scrollbar"
                               />
                            </div>

                             <div className="p-5 bg-white/5 border border-white/5 rounded-2xl border-dashed text-[10px] font-medium text-white/50 italic leading-relaxed">
                               * This prompt will guide the AI on how to explain the answer when the learner clicks the AI Analysis button. Use tags like {"{{question}}"} to personalize the result.
                             </div>
                         </div>
                       </div>
                    </motion.div>
                 )}

                 {activeTab === 'collaboration' && (
                    <motion.div key="collab" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                       <div className="bg-white rounded-[2rem] p-6 md:p-10 border border-slate-100 shadow-sm space-y-8">
                          <div>
                             <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                   <Users className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 uppercase italic">Collaborators</h2>
                             </div>
                             
                             {/* User Search */}
                             <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                   type="text" 
                                   placeholder="Search users to add as editors..." 
                                   value={userSearch}
                                   onChange={(e) => setUserSearch(e.target.value)}
                                   className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                />
                                <AnimatePresence>
                                   {searchResults.length > 0 && (
                                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[50] overflow-hidden">
                                         {searchResults.map(u => (
                                            <button key={u.id} onClick={() => addCollaborator(u.id)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0 group">
                                               <div className="text-left">
                                                  <div className="text-xs font-black text-slate-900 uppercase italic">{u.username}</div>
                                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{u.full_name}</div>
                                               </div>
                                               <UserPlus className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" />
                                            </button>
                                         ))}
                                      </motion.div>
                                   )}
                                </AnimatePresence>
                             </div>

                             {/* Collaborator List */}
                             <div className="space-y-3">
                                {collaborators.map(c => (
                                   <div key={c.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group">
                                      <div className="flex items-center gap-4">
                                         <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm font-black text-xs uppercase tracking-tighter">
                                            {c.username[0]}
                                         </div>
                                         <div>
                                            <div className="text-xs font-black text-slate-900 uppercase italic">{c.username}</div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                               <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
                                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shared Editor</span>
                                            </div>
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                         <button 
                                            onClick={() => transferOwnership(c.id)}
                                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[8px] font-black text-amber-600 hover:bg-amber-50 hover:border-amber-100 transition-all uppercase tracking-widest flex items-center gap-1.5"
                                         >
                                            <ArrowLeftRight className="w-3 h-3" /> Transfer Ownership
                                         </button>
                                         <button 
                                            onClick={() => removeCollaborator(c.id)}
                                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:border-rose-100 transition-all"
                                         >
                                            <Trash2 className="w-3.5 h-3.5" />
                                         </button>
                                      </div>
                                   </div>
                                ))}
                                {collaborators.length === 0 && !isSearching && (
                                   <div className="py-12 text-center bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                                      <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No shared editors found</p>
                                   </div>
                                )}
                             </div>
                          </div>
                       </div>
                    </motion.div>
                 )}
              </AnimatePresence>
              
              {/* Card Manager Shortcut (Mobile) */}
              <div className="md:hidden mt-8">
                 <button 
                    onClick={() => navigate(`/manage/edit/${id}/questions`)}
                    className="w-full p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-between shadow-sm active:scale-95 transition-all"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                          <LayoutGrid className="w-6 h-6" />
                       </div>
                       <div className="text-left">
                          <h4 className="text-sm font-black text-slate-800 uppercase italic">Manage Cards</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Edit Card Content</p>
                       </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
         {showHelpModal && (
           <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowHelpModal(false)} />
             <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                     <HelpCircle className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Prompting Guide</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Personalize the AI system</p>
                   </div>
                 </div>
                 <button onClick={() => setShowHelpModal(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X className="w-5 h-5" /></button>
               </div>

               <div className="space-y-4">
                 <p className="text-xs font-medium text-slate-600 leading-relaxed mb-6">The system will automatically replace the following tags with actual data from each question:</p>
                 <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {[
                      { tag: '{{question}}', desc: 'Question content' },
                      { tag: '{{options}}', desc: 'List of options A, B, C, D' },
                      { tag: '{{correct_answer}}', desc: 'Correct answer' },
                      { tag: '{{quiz_title}}', desc: 'Deck title' },
                      { tag: '{{option_a}}', desc: 'Option A content' },
                      { tag: '{{option_b}}', desc: 'Option B content' },
                      { tag: '{{option_c}}', desc: 'Option C content' },
                      { tag: '{{option_d}}', desc: 'Option D content' },
                    ].map((item) => (
                      <div key={item.tag} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all group">
                        <code className="text-[10px] font-black text-indigo-600">{item.tag}</code>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{item.desc}</span>
                      </div>
                    ))}
                 </div>
                 <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 border-dashed text-center">
                    <p className="text-[9px] font-bold text-amber-700 leading-relaxed italic uppercase tracking-wider">Using tags properly will help AI explain more accurately!</p>
                 </div>
               </div>
             </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  )
}

const NavButton = ({ active, onClick, icon: Icon, title, sub }: { active: boolean, onClick: () => void, icon: any, title: string, sub: string }) => (
  <button onClick={onClick} className={cn("flex items-center gap-4 p-5 rounded-3xl border transition-all text-left group", active ? "bg-white border-indigo-100 shadow-xl shadow-indigo-500/5" : "bg-transparent border-transparent text-slate-400 hover:bg-white/50")}>
     <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all", active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-slate-100 text-slate-400")}>
        <Icon className="w-5 h-5" />
     </div>
     <div>
        <h3 className={cn("text-xs font-black uppercase tracking-tight", active ? "text-slate-900" : "text-slate-400")}>{title}</h3>
        <p className="text-[9px] font-bold opacity-60">{sub}</p>
     </div>
  </button>
)

const InputField = ({ label, value, onChange, placeholder, icon: Icon }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, icon?: any }) => (
  <div className="space-y-1.5">
     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
     <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
        <input 
           type="text" 
           placeholder={placeholder}
           value={value}
           onChange={(e) => onChange(e.target.value)}
           className={cn("w-full h-12 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all", Icon ? "pl-11 pr-4" : "px-4")}
        />
     </div>
  </div>
)

const Textarea = ({ label, value, onChange, rows, placeholder }: { label: string, value: string, onChange: (v: string) => void, rows: number, placeholder?: string }) => (
  <div className="space-y-1.5">
     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
     <textarea 
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
     />
  </div>
)

export default EditQuiz
