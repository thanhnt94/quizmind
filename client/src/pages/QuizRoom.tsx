import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Users, Play, Trophy, Check, X, Timer, LogOut, ArrowRight, UserCheck, Shield, Send, MessageSquare, Heart, Sparkles, AlertCircle, Crown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface Participant {
  user_id: number
  username: string
  is_ready: boolean
  score: number
  total_answered: number
}

interface Room {
  id: number
  room_code: string
  status: 'waiting' | 'active' | 'finished'
  quiz_title: string
  quiz_id: number
  host_id: number
  settings?: {
    game_mode?: 'chill' | 'competitive' | 'survival'
    time_limit?: number
    current_question_index?: number
  }
  participants: Participant[]
}

interface ChatMessage {
  id: number
  username: string
  message: string
  created_at: string
}

export default function QuizRoom() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState<Room | null>(null)
  const [quizData, setQuizData] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [timeSpent, setTimeSpent] = useState(0)
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  
  // Lives state for survival mode
  const [lives, setLives] = useState(3)
  const [isEliminated, setIsEliminated] = useState(false)
  const [timeoutTriggered, setTimeoutTriggered] = useState(false)
  
  // Chat state
  const [chats, setChats] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(true)
  
  const timerRef = useRef<any>(null)
  const pollRef = useRef<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMe()
    fetchRoom()
    fetchChats()
    
    pollRef.current = setInterval(() => {
      fetchRoom()
      fetchChats()
    }, 3000)
    
    return () => {
      clearInterval(pollRef.current)
      clearInterval(timerRef.current)
    }
  }, [code])

  useEffect(() => {
    // Scroll chats to bottom when updated
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chats])

  // Synchronize index and timer with server state
  useEffect(() => {
    if (room?.settings?.current_question_index !== undefined) {
      const serverIdx = room.settings?.current_question_index ?? 0
      if (serverIdx !== currentIndex && quizData) {
        if (serverIdx < quizData.questions.length) {
          setCurrentIndex(serverIdx)
          setSelectedOption(null)
          setShowFeedback(false)
          setTimeSpent(0)
          setTimeoutTriggered(false)
        } else {
          // Quiz completed
          handleLocalFinish()
        }
      }
    }
  }, [room?.settings?.current_question_index, quizData])

  // Handle countdown timeouts in competitive / survival modes
  useEffect(() => {
    if (room?.status === 'active' && room?.settings?.game_mode !== 'chill') {
      const limit = room.settings?.time_limit || 20
      if (timeSpent >= limit && !showFeedback && !isEliminated && !timeoutTriggered) {
        handleTimeout()
      }
    }
  }, [timeSpent, room?.status])

  const fetchMe = async () => {
    try {
      const res = await axios.get('/api/v1/auth/me')
      setMyUserId(res.data.user?.id)
    } catch (e) {}
  }

  const fetchRoom = async () => {
    try {
      const res = await axios.get(`/api/v1/quiz/room/${code}`)
      setRoom(res.data)
      
      if (res.data.status === 'active' && !quizData) {
        fetchQuizData(res.data.quiz_id)
        startLocalTimer()
      }
      
      if (res.data.status === 'finished') {
        fetchLeaderboard()
      }
    } catch (e) {
      navigate('/')
    }
  }

  const fetchQuizData = async (quizId: number) => {
    try {
      const res = await axios.get(`/api/v1/quiz/${quizId}/play-data`)
      setQuizData(res.data)
    } catch (e) {}
  }

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`/api/v1/quiz/room/${code}/leaderboard`)
      setLeaderboard(res.data)
    } catch (e) {}
  }

  const fetchChats = async () => {
    try {
      const res = await axios.get(`/api/v1/quiz/room/${code}/chat`)
      setChats(res.data)
    } catch (e) {}
  }

  const startLocalTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1)
    }, 1000)
  }

  const handleStart = async () => {
    try {
      await axios.post(`/api/v1/quiz/room/${code}/start`)
      fetchRoom()
    } catch (e) {
      alert("Failed to start room")
    }
  }

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    try {
      await axios.post(`/api/v1/quiz/room/${code}/chat`, { message: newMessage })
      setNewMessage('')
      fetchChats()
    } catch (e) {}
  }

  const handleAnswer = async (optIdx: number) => {
    if (showFeedback || !quizData || isEliminated) return
    const currentQuestion = quizData.questions[currentIndex]
    const correct = currentQuestion.options[optIdx].is_correct
    
    setSelectedOption(optIdx)
    setShowFeedback(true)

    // Update lives locally in survival mode
    if (room?.settings?.game_mode === 'survival' && !correct) {
      const nextLives = Math.max(0, lives - 1)
      setLives(nextLives)
      if (nextLives === 0) {
        setIsEliminated(true)
      }
    }

    try {
      await axios.post(`/api/v1/quiz/room/${code}/submit`, {
        question_id: currentQuestion.id,
        option_id: currentQuestion.options[optIdx].id,
        is_correct: correct,
        time_spent: timeSpent
      })
    } catch (e) {
      console.error("Failed to submit answer")
    }
  }

  const handleTimeout = async () => {
    if (isEliminated || showFeedback) return
    setTimeoutTriggered(true)
    setShowFeedback(true)

    if (room?.settings?.game_mode === 'survival') {
      const nextLives = Math.max(0, lives - 1)
      setLives(nextLives)
      if (nextLives === 0) {
        setIsEliminated(true)
      }
    }

    try {
      // Submit incorrect timeout selection (option_id null)
      await axios.post(`/api/v1/quiz/room/${code}/submit`, {
        question_id: quizData.questions[currentIndex].id,
        option_id: null,
        is_correct: false,
        time_spent: room?.settings?.time_limit || 20
      })
    } catch (e) {}

    // Auto-advance in competitive/survival modes if Host
    if (room?.host_id === myUserId) {
      const limit = room?.settings?.time_limit || 20
      // Give players 3 extra seconds to see feedback before auto next
      setTimeout(async () => {
        try {
          await axios.post(`/api/v1/quiz/room/${code}/next-question`)
        } catch (e) {}
      }, 3500)
    }
  }

  const handleNext = async () => {
    if (!quizData || !room) return
    
    if (currentIndex < quizData.questions.length - 1) {
      // Advance room question index
      try {
        await axios.post(`/api/v1/quiz/room/${code}/next-question`)
        fetchRoom()
      } catch (e) {
        console.error("Failed to advance question")
      }
    } else {
      // Host closes the room and triggers victory podium for everyone
      try {
        await axios.post(`/api/v1/quiz/room/${code}/end`)
        fetchRoom()
      } catch (e) {
        console.error("Failed to end exam")
      }
    }
  }

  const handleLocalFinish = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setRoom(prev => prev ? { ...prev, status: 'finished' } : null)
    fetchLeaderboard()
  }

  if (!room) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">CONNECTING TO LOBBY...</div>

  const isHost = room.host_id === myUserId
  const mode = room.settings?.game_mode || 'chill'

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row overflow-hidden">
      
      {/* LEFT/MAIN GAME SECTION */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-indigo-600 rounded-full text-white text-[8px] font-black uppercase tracking-widest shadow-sm">LOBBY: {room.room_code}</div>
              <h2 className="text-xs font-black text-slate-400 uppercase truncate max-w-[150px]">{room.quiz_title}</h2>
           </div>
           
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="w-9 h-9 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 relative"
              >
                <MessageSquare className="w-4.5 h-4.5" />
              </button>
           </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 md:p-8">
           
           {/* RENDER WAITING LOBBY */}
           {room.status === 'waiting' && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 text-center"
             >
               <div className="w-20 h-20 bg-indigo-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-100">
                 <Users className="w-10 h-10 text-indigo-600" />
               </div>
               <h1 className="text-xl font-black text-slate-900 mb-1">Arena Lobby</h1>
               <p className="text-indigo-600 font-black text-3xl tracking-[0.4em] pl-[0.4em] mb-6">{room.room_code}</p>
               
               <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-4 px-2">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contenders ({room.participants.length})</span>
                     <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100/50">
                       Mode: {mode === 'chill' ? 'Chill' : mode === 'competitive' ? 'Speed' : 'Survival'}
                     </span>
                  </div>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                     {room.participants.map(p => (
                       <div key={p.user_id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase">
                              {p.username[0]}
                            </div>
                            <span className="text-xs font-bold text-slate-700">{p.username}</span>
                         </div>
                         {p.user_id === room.host_id ? (
                           <Crown className="w-4 h-4 text-amber-500 fill-amber-50" />
                         ) : (
                           <UserCheck className="w-4 h-4 text-emerald-500" />
                         )}
                       </div>
                     ))}
                  </div>
               </div>

               {isHost ? (
                 <button 
                   onClick={handleStart}
                   className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <Play className="w-5 h-5 fill-white shrink-0" />
                   OPEN BATTLEGROUND
                 </button>
               ) : (
                 <div className="py-4 text-slate-400 font-black text-sm animate-pulse tracking-widest uppercase">
                   Waiting for host to start...
                 </div>
               )}
               
               <button 
                 onClick={() => navigate('/room/join')}
                 className="mt-4 text-slate-400 font-bold text-xs hover:text-rose-500 transition-all flex items-center justify-center gap-1 mx-auto"
               >
                 <LogOut className="w-3.5 h-3.5" />
                 LEAVE ARENA
               </button>
             </motion.div>
           )}

           {/* RENDER ACTIVE GAMEPLAY */}
           {room.status === 'active' && quizData && (
             <div className="w-full max-w-2xl relative">
               <AnimatePresence>
                 {isEliminated && (
                   <motion.div 
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center text-white"
                   >
                     <div className="w-16 h-16 bg-rose-500/20 border border-rose-500 rounded-3xl flex items-center justify-center text-rose-500 mb-6 animate-bounce">
                       <AlertCircle className="w-8 h-8" />
                     </div>
                     <h2 className="text-2xl font-black uppercase italic">Eliminated</h2>
                     <p className="text-xs font-semibold text-slate-300 mt-2 max-w-xs leading-relaxed">
                       You have run out of lives! You are now watching the classroom room as a spectator. Use chat to support others!
                     </p>
                   </motion.div>
                 )}
               </AnimatePresence>

               {/* Game Stats Header */}
               <div className="flex items-center justify-between mb-8">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Question {currentIndex + 1} of {quizData.questions.length}</span>
                    {mode === 'survival' && (
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3].map(h => (
                          <Heart 
                            key={h} 
                            className={cn(
                              "w-4.5 h-4.5 transition-all duration-300 shrink-0", 
                              lives >= h ? "text-rose-500 fill-rose-500 scale-100" : "text-slate-200 fill-none scale-90"
                            )} 
                          />
                        ))}
                      </div>
                    )}
                 </div>
                 
                 {mode !== 'chill' && (
                   <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 rounded-xl text-white shadow-md">
                     <Timer className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                     <span className="text-[10px] font-black tracking-widest uppercase">
                       {Math.max(0, (room.settings?.time_limit || 20) - timeSpent)}s left
                     </span>
                   </div>
                 )}
               </div>

               {/* Question Board */}
               <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-sm space-y-6">
                 <h3 className="text-lg md:text-xl font-black text-slate-800 leading-tight">
                   <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{quizData.questions[currentIndex].content}</ReactMarkdown>
                 </h3>

                 <div className="space-y-3">
                   {quizData.questions[currentIndex].options.map((opt: any, idx: number) => (
                     <button
                       key={opt.id}
                       onClick={() => handleAnswer(idx)}
                       disabled={showFeedback || isEliminated}
                       className={cn(
                         "w-full p-5 rounded-2xl border-2 text-left font-bold transition-all flex items-center justify-between group",
                         !showFeedback ? "border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50" : 
                         opt.is_correct ? "border-emerald-500 bg-emerald-50" : 
                         selectedOption === idx ? "border-rose-500 bg-rose-50" : "border-slate-100 opacity-50"
                       )}
                     >
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black",
                            !showFeedback ? "bg-slate-50 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white" :
                            opt.is_correct ? "bg-emerald-600 text-white" :
                            selectedOption === idx ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-400"
                          )}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className={cn(
                            "text-sm font-semibold",
                            opt.is_correct && showFeedback ? "text-emerald-700" : 
                            selectedOption === idx && showFeedback ? "text-rose-700" : "text-slate-700"
                          )}>{opt.content}</span>
                       </div>
                       {showFeedback && opt.is_correct && <Check className="w-4 h-4 text-emerald-600" />}
                       {showFeedback && !opt.is_correct && selectedOption === idx && <X className="w-4 h-4 text-rose-600" />}
                     </button>
                   ))}
                 </div>

                 {/* Feedback explanations */}
                 <AnimatePresence>
                   {showFeedback && (
                     <motion.div 
                       initial={{ opacity: 0, height: 0 }}
                       animate={{ opacity: 1, height: 'auto' }}
                       className="border-t border-slate-50 pt-6 space-y-4"
                     >
                       <p className="text-xs text-slate-500 leading-relaxed italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                         <strong>Explanation:</strong> <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{quizData.questions[currentIndex].explanation}</ReactMarkdown>
                       </p>
                       
                       {isHost && (
                         <button 
                           onClick={handleNext}
                           className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all shadow-md"
                         >
                           {currentIndex < quizData.questions.length - 1 ? 'NEXT QUESTION' : 'END EXAM & ANNOUNCE'}
                           <ArrowRight className="w-4 h-4" />
                         </button>
                       )}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             </div>
           )}

           {/* RENDER VICTORY PODIUM rankings */}
           {room.status === 'finished' && leaderboard.length > 0 && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               className="w-full max-w-2xl bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden"
             >
               {/* 3D victory podium grid */}
               <div className="bg-indigo-600 p-8 md:p-12 text-center text-white relative">
                 <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-300 animate-bounce" />
                 <h1 className="text-2xl font-black uppercase italic mb-8">Victory Standings</h1>
                 
                 {/* Podium layout columns */}
                 <div className="flex items-end justify-center gap-4 md:gap-8 max-w-sm mx-auto h-[160px] pt-4">
                   {/* 2nd place (Silver) */}
                   {leaderboard.length > 1 && (
                     <div className="flex-1 flex flex-col items-center">
                       <span className="text-[10px] font-black text-slate-200 truncate w-20 mb-2">{leaderboard[1].username}</span>
                       <div className="w-full bg-slate-200/20 border border-slate-200/30 rounded-t-xl h-[80px] flex items-center justify-center font-black text-xl shadow-lg relative">
                         2
                         <Sparkles className="w-3.5 h-3.5 text-slate-300 absolute -top-4" />
                       </div>
                     </div>
                   )}
                   
                   {/* 1st place (Gold) */}
                   {leaderboard.length > 0 && (
                     <div className="flex-1 flex flex-col items-center">
                       <span className="text-xs font-black text-amber-300 truncate w-24 mb-2">{leaderboard[0].username}</span>
                       <div className="w-full bg-amber-400 border border-amber-500 rounded-t-xl h-[120px] flex items-center justify-center font-black text-3xl shadow-xl relative text-indigo-950">
                         1
                         <Crown className="w-6 h-6 text-amber-300 absolute -top-6 animate-pulse" />
                       </div>
                     </div>
                   )}

                   {/* 3rd place (Bronze) */}
                   {leaderboard.length > 2 && (
                     <div className="flex-1 flex flex-col items-center">
                       <span className="text-[10px] font-black text-orange-200 truncate w-20 mb-2">{leaderboard[2].username}</span>
                       <div className="w-full bg-orange-300/35 border border-orange-400/30 rounded-t-xl h-[60px] flex items-center justify-center font-black text-lg shadow-lg relative">
                         3
                         <Sparkles className="w-3.5 h-3.5 text-orange-300 absolute -top-4" />
                       </div>
                     </div>
                   )}
                 </div>
               </div>

               <div className="p-6 md:p-8">
                 <div className="space-y-3">
                    {leaderboard.map((p, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "flex items-center justify-between p-4.5 rounded-2xl border transition-all shadow-sm",
                          p.username === room.participants.find(part => part.user_id === myUserId)?.username 
                            ? "bg-indigo-50/50 border-indigo-200 shadow-indigo-50" 
                            : "bg-white border-slate-100"
                        )}
                      >
                        <div className="flex items-center gap-3">
                           <div className={cn(
                             "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs",
                             idx === 0 ? "bg-amber-100 text-amber-600" :
                             idx === 1 ? "bg-slate-100 text-slate-500" :
                             idx === 2 ? "bg-orange-100 text-orange-600" : "bg-slate-50 text-slate-400"
                           )}>
                             {idx + 1}
                           </div>
                           <span className="text-sm font-black text-slate-700">{p.username}</span>
                        </div>
                        <div className="text-right">
                           <div className="text-lg font-black text-indigo-600">{p.score}</div>
                           <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{p.total_answered} Answered</div>
                        </div>
                      </div>
                    ))}
                 </div>

                 <button 
                   onClick={() => navigate('/room/join')}
                   className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-black transition-all hover:scale-[1.01]"
                 >
                   LEAVE CLASSROOM
                 </button>
               </div>
             </motion.div>
           )}
           
        </div>
      </div>

      {/* RIGHT SIDE PANEL COLLAPSIBLE CHAT DRAWER */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-slate-100 bg-white flex flex-col h-screen shrink-0 shadow-xl lg:shadow-none z-[140] relative"
          >
            {/* Chat header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-700">Classroom Chat</span>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat scroll box */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
              {chats.map((c) => (
                <div key={c.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-1.5">
                     <span className={cn(
                       "text-[9px] font-black uppercase tracking-wider",
                       c.username === room.participants.find(p => p.user_id === room.host_id)?.username
                         ? "text-amber-500" : "text-indigo-600"
                     )}>
                       {c.username}
                     </span>
                     <span className="text-[7px] font-bold text-slate-300">{new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-medium text-slate-600 leading-relaxed break-words max-w-[280px]">
                    {c.message}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input form */}
            <form onSubmit={handleSendChat} className="p-4 border-t border-slate-100 flex gap-2">
              <input 
                type="text" 
                placeholder="Discuss..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 h-10 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold focus:bg-white outline-none transition-all placeholder:text-slate-300"
              />
              <button 
                type="submit"
                className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-100 shrink-0"
              >
                <Send className="w-4 h-4 fill-white" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  )
}
