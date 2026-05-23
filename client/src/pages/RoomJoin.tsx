import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, X, ArrowRight, Play, LayoutGrid, Search, Lock, Unlock, Key, Settings, Crown, Flame, ShieldAlert, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { cn } from '@/lib/utils'

interface Quiz {
  id: number
  title: string
  questions_count: number
}

interface RoomCard {
  id: number
  room_code: string
  quiz_title: string
  quiz_id: number
  status: string
  participant_count: number
  requires_password: boolean
  game_mode: 'chill' | 'competitive' | 'survival'
  is_host?: boolean
}

export default function RoomJoin() {
  const [activeTab, setActiveTab] = useState<'join' | 'my-rooms' | 'discover' | 'host'>('join')
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [discoverRooms, setDiscoverRooms] = useState<RoomCard[]>([])
  const [myRooms, setMyRooms] = useState<RoomCard[]>([])
  
  // Host settings
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null)
  const [gameMode, setGameMode] = useState<'chill' | 'competitive' | 'survival'>('chill')
  const [timeLimit, setTimeLimit] = useState(20)
  const [password, setPassword] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  
  // Password lock modals
  const [lockedRoomCode, setLockedRoomCode] = useState<string | null>(null)
  const [verifyPassword, setVerifyPassword] = useState('')
  const [verifying, setVerifying] = useState(false)
  
  const navigate = useNavigate()

  useEffect(() => {
    fetchMyQuizzes()
    fetchActiveRooms()
  }, [])

  const fetchMyQuizzes = async () => {
    try {
      const res = await axios.get('/api/v1/dashboard/data')
      setMyQuizzes(res.data.my_quizzes)
    } catch (e) {}
  }

  const fetchActiveRooms = async () => {
    try {
      const res = await axios.get('/api/v1/quiz/room/active')
      setDiscoverRooms(res.data.discover_rooms)
      setMyRooms(res.data.my_rooms)
    } catch (e) {}
  }

  const handleJoin = async (targetCode?: string, overridePass?: string) => {
    const codeToJoin = targetCode || roomCode
    if (!codeToJoin) return
    
    setIsJoining(true)
    try {
      await axios.post('/api/v1/quiz/room/join', { 
        room_code: codeToJoin,
        password: overridePass || verifyPassword
      })
      setLockedRoomCode(null)
      setVerifyPassword('')
      navigate(`/room/${codeToJoin.toUpperCase()}`)
    } catch (e: any) {
      if (e.response?.status === 401) {
        alert("Incorrect room password")
      } else {
        alert("Room not found or expired")
      }
    } finally {
      setIsJoining(false)
      setVerifying(false)
    }
  }

  const handleHost = async () => {
    if (!selectedQuizId) return
    try {
      const res = await axios.post('/api/v1/quiz/room/create', { 
        quiz_id: selectedQuizId,
        game_mode: gameMode,
        time_limit: timeLimit,
        password: isPrivate ? password : ''
      })
      navigate(`/room/${res.data.room_code}`)
    } catch (e) {
      alert("Failed to create room")
    }
  }

  const handleCardClick = (room: RoomCard) => {
    if (room.requires_password) {
      setLockedRoomCode(room.room_code)
      setVerifyPassword('')
    } else {
      handleJoin(room.room_code)
    }
  }

  const filteredQuizzes = myQuizzes.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8 pt-4">
        {/* Sticky Dashboard Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
                <Users className="w-5 h-5" />
             </div>
             <div>
               <h1 className="text-lg md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                  QuizMind <span className="text-indigo-600">Battlegrounds</span>
               </h1>
               <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Multiplayer Classrooms and lobbies</p>
             </div>
          </div>
          
          <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 scale-95 origin-right overflow-x-auto max-w-full no-scrollbar">
             {['join', 'my-rooms', 'discover', 'host'].map((tab) => (
               <button 
                 key={tab} 
                 onClick={() => {
                   setActiveTab(tab as any)
                   fetchActiveRooms()
                 }}
                 className={cn(
                   "px-5 py-2.5 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                   activeTab === tab ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                 {tab === 'join' ? 'Code Join' : tab === 'my-rooms' ? 'My Rooms' : tab === 'discover' ? 'Discover' : 'Host Arena'}
               </button>
             ))}
          </div>
        </div>

        {/* Dynamic content rendering */}
        <div className="relative min-h-[500px]">
          <AnimatePresence mode="wait">
            
            {/* 1. CODE JOIN TAB */}
            {activeTab === 'join' && (
              <motion.div 
                key="join"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full max-w-md mx-auto bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-12 text-center"
              >
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Key className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2">Battle with Friends</h2>
                <p className="text-slate-400 text-xs mb-8">Enter the 6-digit room code to step into the arena</p>
                
                <div className="space-y-6">
                  <input 
                    type="text" 
                    placeholder="AZ78K"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-2xl font-black tracking-[0.3em] text-center text-indigo-600 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-200 placeholder:tracking-normal placeholder:text-sm"
                  />
                  <button 
                    onClick={() => handleJoin()}
                    disabled={!roomCode || isJoining}
                    className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isJoining ? 'JOINING...' : 'JOIN NOW'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. MY ACTIVE ROOMS GRID */}
            {activeTab === 'my-rooms' && (
              <motion.div 
                key="my-rooms"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Classrooms You Joined ({myRooms.length})</h2>
                {myRooms.length === 0 ? (
                  <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 shadow-sm max-w-md mx-auto">
                    <LayoutGrid className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-sm font-black text-slate-600 uppercase">No Active Rooms</h3>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Join an arena via code or browse discoverable active rooms.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myRooms.map(room => (
                      <RoomGridCard key={room.id} room={room} onEnter={handleCardClick} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. DISCOVER PUBLIC ARENAS */}
            {activeTab === 'discover' && (
              <motion.div 
                key="discover"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Explore Active Arenas ({discoverRooms.length})</h2>
                {discoverRooms.length === 0 ? (
                  <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 shadow-sm max-w-md mx-auto">
                    <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-sm font-black text-slate-600 uppercase">Arena List Empty</h3>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">There are currently no active public arenas. Host your own deck!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {discoverRooms.map(room => (
                      <RoomGridCard key={room.id} room={room} onEnter={handleCardClick} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. HOST COMPREHENSIVE CONFIGURATION PORTAL */}
            {activeTab === 'host' && (
              <motion.div 
                key="host"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Deck Selector Column */}
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Choose Quiz Deck</span>
                     <div className="relative w-48 scale-90 origin-right">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                       <input 
                         type="text" 
                         placeholder="Filter decks..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="w-full h-9 bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 text-[10px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/5 transition-all"
                       />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                    {filteredQuizzes.map(quiz => (
                      <div 
                        key={quiz.id} 
                        onClick={() => setSelectedQuizId(quiz.id)}
                        className={cn(
                          "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-32 group",
                          selectedQuizId === quiz.id 
                            ? "bg-indigo-50/50 border-indigo-500 shadow-sm shadow-indigo-100" 
                            : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                      >
                         <div className="flex items-start justify-between">
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm",
                              selectedQuizId === quiz.id ? "bg-indigo-600 text-white" : "bg-slate-50"
                            )}>
                               <LayoutGrid className="w-4.5 h-4.5" />
                            </div>
                            {selectedQuizId === quiz.id && (
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                            )}
                         </div>
                         <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 truncate uppercase">{quiz.title}</h4>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{quiz.questions_count} Questions</p>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Game Parameters Column */}
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
                  <div className="space-y-6">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Arena Settings</span>
                    
                    {/* Game Mode Selector */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gameplay mode</label>
                      <div className="grid grid-cols-3 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        {['chill', 'competitive', 'survival'].map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setGameMode(mode as any)}
                            className={cn(
                              "py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                              gameMode === mode ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {mode === 'chill' ? 'Chill' : mode === 'competitive' ? 'Speed' : 'Survival'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time limit option */}
                    {gameMode !== 'chill' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Timer limit per card</label>
                        <div className="flex gap-2">
                          {[10, 20, 30].map(s => (
                            <button
                              key={s}
                              onClick={() => setTimeLimit(s)}
                              className={cn(
                                "flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all border",
                                timeLimit === s 
                                  ? "bg-slate-900 text-white border-slate-900" 
                                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                              )}
                            >
                              {s}s
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Private Lobby Switch & Password Input */}
                    <div className="space-y-3 pt-2 border-t border-slate-50">
                       <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Private battleground</label>
                          <button
                            onClick={() => setIsPrivate(!isPrivate)}
                            className={cn(
                              "w-12 h-6.5 rounded-full p-1 transition-all duration-300 relative border",
                              isPrivate ? "bg-indigo-600 border-indigo-600" : "bg-slate-100 border-slate-200"
                            )}
                          >
                            <motion.div 
                              layout 
                              className="w-4 h-4 bg-white rounded-full shadow-sm"
                              animate={{ x: isPrivate ? 22 : 0 }}
                            />
                          </button>
                       </div>
                       
                       <AnimatePresence>
                         {isPrivate && (
                           <motion.div
                             initial={{ height: 0, opacity: 0 }}
                             animate={{ height: 'auto', opacity: 1 }}
                             exit={{ height: 0, opacity: 0 }}
                             className="overflow-hidden"
                           >
                             <input 
                               type="password"
                               placeholder="Lobby password key..."
                               value={password}
                               onChange={(e) => setPassword(e.target.value)}
                               className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all placeholder:text-slate-300"
                             />
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </div>
                  </div>

                  <button
                    onClick={handleHost}
                    disabled={!selectedQuizId}
                    className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    LAUNCH BATTLEFIELD
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Lock Password verified Modal */}
      <AnimatePresence>
        {lockedRoomCode && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLockedRoomCode(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl relative z-10 text-center space-y-6"
            >
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase italic">Locked Room Arena</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Lobby verification key required</p>
              </div>

              <input 
                type="password"
                placeholder="Enter password..."
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
                className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-center text-lg font-black tracking-[0.2em] focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-xs"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setLockedRoomCode(null)}
                  className="flex-1 py-3.5 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    setVerifying(true)
                    handleJoin(lockedRoomCode)
                  }}
                  disabled={!verifyPassword || verifying}
                  className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {verifying ? 'VERIFYING...' : 'ENTER'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RoomGridCard({ room, onEnter }: { room: RoomCard, onEnter: (room: RoomCard) => void }) {
  return (
    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 hover:border-indigo-100 hover:shadow-xl transition-all flex flex-col justify-between h-48 group overflow-hidden relative shadow-sm">
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/10 rounded-full blur-xl -z-10" />
      <div>
         <div className="flex items-center justify-between mb-4">
            <div className="px-3 py-1 bg-indigo-600 rounded-full text-white text-[8px] font-black uppercase tracking-widest shadow-sm">Lobby: {room.room_code}</div>
            <div className="flex items-center gap-1.5 text-slate-400">
               {room.requires_password ? (
                 <Lock className="w-3.5 h-3.5 text-rose-500 bg-rose-50 p-0.5 rounded" />
               ) : (
                 <Unlock className="w-3.5 h-3.5 text-emerald-500 bg-emerald-50 p-0.5 rounded" />
               )}
               <span className="text-[9px] font-black uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100/50">
                 {room.game_mode === 'chill' ? 'Chill' : room.game_mode === 'competitive' ? 'Speed' : 'Survival'}
               </span>
            </div>
         </div>
         <h4 className="text-sm font-black text-slate-900 uppercase truncate leading-snug">{room.quiz_title}</h4>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-4">
         <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400">
               <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{room.participant_count} Players</span>
         </div>
         
         <button 
           onClick={() => onEnter(room)}
           className="w-9 h-9 rounded-xl bg-slate-900 group-hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
         >
           <Play className="w-3.5 h-3.5 fill-white shrink-0" />
         </button>
      </div>
    </div>
  )
}
