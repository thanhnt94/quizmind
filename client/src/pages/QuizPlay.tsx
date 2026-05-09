import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, LayoutGrid, Timer, Flame, Check, X, Sparkles, Lightbulb, StickyNote, Play, Target, CheckCircle2, XCircle, Clock, BookOpen, Hash, Copy, Edit3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'

interface Option {
  id: number
  content: string
  is_correct: boolean
}

interface Question {
  id: number
  content: string
  explanation: string
  ai_explanation?: string
  options: Option[]
  stats?: { total: number, correct: number, avg_time: number }
}
const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    const startTime = Date.now()
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      
      // If 2 seconds have passed, just dump the remaining text instantly
      if (elapsed > 2000) {
        setDisplayedText(text)
        setIsTyping(false)
        clearInterval(timer)
      } else {
        if (i < text.length) {
          i += 3 // Realistic LLM typing speed
          setDisplayedText(text.substring(0, i))
        } else {
          setIsTyping(false)
          clearInterval(timer)
        }
      }
    }, 15)
    return () => clearInterval(timer)
  }, [text])

  useEffect(() => {
    if (isTyping && bottomRef.current) {
      bottomRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [displayedText, isTyping])

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{displayedText}</ReactMarkdown>
      {isTyping && <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-500 animate-pulse align-middle" />}
      <div ref={bottomRef} />
    </>
  )
}

export default function QuizPlay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [streak, setStreak] = useState(0)
  const [totalXP, setTotalXP] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isAskingAI, setIsAskingAI] = useState(false)
  const [personalNote, setPersonalNote] = useState('')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [isEditingAI, setIsEditingAI] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false)
  const [activeFeedbackTab, setActiveFeedbackTab] = useState<'insight' | 'ai' | 'note'>('insight')
  const [sessionAnswers, setSessionAnswers] = useState<Record<number, number>>({})

  const timerRef = useRef<any>(null)
  const currentQuestion: Question | null = session?.questions?.[currentIndex] || null


  useEffect(() => {
    fetchSession()
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        // Only increment if feedback is NOT shown
        if (showFeedback) return prev
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [id, showFeedback])

  useEffect(() => {
    if (currentQuestion) {
      fetchNote()
    }
  }, [currentIndex, currentQuestion])

  const fetchSession = async () => {
    try {
      const quizRes = await axios.get(`/api/v1/quiz/${id}/play-data`)
      const questions = quizRes.data.questions || []
      setSession({ ...quizRes.data, questions })
      
      try {
        const sessionRes = await axios.get(`/api/v1/quiz/${id}/session`)
        if (sessionRes.data) {
          const restoredAnswers = sessionRes.data.state?.sessionAnswers || {}
          setSessionAnswers(restoredAnswers)
          
          const curIdx = sessionRes.data.current_index || 0
          setCurrentIndex(curIdx)
          
          // Update local stats for restored answers
          setSession((prev: any) => {
            if (!prev) return prev
            const newQs = [...prev.questions]
            Object.entries(restoredAnswers).forEach(([idx, optIdx]: [any, any]) => {
              const q = { ...newQs[idx] }
              const isCorrect = q.options[optIdx]?.is_correct
              const currentStats = q.stats || { total: 0, correct: 0, avg_time: 0 }
              q.stats = {
                total: currentStats.total + 1,
                correct: currentStats.correct + (isCorrect ? 1 : 0),
                avg_time: currentStats.avg_time // Don't have time info here easily
              }
              newQs[idx] = q
            })
            return { ...prev, questions: newQs }
          })

          if (typeof restoredAnswers[curIdx] === 'number') {
            setSelectedOption(restoredAnswers[curIdx])
            setShowFeedback(true)
          }
        }
      } catch (e) {}
    } catch (e) {
      navigate('/')
    }
  }


  const fetchNote = async () => {
    if (!currentQuestion) return
    try {
      const res = await axios.get(`/api/v1/quiz/question/${currentQuestion.id}/note`)
      setPersonalNote(res.data.content || '')
    } catch (e) {}
  }

  const saveNote = async () => {
    if (!currentQuestion) return
    try {
      await axios.post(`/api/v1/quiz/question/${currentQuestion.id}/note`, { 
        content: personalNote 
      })
    } catch (e) {
      alert("Failed to save note.")
    }
  }

  const saveSession = async (newAnswers: Record<number, number>, newIndex: number) => {
    try {
      await axios.post(`/api/v1/quiz/${id}/session`, {
        mode: "sequential",
        current_index: newIndex,
        state: { sessionAnswers: newAnswers }
      })
    } catch (e) {}
  }

  const handleAnswer = async (optIdx: number) => {
    if (showFeedback || !currentQuestion) return
    setSelectedOption(optIdx)
    const correct = currentQuestion.options[optIdx].is_correct
    setShowFeedback(true)
    
    const newAnswers = { ...sessionAnswers, [currentIndex]: optIdx }
    setSessionAnswers(newAnswers)
    saveSession(newAnswers, currentIndex)
    
    // Immediately update local stats for real-time UI reflection
    setSession((prev: any) => {
      if (!prev) return prev
      const newSession = { ...prev }
      const newQs = [...newSession.questions]
      const q = { ...newQs[currentIndex] }
      
      const currentStats = q.stats || { total: 0, correct: 0, avg_time: 0 }
      const newTotal = currentStats.total + 1
      const newCorrect = currentStats.correct + (correct ? 1 : 0)
      
      // Calculate new moving average for time
      const oldTotalTime = currentStats.avg_time * currentStats.total
      const newAvgTime = Math.round((oldTotalTime + timeLeft) / newTotal)
      
      q.stats = {
        total: newTotal,
        correct: newCorrect,
        avg_time: newAvgTime
      }
      newQs[currentIndex] = q
      newSession.questions = newQs
      return newSession
    })
    
    if (correct) {
      setStreak(s => s + 1)
      setTotalXP(x => x + 10)
    } else {
      setStreak(0)
    }

    try {
      await axios.post('/api/v1/quiz/record_answer', {
        question_id: currentQuestion.id,
        option_id: currentQuestion.options[optIdx].id,
        is_correct: correct,
        time_spent: timeLeft
      })
    } catch (e) {
      console.error("Failed to record answer")
    }
  }

  const navigateToQuestion = (idx: number) => {
    setCurrentIndex(idx)
    const prevOpt = sessionAnswers[idx]
    if (typeof prevOpt === 'number') {
      setSelectedOption(prevOpt)
      setShowFeedback(true)
    } else {
      setSelectedOption(null)
      setShowFeedback(false)
      setTimeLeft(0)
    }
    setIsEditingNote(false)
    setIsEditingAI(false)
    saveSession(sessionAnswers, idx)
  }

  const handleNext = () => {
    if (!session || !session.questions) return

    const mode = localStorage.getItem('quiz_learning_mode') || 'sequential'
    const questions = session.questions
    const total = questions.length

    if (mode === 'sequential') {
      navigateToQuestion(Math.min(currentIndex + 1, total - 1))
    } else if (mode === 'random') {
      // Find a random index not answered in THIS session
      const pool = questions.map((_: any, i: number) => i).filter((i: number) => sessionAnswers[i] === undefined)
      if (pool.length > 0) {
        const rand = pool[Math.floor(Math.random() * pool.length)]
        navigateToQuestion(rand)
      } else {
        navigateToQuestion(Math.min(currentIndex + 1, total - 1))
      }
    } else if (mode === 'unseen') {
      // Find next question with 0 historical attempts
      const nextUnseen = questions.findIndex((q: any, i: number) => i > currentIndex && (q.stats?.total || 0) === 0)
      if (nextUnseen !== -1) {
        navigateToQuestion(nextUnseen)
      } else {
        // Loop back to find any unseen
        const anyUnseen = questions.findIndex((q: any) => (q.stats?.total || 0) === 0)
        if (anyUnseen !== -1) navigateToQuestion(anyUnseen)
        else navigateToQuestion(Math.min(currentIndex + 1, total - 1))
      }
    } else if (mode === 'review') {
      // Find next question with some errors in history
      const nextReview = questions.findIndex((q: any, i: number) => i > currentIndex && (q.stats?.wrong || 0) > 0)
      if (nextReview !== -1) {
        navigateToQuestion(nextReview)
      } else {
        navigateToQuestion(Math.min(currentIndex + 1, total - 1))
      }
    } else {
      navigateToQuestion(Math.min(currentIndex + 1, total - 1))
    }
  }

  const askAI = async (manualText?: string) => {
    if (!currentQuestion) return
    setIsAskingAI(true)
    try {
      const payload: any = { question_id: currentQuestion.id }
      if (manualText) payload.ai_explanation = manualText
      
      const res = await axios.post(`/api/v1/quiz/${id}/ask-ai`, payload)
      if (res.data.ai_explanation) {
        setSession((prev: any) => {
          const newQs = [...prev.questions]
          newQs[currentIndex].ai_explanation = res.data.ai_explanation
          return { ...prev, questions: newQs }
        })
        if (manualText) setIsEditingAI(false)
      }
    } catch (e) {
      alert("AI service unavailable.")
    } finally {
      setIsAskingAI(false)
    }
  }

  const copyQuestionToClipboard = () => {
    if (!currentQuestion) return
    const text = `Question: ${currentQuestion.content}\n` + 
                 currentQuestion.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt.content}`).join('\n')
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  const renderFeedbackArea = (isMobile = false) => {
    if (!showFeedback) return null
    
    const tabs = [
      { id: 'insight', label: 'INSIGHT', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-100' },
      { id: 'ai', label: 'AI ANALYSIS', icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-100' },
      { id: 'note', label: 'PERSONAL NOTE', icon: StickyNote, color: 'text-slate-400', bg: 'bg-slate-100' }
    ]

    const renderTabContent = () => {
      switch (activeFeedbackTab) {
        case 'insight':
          return (
            <div className="p-6 rounded-[2rem] bg-indigo-50/30 border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                      <Lightbulb className="w-3.5 h-3.5 fill-amber-500" />
                   </div>
                   <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">INSIGHT</span>
                 </div>
                 <div className="text-slate-600 font-medium text-sm leading-relaxed markdown-content whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                   <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                     {currentQuestion?.explanation || 'No detail.'}
                   </ReactMarkdown>
                 </div>
            </div>
          )
        case 'ai':
          return (
            <div className="p-6 rounded-[2rem] ai-glow animate-in fade-in slide-in-from-bottom-2">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">AI ANALYSIS</span>
                 </div>
                 <div className="flex gap-2">
                   {!currentQuestion?.ai_explanation && !isEditingAI && (
                     <button 
                       onClick={() => askAI()}
                       disabled={isAskingAI}
                       className="text-[9px] font-black text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm hover:bg-indigo-50 transition-all disabled:opacity-50"
                     >
                       {isAskingAI ? 'ANALYZING...' : 'ASK AI INSIGHT'}
                     </button>
                   )}
                   <button 
                     onClick={() => {
                       if (isEditingAI) {
                         askAI(aiInput)
                       } else {
                         setAiInput(currentQuestion?.ai_explanation || '')
                         setIsEditingAI(true)
                       }
                     }}
                     disabled={isAskingAI}
                     className={cn(
                       "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1.5 rounded-md",
                       isEditingAI ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-400 hover:text-indigo-600 hover:bg-white"
                     )}
                   >
                     {isAskingAI ? 'SAVING...' : (isEditingAI ? 'SAVE AI' : 'EDIT')}
                   </button>
                 </div>
               </div>
               
               {isEditingAI ? (
                 <div className="space-y-2 mt-2">
                   <textarea 
                     value={aiInput}
                     onChange={(e) => setAiInput(e.target.value)}
                     placeholder="Nhập nội dung AI Analysis thủ công..."
                     className="w-full h-32 bg-white/50 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border-none resize-none transition-all"
                     autoFocus
                   />
                   <p className="text-[8px] font-medium text-slate-400 italic">Click 'SAVE AI' để lưu thay đổi cho tất cả mọi người.</p>
                 </div>
               ) : (
                 currentQuestion?.ai_explanation && (
                   <div className="text-slate-700 font-medium text-sm leading-relaxed markdown-content italic break-words max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mt-2">
                     <TypewriterText text={currentQuestion.ai_explanation} />
                   </div>
                 )
               )}
            </div>
          )
        case 'note':
          return (
            <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-slate-400" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PERSONAL NOTE</span>
                 </div>
                 <button 
                   onClick={() => {
                     if (isEditingNote) {
                       saveNote()
                     }
                     setIsEditingNote(!isEditingNote)
                   }}
                   className={cn(
                     "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1 rounded-md",
                     isEditingNote ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                   )}
                 >
                   {isEditingNote ? 'SAVE & CLOSE' : 'EDIT'}
                 </button>
               </div>
               
               {!isEditingNote ? (
                 <div className="text-slate-600 font-medium text-sm leading-relaxed markdown-content min-h-[100px] break-words max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                   <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                     {personalNote || '*Ghi chú trống.*'}
                   </ReactMarkdown>
                 </div>
               ) : (
                 <div className="space-y-2">
                   <textarea 
                     value={personalNote}
                     onChange={(e) => setPersonalNote(e.target.value)}
                     placeholder="Ghi lại kiến thức của bạn ở đây... (Hỗ trợ Markdown)"
                     className="w-full h-32 bg-slate-50 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border-none resize-none transition-all"
                     autoFocus
                   />
                   <p className="text-[8px] font-medium text-slate-300 italic">Hỗ trợ Markdown syntax. Click 'SAVE & CLOSE' để hoàn tất.</p>
                 </div>
               )}
            </div>
          )
      }
    }

    if (isMobile) {
      return (
        <div className="flex flex-col h-full">
           <div className="flex-1 overflow-y-auto pb-4">
              {renderTabContent()}
           </div>
           <div className="flex items-center justify-around gap-1 pt-4 pb-2 border-t border-slate-100 bg-white -mx-4 px-4 sticky bottom-0">
              {tabs.map((tab: any) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeedbackTab(tab.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-2 px-3 rounded-xl transition-all",
                    activeFeedbackTab === tab.id 
                      ? "text-indigo-600 bg-indigo-50/50" 
                      : "text-slate-400"
                  )}
                >
                  <tab.icon className={cn("w-5 h-5", activeFeedbackTab === tab.id ? "text-indigo-600" : "text-slate-300")} />
                  <span className="text-[8px] font-black tracking-tighter uppercase">{tab.label.split(' ')[0]}</span>
                </button>
              ))}
           </div>
        </div>
      )
    }

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
         {/* INSIGHT */}
         <div className="p-6 rounded-[2rem] bg-indigo-50/30 border border-indigo-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                 <Lightbulb className="w-3.5 h-3.5 fill-amber-500" />
              </div>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">INSIGHT</span>
            </div>
            <div className="text-slate-600 font-medium text-sm leading-relaxed markdown-content whitespace-pre-wrap break-words max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {currentQuestion?.explanation || 'No detail.'}
              </ReactMarkdown>
            </div>
         </div>

         {/* AI Analysis */}
         <div className="p-6 rounded-[2rem] ai-glow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                 <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                 <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">AI ANALYSIS</span>
              </div>
              <div className="flex gap-2">
                {!currentQuestion?.ai_explanation && !isEditingAI && (
                  <button 
                    onClick={() => askAI()}
                    disabled={isAskingAI}
                    className="text-[9px] font-black text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm hover:bg-indigo-50 transition-all disabled:opacity-50"
                  >
                    {isAskingAI ? 'ANALYZING...' : 'ASK AI INSIGHT'}
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (isEditingAI) {
                      askAI(aiInput)
                    } else {
                      setAiInput(currentQuestion?.ai_explanation || '')
                      setIsEditingAI(true)
                    }
                  }}
                  disabled={isAskingAI}
                  className={cn(
                    "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1.5 rounded-md",
                    isEditingAI ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-400 hover:text-indigo-600 hover:bg-white"
                  )}
                >
                  {isAskingAI ? 'SAVING...' : (isEditingAI ? 'SAVE AI' : 'EDIT')}
                </button>
              </div>
            </div>
            
            {isEditingAI ? (
              <div className="space-y-2 mt-2">
                <textarea 
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Nhập nội dung AI Analysis thủ công..."
                  className="w-full h-32 bg-white/50 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border-none resize-none transition-all"
                  autoFocus
                />
                <p className="text-[8px] font-medium text-slate-400 italic">Click 'SAVE AI' để lưu thay đổi cho tất cả mọi người.</p>
              </div>
            ) : (
              currentQuestion?.ai_explanation && (
                <div className="text-slate-700 font-medium text-sm leading-relaxed markdown-content italic break-words max-h-[250px] overflow-y-auto custom-scrollbar pr-2 mt-2">
                  <TypewriterText text={currentQuestion.ai_explanation} />
                </div>
              )
            )}
         </div>

         {/* Personal Note */}
         <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 <StickyNote className="w-4 h-4 text-slate-400" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PERSONAL NOTE</span>
              </div>
              <button 
                onClick={() => {
                  if (isEditingNote) {
                    saveNote()
                  }
                  setIsEditingNote(!isEditingNote)
                }}
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1 rounded-md",
                  isEditingNote ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                )}
              >
                {isEditingNote ? 'SAVE & CLOSE' : 'EDIT'}
              </button>
            </div>
            
            {!isEditingNote ? (
              <div className="text-slate-600 font-medium text-sm leading-relaxed markdown-content min-h-[100px] break-words max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {personalNote || '*Ghi chú trống.*'}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea 
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  placeholder="Ghi lại kiến thức của bạn ở đây... (Hỗ trợ Markdown)"
                  className="w-full h-32 bg-slate-50 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border-none resize-none transition-all"
                  autoFocus
                />
                <p className="text-[8px] font-medium text-slate-300 italic">Hỗ trợ Markdown syntax. Click 'SAVE & CLOSE' để hoàn tất.</p>
              </div>
            )}
         </div>
      </motion.div>
    )
  }

  const renderSessionStats = () => {
    const answeredCount = Object.keys(sessionAnswers).length
    const correctCount = Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
      const q = session.questions[Number(idx)]
      return q.options[optIdx]?.is_correct
    }).length
    const wrongCount = answeredCount - correctCount
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

    return (
      <div className="bg-slate-50/80 rounded-[1.5rem] p-4 mb-4 border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SESSION SUMMARY</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 rounded-full text-white">
            <Target className="w-2.5 h-2.5" />
            <span className="text-[9px] font-black">{accuracy}%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 bg-white rounded-xl shadow-sm border border-slate-100/50">
            <span className="text-[14px] font-black text-slate-700">{answeredCount}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase">DONE</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-emerald-50 rounded-xl shadow-sm border border-emerald-100/50">
            <span className="text-[14px] font-black text-emerald-600">{correctCount}</span>
            <span className="text-[8px] font-bold text-emerald-400 uppercase">RIGHT</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-rose-50 rounded-xl shadow-sm border border-rose-100/50">
            <span className="text-[14px] font-black text-rose-600">{wrongCount}</span>
            <span className="text-[8px] font-bold text-rose-400 uppercase">WRONG</span>
          </div>
        </div>
      </div>
    )
  }

  const renderQuestionMapGrid = () => (
    <div className="grid grid-cols-8 md:grid-cols-10 lg:grid-cols-5 gap-2 pb-4">
      {session.questions?.map((q: any, i: number) => {
        const hasAttemptedThisSession = sessionAnswers[i] !== undefined
        const selectedOptIdx = sessionAnswers[i]
        const sessionCorrect = selectedOptIdx !== undefined ? q.options[selectedOptIdx]?.is_correct : false
        const totalStats = q.stats?.total || 0
        const correctStats = q.stats?.correct || 0
        const ratio = totalStats > 0 ? (correctStats / totalStats) * 100 : 0

        return (
          <button 
            key={i} 
            onClick={() => {
              navigateToQuestion(i)
              setIsMapOpen(false)
            }}
            className={cn(
              "relative aspect-square rounded-lg border flex items-center justify-center font-black text-[11px] transition-all overflow-hidden",
              currentIndex === i 
                ? "border-indigo-600 ring-2 ring-indigo-500 ring-offset-1 z-10" 
                : "border-slate-100 hover:border-indigo-200",
              totalStats === 0 ? "bg-white text-slate-400" : "text-slate-700"
            )}
            style={
              totalStats > 0 
                ? { background: `linear-gradient(to top, #DCFCE7 0%, #DCFCE7 ${ratio}%, #FEE2E2 ${ratio}%, #FEE2E2 100%)` } 
                : {}
            }
          >
            {!hasAttemptedThisSession ? (
              <span className="relative z-10">{i + 1}</span>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                {sessionCorrect ? (
                  <Check className="w-6 h-6 text-emerald-700 stroke-[4] animate-in zoom-in-50 duration-300" />
                ) : (
                  <X className="w-6 h-6 text-red-700 stroke-[4] animate-in zoom-in-50 duration-300" />
                )}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )

  if (!session) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">LOADING SESSION...</div>

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <header className="flex-shrink-0 z-[120] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-lg text-indigo-600 shadow-sm active:scale-90 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[200px] md:max-w-md">{session.title}</h1>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-black text-indigo-600">{totalXP} XP</span>
              {streak >= 2 && (
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[8px] font-black">
                  <Flame className="w-3 h-3 fill-white" />
                  <span>{streak}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 rounded-lg text-white shadow-sm border border-slate-800">
            <Timer className={cn("w-3 h-3 text-indigo-400", !showFeedback && "animate-pulse")} />
            <span className="text-[10px] font-black">{timeLeft}s</span>
          </div>
          
          <AnimatePresence>
            {showFeedback && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={copyQuestionToClipboard}
                className="w-8 h-8 flex items-center justify-center bg-amber-50 border border-amber-100 rounded-lg text-amber-500 shadow-sm active:scale-90 transition-all"
                title="Copy câu hỏi"
              >
                <Copy className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          <button 
            onClick={() => navigate(`/manage/edit/${id}/questions`)}
            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm active:scale-90 transition-all"
            title="Sửa câu hỏi"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsQuitModalOpen(true)}
            className="w-8 h-8 flex items-center justify-center bg-rose-50 border border-rose-100 rounded-lg text-rose-500 shadow-sm active:scale-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex w-full max-w-none justify-center gap-4 lg:gap-8 px-2 lg:px-6 xl:px-10 py-6 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="hidden xl:flex w-[340px] 2xl:w-[440px] flex-shrink-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {renderFeedbackArea()}
          </div>
        </aside>

        <div className="w-full max-w-4xl min-w-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
            

          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Question Content */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20">
                 {/* Question Stats Banner */}
                                   <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                     <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-indigo-600 rounded-xl text-white font-black text-base shadow-lg shadow-indigo-100 animate-in zoom-in-50 duration-300">
                        {currentIndex + 1}
                     </div>
                     
                     <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100/50">
                       <Target className="w-3.5 h-3.5 text-indigo-400" />
                       <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                         <span className="hidden sm:inline">Attempts: </span> <strong className="text-slate-700">{currentQuestion?.stats?.total || 0}</strong>
                       </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50/50 px-2.5 py-1.5 rounded-lg border border-emerald-100/50">
                       <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                       <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                         <span className="hidden sm:inline">Correct: </span>
                         <strong className="text-emerald-600">{currentQuestion?.stats?.correct || 0}</strong>
                         <span className="text-emerald-400/80 ml-1 text-[10px]">({(currentQuestion?.stats?.total || 0) > 0 ? Math.round(((currentQuestion?.stats?.correct || 0) / (currentQuestion?.stats?.total || 1)) * 100) : 0}%)</span>
                       </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-rose-50/50 px-2.5 py-1.5 rounded-lg border border-rose-100/50">
                       <XCircle className="w-3.5 h-3.5 text-rose-500" />
                       <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                         <span className="hidden sm:inline">Wrong: </span>
                         <strong className="text-rose-600">{(currentQuestion?.stats?.total || 0) - (currentQuestion?.stats?.correct || 0)}</strong>
                       </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-50/50 px-2.5 py-1.5 rounded-lg border border-amber-100/50">
                       <Clock className="w-3.5 h-3.5 text-amber-500" />
                       <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                         <span className="hidden sm:inline">Avg Time: </span>
                         <strong className="text-amber-600">{currentQuestion?.stats?.avg_time || 0}s</strong>
                       </span>
                    </div>
                  </div>
                 </div>

                 <h2 className="text-xl md:text-2xl font-bold leading-snug text-slate-800 mb-8">{currentQuestion?.content}</h2>
                 
                 <div className="grid grid-cols-1 gap-3">
                    {currentQuestion?.options.map((opt, idx) => (
                      <button 
                        key={opt.id}
                        onClick={() => handleAnswer(idx)}
                        disabled={showFeedback}
                        className={cn(
                          "group p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden",
                          selectedOption === idx 
                            ? (opt.is_correct ? "border-emerald-500 bg-emerald-50/50" : "border-rose-500 bg-rose-50/50")
                            : (showFeedback && opt.is_correct ? "border-emerald-500 bg-emerald-50/50" : "border-slate-50 bg-white hover:border-indigo-200 hover:bg-slate-50")
                        )}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all",
                             selectedOption === idx 
                               ? (opt.is_correct ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")
                               : (showFeedback && opt.is_correct ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white")
                           )}>
                             {String.fromCharCode(65 + idx)}
                           </div>
                           <span className="flex-1 font-bold text-slate-700">{opt.content}</span>
                           {showFeedback && opt.is_correct && <Check className="w-5 h-5 text-emerald-600" />}
                           {showFeedback && selectedOption === idx && !opt.is_correct && <X className="w-5 h-5 text-rose-600" />}
                        </div>
                      </button>
                    ))}
                 </div>
              </div>
            </motion.div>
          </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:flex w-[340px] 2xl:w-[420px] flex-shrink-0 flex-col overflow-hidden">
          <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col overflow-hidden">
            <h4 className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 flex-shrink-0">QUESTION MAP</h4>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">
               {renderSessionStats()}
               {renderQuestionMapGrid()}
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Controls */}
      <footer className="flex-shrink-0 p-4 bg-white/70 backdrop-blur-2xl border-t border-slate-100 z-[100]">
        <div className="max-w-2xl mx-auto w-full flex items-center gap-3">
          <button onClick={() => setIsMapOpen(true)} className="lg:hidden w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-500 shadow-sm active:scale-95 transition-all">
            <LayoutGrid className="w-5 h-5" />
          </button>
          
          {showFeedback && (
            <button onClick={() => setIsFeedbackOpen(true)} className="xl:hidden w-12 h-12 flex-shrink-0 flex items-center justify-center bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 shadow-sm active:scale-95 transition-all relative">
              <BookOpen className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>
          )}

          {!showFeedback ? (
            <button 
              disabled={selectedOption === null}
              className="flex-1 h-12 bg-slate-900 text-white font-black text-xs rounded-2xl shadow-lg uppercase tracking-widest active:scale-95 transition-all disabled:opacity-20"
            >
              SUBMIT RESPONSE
            </button>
          ) : (
            <button 
              onClick={handleNext}
              className="flex-1 h-12 bg-indigo-600 text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95 transition-all"
            >
              NEXT QUESTION
            </button>
          )}
        </div>
      </footer>

      {/* Mobile Question Map Modal */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="fixed inset-0 z-[200] bg-[#F8FAFC] lg:hidden flex flex-col h-screen"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shadow-sm flex-shrink-0">
              <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.3em]">QUESTION MAP</h4>
              <button onClick={() => setIsMapOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 active:scale-95 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
               {renderSessionStats()}
               {renderQuestionMapGrid()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Feedback Modal */}
      <AnimatePresence>
        {isFeedbackOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="fixed inset-0 z-[200] bg-[#F8FAFC] xl:hidden flex flex-col h-screen"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shadow-sm flex-shrink-0">
              <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.3em]">LEARNING INSIGHTS</h4>
              <button onClick={() => setIsFeedbackOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 active:scale-95 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
               {renderFeedbackArea(true)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {isQuitModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsQuitModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl border border-white/20 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-400 via-rose-500 to-rose-400"></div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-rose-100">
                  <X className="w-8 h-8 text-rose-500" />
                </div>
                
                <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Kết Thúc Phiên Học?</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">Thoát ngay bây giờ sẽ xóa trạng thái hiện tại của phiên học này. Bạn có chắc chắn muốn thoát không?</p>
                
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => setIsQuitModalOpen(false)}
                    className="py-4 bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
                  >
                    Ở LẠI HỌC
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await axios.delete(`/api/v1/quiz/${id}/session`)
                      } catch (e) {}
                      navigate(`/quiz/${id}`)
                    }}
                    className="py-4 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all"
                  >
                    XÁC NHẬN THOÁT
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
