import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, X, ArrowRight, Play, LayoutGrid, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'

interface Quiz {
  id: number
  title: string
  questions_count: number
}

export default function RoomJoin() {
  const [activeTab, setActiveTab] = useState<'join' | 'host'>('join')
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (activeTab === 'host') {
      fetchMyQuizzes()
    }
  }, [activeTab])

  const fetchMyQuizzes = async () => {
    try {
      const res = await axios.get('/api/v1/dashboard/data')
      setMyQuizzes(res.data.my_quizzes)
    } catch (e) {}
  }

  const handleJoin = async () => {
    if (!roomCode) return
    setIsJoining(true)
    try {
      await axios.post('/api/v1/quiz/room/join', { room_code: roomCode })
      navigate(`/room/${roomCode.toUpperCase()}`)
    } catch (e) {
      alert("Room not found or expired")
    } finally {
      setIsJoining(false)
    }
  }

  const handleHost = async (quizId: number) => {
    try {
      const res = await axios.post('/api/v1/quiz/room/create', { quiz_id: quizId })
      navigate(`/room/${res.data.room_code}`)
    } catch (e) {
      alert("Failed to create room")
    }
  }

  const filteredQuizzes = myQuizzes.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center p-6 pt-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-1.5 bg-slate-100/50 flex items-center">
            {['join', 'host'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "flex-1 py-4 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all relative",
                  activeTab === tab ? "text-indigo-600" : "text-slate-400"
                )}
              >
                {activeTab === tab && <motion.div layoutId="roomTab" className="absolute inset-0 bg-white shadow-sm rounded-[1.8rem]" />}
                <span className="relative z-10">{tab === 'join' ? 'Join Room' : 'Host Room'}</span>
              </button>
            ))}
          </div>

          <div className="p-10">
            <AnimatePresence mode="wait">
              {activeTab === 'join' ? (
                <motion.div 
                  key="join"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mb-2">Battle with Friends</h2>
                  <p className="text-slate-400 text-xs mb-8">Enter the 6-digit code to enter the arena</p>
                  
                  <div className="space-y-6">
                    <input 
                      type="text" 
                      placeholder="AZ78K"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-2xl font-black tracking-[0.3em] text-center text-indigo-600 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-200 placeholder:tracking-normal placeholder:text-sm"
                    />
                    <button 
                      onClick={handleJoin}
                      disabled={!roomCode || isJoining}
                      className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isJoining ? 'JOINING...' : 'JOIN NOW'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="host"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                   <div className="mb-6 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search your quizzes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 text-xs font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                   </div>
                   
                   <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                      {filteredQuizzes.map(quiz => (
                        <div key={quiz.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                 <LayoutGrid className="w-5 h-5" />
                              </div>
                              <div>
                                 <h4 className="text-xs font-black text-slate-900 truncate max-w-[150px]">{quiz.title}</h4>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{quiz.questions_count} Qs</p>
                              </div>
                           </div>
                           <button 
                             onClick={() => handleHost(quiz.id)}
                             className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all"
                           >
                              <Play className="w-4 h-4 fill-white" />
                           </button>
                        </div>
                      ))}
                      {filteredQuizzes.length === 0 && (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest opacity-50">No quizzes found</div>
                      )}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/')}
          className="mt-8 w-full text-slate-400 font-bold text-sm hover:text-indigo-600 transition-all text-center"
        >
          Back to Dashboard
        </button>
      </motion.div>
    </div>
  )
}
