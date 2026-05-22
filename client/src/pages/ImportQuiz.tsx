import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CloudUpload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  Download,
  Brain,
  Zap,
  Info,
  X,
  FileSpreadsheet,
  ChevronRight,
  Eye
} from 'lucide-react'
import axios from 'axios'
import { cn } from '@/lib/utils'

const ImportQuiz = () => {
  const navigate = useNavigate()
  const [isUploading, setIsUploading] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const handlePreview = async (file: File) => {
    setIsPreviewing(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await axios.post('/api/v1/quiz/preview', formData)
      setPreviewData(response.data)
      setSelectedFile(file)
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to parse preview."
      setError(msg)
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleFinalUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('metadata_override', JSON.stringify(previewData.metadata))
    
    try {
      const response = await axios.post('/api/v1/quiz/upload', formData)
      if (response.data.status === 'ok') {
        setSuccess(true)
        setTimeout(() => navigate('/manage'), 2000)
      } else {
        throw new Error(response.data.error || "Neural ingestion failed.")
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Neural injection failed."
      setError(msg)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      {/* Sticky Mobile Header */}
      <div className="sticky top-0 z-[120] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-4 md:hidden shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/manage')}
            className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 active:scale-90 transition-all border border-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Import Studio</h1>
        </div>
        <button 
           onClick={() => setShowGuide(true)}
           className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center active:scale-90 transition-all"
        >
           <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-10 mb-8 hidden md:block">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/manage')}
              className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Quiz Management Center</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Bulk Quiz Ingestion</p>
            </div>
          </div>
          <a 
            href="/api/v1/quiz/template/download"
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-[10px] font-black rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            Download Excel Template
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 md:mt-0 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Instructions (Desktop Only) */}
        {!previewData && (
          <div className="hidden lg:flex flex-col gap-6">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest italic mb-6 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600" />
                Upload Protocol
              </h2>
              <div className="space-y-6">
                <div className="relative pl-8">
                  <div className="absolute left-0 top-0 w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600">1</div>
                  <h4 className="text-[10px] font-black text-slate-900 uppercase mb-1">Dual-Sheet Structure</h4>
                  <p className="text-[10px] font-medium text-slate-400 leading-relaxed">File must contain <span className="text-slate-900 font-bold italic">"Info"</span> and <span className="text-slate-900 font-bold italic">"Data"</span> sheets.</p>
                </div>
                <div className="relative pl-8">
                  <div className="absolute left-0 top-0 w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600">2</div>
                  <h4 className="text-[10px] font-black text-slate-900 uppercase mb-1">Data Schema</h4>
                  <p className="text-[10px] font-medium text-slate-400 leading-relaxed">Columns: Question, Option_A, Option_B, Option_C, Option_D, Answer.</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100">
               <CloudUpload className="w-8 h-8 mb-4 opacity-50" />
               <h3 className="text-sm font-black uppercase tracking-tight italic mb-2">Bulk Processing</h3>
               <p className="text-[10px] font-medium opacity-80 leading-relaxed">Large sets (1000+ cards) may take a few moments to stabilize in the database.</p>
            </div>
          </div>
        )}

        {/* Main Upload Zone */}
        <div className={cn("space-y-6", previewData ? "lg:col-span-4" : "lg:col-span-3")}>
          {!previewData ? (
            <div 
              className={`relative h-[300px] md:h-[400px] rounded-[2.5rem] md:rounded-[3.5rem] border-4 border-dashed transition-all flex flex-col items-center justify-center p-6 md:p-12 text-center group ${
                isPreviewing ? 'border-indigo-600 bg-indigo-50/10' :
                error ? 'border-rose-500 bg-rose-50/30' :
                'border-slate-200 bg-white hover:border-indigo-600'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) handlePreview(file)
              }}
            >
              {isPreviewing ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-100 animate-pulse">
                    <Zap className="w-8 h-8 md:w-10 md:h-10 animate-bounce" />
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight italic">Parsing Content</h3>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 text-center">Extracting quiz cards from spreadsheet...</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all mb-6 group-hover:scale-110">
                    <CloudUpload className="w-8 h-8 md:w-10 md:h-10" />
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight italic mb-2">Upload Quiz Decks</h3>
                  <p className="text-[9px] md:text-[10px] font-medium text-slate-400 max-w-[200px] mx-auto leading-relaxed uppercase tracking-widest">Select an Excel file (.xlsx) to preview your collection</p>
                  
                  <button 
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="mt-8 px-8 py-4 bg-indigo-600 text-white text-[10px] font-black rounded-xl md:rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-[0.2em] active:scale-95"
                  >
                    Select File
                  </button>
                </>
              )}

              {error && (
                <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 flex items-center gap-3 bg-white/90 backdrop-blur p-4 rounded-xl border border-rose-100 text-rose-600 shadow-xl shadow-rose-500/5">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-tight text-left leading-tight">{error}</p>
                </div>
              )}

              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handlePreview(file)
                }}
              />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Preview Header Card */}
              <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-sm space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-600">
                        <FileText className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase italic tracking-tight">Quiz Preview</h2>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {previewData.count} Cards detected • {selectedFile?.name.substring(0, 20)}...
                        </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => { setPreviewData(null); setSelectedFile(null); }}
                      className="flex-1 md:flex-none px-6 py-3 bg-slate-50 text-slate-400 text-[10px] font-black rounded-xl hover:bg-slate-100 transition-all uppercase tracking-widest"
                    >
                      Discard
                    </button>
                    <button 
                      onClick={handleFinalUpload}
                      disabled={isUploading || success}
                      className={cn(
                        "flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 text-white text-[10px] font-black rounded-xl transition-all shadow-lg uppercase tracking-widest",
                        success ? "bg-emerald-500 shadow-emerald-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                      )}
                    >
                      {isUploading ? <Zap className="w-4 h-4 animate-spin" /> : success ? <CheckCircle2 className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
                      {isUploading ? "..." : success ? "OK" : "Import"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Quiz Title</label>
                      <input 
                        type="text" 
                        value={previewData.metadata.title}
                        onChange={(e) => setPreviewData({
                          ...previewData, 
                          metadata: { ...previewData.metadata, title: e.target.value }
                        })}
                        className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Description</label>
                      <textarea 
                        rows={3}
                        value={previewData.metadata.description}
                        onChange={(e) => setPreviewData({
                          ...previewData, 
                          metadata: { ...previewData.metadata, description: e.target.value }
                        })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Category</label>
                      <input 
                        type="text" 
                        value={previewData.metadata.category}
                        onChange={(e) => setPreviewData({
                          ...previewData, 
                          metadata: { ...previewData.metadata, category: e.target.value }
                        })}
                        className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Tags (Comma Separated)</label>
                      <input 
                        type="text" 
                        value={previewData.metadata.tags?.join(', ')}
                        onChange={(e) => setPreviewData({
                          ...previewData, 
                          metadata: { ...previewData.metadata, tags: e.target.value.split(',').map(t => t.trim()) }
                        })}
                        className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions Preview List */}
              <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Quiz Preview</h3>
                  <div className="px-3 py-1 bg-white rounded-lg border border-slate-100">
                    <span className="text-[9px] font-black text-indigo-600">{previewData.questions.length} CARDS</span>
                  </div>
                </div>
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  {/* Table for Desktop */}
                  <div className="hidden md:block">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Question</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Correct Answer</th>
                          <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Options</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {previewData.questions.map((q: any, idx: number) => (
                          <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6 max-w-md">
                              <p className="text-[11px] font-bold text-slate-900 leading-relaxed">{q.content}</p>
                            </td>
                            <td className="px-8 py-6">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg uppercase">
                                <CheckCircle2 className="w-3 h-3" />
                                {q.options.find((o: any) => o.is_correct)?.content}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {q.options.map((o: any, oIdx: number) => (
                                  <div key={oIdx} className={cn(
                                    "w-2 h-2 rounded-full",
                                    o.is_correct ? "bg-emerald-500" : "bg-slate-200"
                                  )} title={o.content} />
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards for Mobile */}
                  <div className="md:hidden divide-y divide-slate-50">
                     {previewData.questions.map((q: any, idx: number) => (
                       <div key={idx} className="p-6 space-y-4">
                          <div className="flex items-start gap-3">
                             <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0">
                                {idx + 1}
                             </div>
                             <p className="text-[11px] font-bold text-slate-900 leading-relaxed">{q.content}</p>
                          </div>
                          <div className="pl-9 space-y-2">
                             <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[10px] font-black text-emerald-700 uppercase line-clamp-1">
                                   {q.options.find((o: any) => o.is_correct)?.content}
                                </span>
                             </div>
                             <div className="flex items-center gap-1">
                                {q.options.map((o: any, oIdx: number) => (
                                   <div key={oIdx} className={cn(
                                      "h-1 flex-1 rounded-full",
                                      o.is_correct ? "bg-emerald-500" : "bg-slate-100"
                                   )} />
                                ))}
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!previewData && (
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                   <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supported Formats</p>
                   <p className="text-xs font-bold text-slate-700 mt-0.5">Excel Workbook (.xlsx, .xls)</p>
                </div>
              </div>
              <a 
                href="/api/v1/quiz/template/download"
                className="md:hidden flex items-center justify-center gap-2 py-4 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-slate-100"
              >
                 <Download className="w-4 h-4" />
                 Download Template
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Guide Modal */}
      <AnimatePresence>
         {showGuide && (
           <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center p-0 md:p-6">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md md:rounded-0" 
                onClick={() => setShowGuide(false)} 
              />
              <motion.div 
                initial={{ y: "100%" }} 
                animate={{ y: 0 }} 
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl border-t md:border border-slate-100 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <Info className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Upload Protocol</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Spreadsheet requirements</p>
                    </div>
                  </div>
                  <button onClick={() => setShowGuide(false)} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                    <div className="flex gap-4">
                       <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0">1</div>
                       <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase mb-1">Dual-Sheet Matrix</h4>
                          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">File must contain <span className="text-indigo-600 font-bold">"Info"</span> (Meta) and <span className="text-indigo-600 font-bold">"Data"</span> (Cards) sheets.</p>
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0">2</div>
                       <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase mb-1">Column Schema</h4>
                          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">Sheet "Data" requires: Question, Option_A, Option_B, Option_C, Option_D, and Answer (A/B/C/D).</p>
                       </div>
                    </div>
                  </div>
                  
                  <a 
                    href="/api/v1/quiz/template/download"
                    className="flex items-center justify-center gap-3 w-full py-5 bg-slate-900 text-white text-[11px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-xl shadow-slate-200"
                  >
                     <Download className="w-5 h-5" />
                     Get Template (.xlsx)
                  </a>
                </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  )
}

export default ImportQuiz
