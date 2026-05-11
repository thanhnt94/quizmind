import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Users, Play, Trophy, Check, X, Timer, LogOut, ArrowRight, UserCheck, Shield } from 'lucide-react'
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
  participants: Participant[]
}

export default function QuizRoom() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState<Room | null>(null)
  const [quizData, setQuizData] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  
  const timerRef = useRef<any>(null)
  const pollRef = useRef<any>(null)

  useEffect(() => {
    fetchMe()
    fetchRoom()
    pollRef.current = setInterval(fetchRoom, 3000)
    return () => {
      clearInterval(pollRef.current)
      clearInterval(timerRef.current)
    }
  }, [code])

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

  const startLocalTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev + 1)
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

  const handleAnswer = async (optIdx: number) => {
    if (showFeedback || !quizData) return
    const currentQuestion = quizData.questions[currentIndex]
    const correct = currentQuestion.options[optIdx].is_correct
    
    setSelectedOption(optIdx)
    setShowFeedback(true)

    try {
      await axios.post(`/api/v1/quiz/room/${code}/submit`, {
        question_id: currentQuestion.id,
        option_id: currentQuestion.options[optIdx].id,
        is_correct: correct,
        time_spent: timeLeft
      })
    } catch (e) {
      console.error("Failed to submit answer")
    }
  }

  const handleNext = () => {
    if (!quizData) return
    if (currentIndex < quizData.questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOption(null)
      setShowFeedback(false)
      setTimeLeft(0)
    } else {
      // Finished all questions locally
      // Room status might still be active for others
      setRoom(prev => prev ? { ...prev, status: 'finished' } : null)
      fetchLeaderboard()
    }
  }

  if (!room) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">CONNECTING TO ROOM...</div>

  // RENDER WAITING STATE
  if (room.status === 'waiting') {
    const isHost = room.host_id === myUserId
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 text-center"
        >
          <div className="w-20 h-20 bg-indigo-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">Exam Room</h1>
          <p className="text-indigo-500 font-black text-4xl tracking-[0.5em] mb-6 pl-[0.5em]">{room.room_code}</p>
          
          <div className="bg-slate-50 rounded-2xl p-4 mb-6">
             <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Participants ({room.participants.length})</span>
             </div>
             <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                {room.participants.map(p => (
                  <div key={p.user_id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black">
                         {p.username[0].toUpperCase()}
                       </div>
                       <span className="text-sm font-bold text-slate-700">{p.username}</span>
                    </div>
                    {p.user_id === room.host_id ? (
                      <Shield className="w-4 h-4 text-amber-500" />
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
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-white" />
              START EXAM
            </button>
          ) : (
            <div className="py-4 text-slate-400 font-black text-sm animate-pulse">
              WAITING FOR HOST TO START...
            </div>
          )}
          
          <button 
            onClick={() => navigate('/')}
            className="mt-4 text-slate-400 font-bold text-sm hover:text-rose-500 transition-all flex items-center justify-center gap-1 mx-auto"
          >
            <LogOut className="w-4 h-4" />
            LEAVE ROOM
          </button>
        </motion.div>
      </div>
    )
  }

  // RENDER ACTIVE STATE
  if (room.status === 'active' && quizData) {
    const currentQuestion = quizData.questions[currentIndex]
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50">
           <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-indigo-600 rounded-full text-white text-[10px] font-black uppercase">ROOM: {room.room_code}</div>
              <h2 className="text-sm font-black text-slate-400 uppercase truncate max-w-[150px]">{room.quiz_title}</h2>
           </div>
           <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 rounded-lg text-white">
                <Timer className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] font-black">{timeLeft}s</span>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-8">
           <div className="max-w-2xl mx-auto">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                   <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Question {currentIndex + 1} of {quizData.questions.length}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{currentQuestion.content}</ReactMarkdown>
                </h3>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((opt: any, idx: number) => (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswer(idx)}
                    disabled={showFeedback}
                    className={cn(
                      "w-full p-6 rounded-2xl border-2 text-left font-bold transition-all flex items-center justify-between group",
                      !showFeedback ? "border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50" : 
                      opt.is_correct ? "border-emerald-500 bg-emerald-50" : 
                      selectedOption === idx ? "border-rose-500 bg-rose-50" : "border-slate-100 opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black",
                         !showFeedback ? "bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white" :
                         opt.is_correct ? "bg-emerald-600 text-white" :
                         selectedOption === idx ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-400"
                       )}>
                         {String.fromCharCode(65 + idx)}
                       </div>
                       <span className={cn(
                         "text-base",
                         opt.is_correct && showFeedback ? "text-emerald-700" : 
                         selectedOption === idx && showFeedback ? "text-rose-700" : "text-slate-700"
                       )}>{opt.content}</span>
                    </div>
                    {showFeedback && opt.is_correct && <Check className="w-5 h-5 text-emerald-600" />}
                    {showFeedback && !opt.is_correct && selectedOption === idx && <X className="w-5 h-5 text-rose-600" />}
                  </button>
                ))}
              </div>

              {showFeedback && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{currentQuestion.explanation}</ReactMarkdown>
                  </p>
                  <button 
                    onClick={handleNext}
                    className="w-full mt-6 py-4 bg-slate-900 text-white rounded-xl font-black flex items-center justify-center gap-2"
                  >
                    NEXT QUESTION <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
           </div>
        </div>
      </div>
    )
  }

  // RENDER FINISHED/LEADERBOARD STATE
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 flex flex-col items-center">
       <motion.div 
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         className="w-full max-w-2xl"
       >
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
             <div className="bg-indigo-600 p-10 text-center text-white relative">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-300" />
                <h1 className="text-3xl font-black mb-2">Final Rankings</h1>
                <p className="text-indigo-200 font-bold">{room.quiz_title}</p>
             </div>
             
             <div className="p-8">
                <div className="space-y-3">
                   {leaderboard.map((p, idx) => (
                     <div 
                       key={idx} 
                       className={cn(
                         "flex items-center justify-between p-5 rounded-2xl border transition-all",
                         p.username === room.participants.find(part => part.user_id === myUserId)?.username 
                           ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                           : "bg-white border-slate-100"
                       )}
                     >
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-black",
                            idx === 0 ? "bg-amber-100 text-amber-600" :
                            idx === 1 ? "bg-slate-100 text-slate-500" :
                            idx === 2 ? "bg-orange-100 text-orange-600" : "bg-slate-50 text-slate-400"
                          )}>
                            {idx + 1}
                          </div>
                          <span className="text-lg font-black text-slate-700">{p.username}</span>
                       </div>
                       <div className="text-right">
                          <div className="text-2xl font-black text-indigo-600">{p.score}</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.total_answered} Answered</div>
                       </div>
                     </div>
                   ))}
                </div>

                <button 
                  onClick={() => navigate('/')}
                  className="w-full mt-10 py-5 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-black transition-all"
                >
                  BACK TO DASHBOARD
                </button>
             </div>
          </div>
       </motion.div>
    </div>
  )
}
