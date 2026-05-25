import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutGrid, Timer, Flame, Trophy, Check, X, Sparkles, Lightbulb, StickyNote, Play, Target, CheckCircle2, XCircle, Clock, BookOpen, Hash, Copy, Edit3, Brain, FileText, HelpCircle, Sliders, ListOrdered, Shuffle, EyeOff, AlertCircle, TrendingUp, Award } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

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
  box_level?: number
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

  const formatLatex = (t: string) => {
    return t
      .replace(/`\s*(<ruby>[\s\S]*?<\/ruby>)\s*`/g, '$1') // Strip backticks around ruby tags
      .replace(/\$\\rightarrow\$/g, '→')
      .replace(/\$\\Rightarrow\$/g, '⇒')
      .replace(/\$\\leftarrow\$/g, '←')
      .replace(/\$\\Leftarrow\$/g, '⇐')
      .replace(/\$\\leftrightarrow\$/g, '↔')
      .replace(/\$\\Leftrightarrow\$/g, '⇔')
      .replace(/\$\\times\$/g, '×')
      .replace(/\$\\div\$/g, '÷')
      .replace(/\$\\le\$/g, '≤')
      .replace(/\$\\ge\$/g, '≥')
      .replace(/\$\\neq\$/g, '≠')
      .replace(/\$\\approx\$/g, '≈')
      .replace(/\$\\pm\$/g, '±')
  }

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
        {formatLatex(displayedText)}
      </ReactMarkdown>
      {isTyping && <span className="inline-block w-1.5 h-3.5 ml-1 bg-indigo-500 animate-pulse align-middle" />}
      <div ref={bottomRef} />
    </>
  )
}

const MarkdownComponents = {
  code({ node, className, children, ...props }: any) {
    const value = String(children || '').replace(/\n$/, '')
    const hasRuby = value.includes('<ruby>') || value.includes('</ruby>')
    if (hasRuby) {
      return (
        <code className={className} dangerouslySetInnerHTML={{ __html: value }} {...props} />
      )
    }
    return <code className={className} {...props}>{children}</code>
  }
}

export default function QuizPlay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, setUser, setGamify } = useAppStore()
  const [session, setSession] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [badgeVisible, setBadgeVisible] = useState(false)
  const [badgeMessage, setBadgeMessage] = useState("")
  const [streak, setStreak] = useState(0)
  const [sessionXP, setSessionXP] = useState(0)
  const [initialTotalXP, setInitialTotalXP] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isAskingAI, setIsAskingAI] = useState(false)
  const [personalNote, setPersonalNote] = useState('')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [isEditingAI, setIsEditingAI] = useState(false)
  const [isEditingInsight, setIsEditingInsight] = useState(false)
  const [insightInput, setInsightInput] = useState('')
  const [aiInput, setAiInput] = useState('')
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false)
  const [activeFeedbackTab, setActiveFeedbackTab] = useState<'insight' | 'ai' | 'note'>('insight')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [activeUnlockedBadge, setActiveUnlockedBadge] = useState<any | null>(null)
  const [activeMasteryUpgrade, setActiveMasteryUpgrade] = useState<any | null>(null)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [sessionAnswers, setSessionAnswers] = useState<Record<number, number>>({})
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [promptInput, setPromptInput] = useState('')
  // ── Engagement State ──
  const [answerContext, setAnswerContext] = useState<{
    wasCorrect: boolean
    prevTotal: number
    prevCorrect: number
    timeTaken: number
    avgTime: number
    newStreak: number
    xpGained: number
  } | null>(null)
  const [isSessionSummaryOpen, setIsSessionSummaryOpen] = useState(false)
  const [xpFloat, setXpFloat] = useState<{ visible: boolean; amount: number }>({ visible: false, amount: 0 })
  const [milestonesHit, setMilestonesHit] = useState<Set<number>>(new Set())
  const [goalToast, setGoalToast] = useState<{
    visible: boolean;
    message: string;
    isTargetMet: boolean;
    justCompleted: boolean;
    streakCount: number;
    doneToday: number;
    dailyTarget: number;
    bonusXP?: number;
  } | null>(null)
  const [activeGoal, setActiveGoal] = useState<any>(null)
  const [showGoalCelebration, setShowGoalCelebration] = useState(false)
  const [isLimitlessStrike, setIsLimitlessStrike] = useState(false)
  const [activeMode, setActiveMode] = useState<string>(() => localStorage.getItem('quiz_learning_mode') || 'sequential')
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false)
  const [learningModeAlert, setLearningModeAlert] = useState<{
    visible: boolean;
    message: string;
    type?: 'info' | 'warning';
  } | null>(null)
  const [justAnswered, setJustAnswered] = useState(false)

  const timerRef = useRef<any>(null)
  const currentQuestion: Question | null = session?.questions?.[currentIndex] || null

  const getMasteryPill = (boxLevel: number) => {
    switch (boxLevel) {
      case 5:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm">
            🏆 MASTERED
          </span>
        )
      case 4:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 shadow-sm">
            ⚡ PROFICIENT
          </span>
        )
      case 3:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-sm">
            📘 FAMILIAR
          </span>
        )
      case 2:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-sm">
            🌱 LEARNING
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-600 border border-slate-500/20 shadow-sm">
            ⭐ NEW
          </span>
        )
    }
  }

  const getBadgeIcon = (badgeId: string) => {
    switch (badgeId) {
      case 'first_steps':
        return Play
      case 'streak_starter':
        return Flame
      case 'streak_legend':
        return Trophy
      case 'perfect_score':
        return CheckCircle2
      case 'speed_demon':
        return Clock
      case 'goal_crusher':
        return Target
      case 'card_master':
        return Brain
      default:
        return Award
    }
  }
  const canEdit = user?.role === 'admin' || user?.id === 1 || session?.creator_id === user?.id || session?.is_collaborator


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
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ignore if typing inside input, textarea, or contentEditable elements
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || activeElement.getAttribute('contenteditable') === 'true') {
          return;
        }
      }

      // 2. Ignore if any modal or dialog overlay is active
      if (isSessionSummaryOpen || isQuitModalOpen || isEditModalOpen || isMapOpen || isFeedbackOpen) {
        return;
      }

      const key = e.key.toLowerCase();

      // 3. Handle next / advance question when feedback is showing
      if (showFeedback) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleNext();
        }
      } else if (currentQuestion && currentQuestion.options) {
        // 4. Handle option choosing (1-9, a-z)
        let optionIndex = -1;
        if (key >= '1' && key <= '9') {
          optionIndex = parseInt(key) - 1;
        } else if (key >= 'a' && key <= 'z') {
          optionIndex = key.charCodeAt(0) - 97; // 'a' is 97
        }

        if (optionIndex >= 0 && optionIndex < currentQuestion.options.length) {
          e.preventDefault();
          handleAnswer(optionIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    showFeedback,
    currentQuestion,
    isSessionSummaryOpen,
    isQuitModalOpen,
    isEditModalOpen,
    isMapOpen,
    isFeedbackOpen,
    currentIndex,
    sessionAnswers,
    activeMode
  ])

  useEffect(() => {
    if (currentQuestion) {
      fetchNote()
    }
  }, [currentIndex, currentQuestion])

  // Tự động đóng toàn bộ các popup/toast khi người dùng click mở bất kỳ khung thông tin hoặc modal phụ nào
  useEffect(() => {
    if (isFeedbackOpen || isMapOpen || isEditModalOpen || isQuitModalOpen || isSessionSummaryOpen) {
      setGoalToast(prev => prev ? { ...prev, visible: false } : null)
      setShowGoalCelebration(false)
      setBadgeVisible(false)
      setActiveUnlockedBadge(null)
      setActiveMasteryUpgrade(null)
      setLearningModeAlert(null)
    }
  }, [isFeedbackOpen, isMapOpen, isEditModalOpen, isQuitModalOpen, isSessionSummaryOpen])

  useEffect(() => {
    const fetchUser = async () => {
      if (!user) {
        try {
          const res = await axios.get('/api/v1/dashboard/data')
          setUser(res.data.user)
          setGamify(res.data.gamify)
        } catch (e) {}
      }
    }
    fetchUser()
  }, [user, setUser, setGamify])

  const fetchSession = async () => {
    try {
      const quizRes = await axios.get(`/api/v1/quiz/${id}/play-data`)
      const questions = quizRes.data.questions || []
      setSession({ ...quizRes.data, questions })
      setPromptInput(quizRes.data.ai_prompt || '')
      setInitialTotalXP(quizRes.data.user_total_xp || 0)

      // Fetch active goal if any
      try {
        const goalsRes = await axios.get('/api/v1/quiz/goals/active', {
          params: { local_date: new Date().toLocaleDateString('en-CA') }
        })
        const matchingGoal = goalsRes.data.find((g: any) => g.quiz_id === Number(id))
        if (matchingGoal) {
          setActiveGoal(matchingGoal)
        }
      } catch (e) {
        console.error("Failed to load active goals", e)
      }
      
      try {
        const sessionRes = await axios.get(`/api/v1/quiz/${id}/session`)
        if (sessionRes.data) {
          const restoredAnswers = sessionRes.data.state?.sessionAnswers || {}
          setSessionAnswers(restoredAnswers)
          
          let curIdx = sessionRes.data.current_index || 0
          
          // Adjust initial index based on smart learning mode if we are starting a fresh/unanswered question
          if (restoredAnswers[curIdx] === undefined) {
            const savedMode = localStorage.getItem('quiz_learning_mode') || 'sequential'
            if (savedMode !== 'sequential') {
              let modeIdx = -1
              if (savedMode === 'unseen') {
                modeIdx = questions.findIndex((q: any, i: number) => (q.stats?.total || 0) === 0 && restoredAnswers[i] === undefined)
              } else if (savedMode === 'review') {
                modeIdx = questions.findIndex((q: any, i: number) => ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 && restoredAnswers[i] === undefined)
              } else if (savedMode === 'hardest') {
                let minRatio = Infinity
                let maxWrongs = -1
                for (let i = 0; i < questions.length; i++) {
                  if (restoredAnswers[i] !== undefined) continue
                  const q = questions[i]
                  const t = q.stats?.total || 0
                  const c = q.stats?.correct || 0
                  const wrongs = t - c
                  if (t > 0) {
                    const ratio = c / t
                    if (ratio < minRatio) {
                      minRatio = ratio
                      maxWrongs = wrongs
                      modeIdx = i
                    } else if (ratio === minRatio && wrongs > maxWrongs) {
                      maxWrongs = wrongs
                      modeIdx = i
                    }
                  }
                }
              } else if (savedMode === 'random') {
                const pool = questions.map((_: any, i: number) => i).filter((i: number) => restoredAnswers[i] === undefined)
                if (pool.length > 0) {
                  modeIdx = pool[Math.floor(Math.random() * pool.length)]
                }
              }

              if (modeIdx !== -1) {
                curIdx = modeIdx
              }
            }
          }
          
          setCurrentIndex(curIdx)
          
          // Update local state to reflect which questions are answered in this session
          // but DO NOT manually increment stats, as the backend quiz play-data already includes them.
          if (typeof restoredAnswers[curIdx] === 'number') {
            setSelectedOption(restoredAnswers[curIdx])
            setShowFeedback(true)
          }

          if (sessionRes.data.state?.sessionXP) {
            setSessionXP(sessionRes.data.state.sessionXP)
          }
          if (sessionRes.data.state?.streak) {
            setStreak(sessionRes.data.state.streak)
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

  const saveSession = async (newAnswers: Record<number, number>, newIndex: number, currentXP: number = sessionXP, currentStreak: number = streak) => {
    try {
      await axios.post(`/api/v1/quiz/${id}/session`, {
        mode: "sequential",
        current_index: newIndex,
        state: { 
          sessionAnswers: newAnswers,
          sessionXP: currentXP,
          streak: currentStreak
        }
      })
    } catch (e) {}
  }

  const handleAnswer = async (optIdx: number) => {
    if (showFeedback || !currentQuestion) return
    setSelectedOption(optIdx)
    setJustAnswered(true)
    const correct = currentQuestion.options[optIdx].is_correct
    setShowFeedback(true)

    // Snapshot BEFORE updating stats (for context display)
    const prevTotal = currentQuestion.stats?.total || 0
    const prevCorrect = currentQuestion.stats?.correct || 0
    const avgTime = currentQuestion.stats?.avg_time || 0
    const timeTaken = timeLeft
    
    const newAnswers = { ...sessionAnswers, [currentIndex]: optIdx }
    setSessionAnswers(newAnswers)
    
    let updatedXP = sessionXP
    let updatedStreak = streak
    const isFirstEver = prevTotal === 0
    const prevRatio = prevTotal > 0 ? prevCorrect / prevTotal : 0
    const usuallyCorrect = prevRatio >= 0.7 && prevTotal >= 2

    if (correct) {
      updatedStreak = streak + 1
      setStreak(updatedStreak)
      const xpGained = isFirstEver ? 15 : (updatedStreak >= 5 ? 20 : 10)
      updatedXP = sessionXP + xpGained
      setSessionXP(updatedXP)
      setInitialTotalXP(prev => prev + xpGained)

      // Context-aware success messages
      let msg = ''
      if (isFirstEver) msg = `First Blood! 🎯 +${xpGained} XP`
      else if (updatedStreak >= 10) msg = `UNSTOPPABLE! 🔥 ${updatedStreak}-streak!`
      else if (updatedStreak >= 5) msg = `On Fire! 🔥 ${updatedStreak}-streak bonus!`
      else if (prevRatio < 0.5 && prevTotal >= 2) msg = `Redemption! 📈 You improved!`
      else if (prevRatio >= 0.9 && prevTotal >= 3) msg = `Consistent! ⭐ You always nail this`
      else msg = [`Brilliant! 🚀`, `Perfect! 🎯`, `Nailed it! ✨`, `Excellent! 🌈`][Math.floor(Math.random() * 4)]
      setBadgeMessage(msg)

      // XP float animation
      setXpFloat({ visible: true, amount: xpGained })
      setTimeout(() => setXpFloat({ visible: false, amount: 0 }), 1500)

      // Streak milestone confetti
      const confettiColors = updatedStreak >= 5
        ? ['#f59e0b', '#ef4444', '#f97316']
        : ['#6366f1', '#a855f7', '#ec4899']
      confetti({ particleCount: updatedStreak >= 5 ? 250 : 150, spread: updatedStreak >= 5 ? 100 : 70, origin: { y: 0.6 }, colors: confettiColors })

      setAnswerContext({ wasCorrect: true, prevTotal, prevCorrect, timeTaken, avgTime, newStreak: updatedStreak, xpGained })
    } else {
      updatedStreak = 0
      setStreak(0)
      const xpGained = 0

      // Context-aware failure messages
      let msg = ''
      if (isFirstEver) msg = `First try! No worries 💪`
      else if (usuallyCorrect) msg = `Slip! You usually nail this 😅`
      else if (prevRatio === 0 && prevTotal >= 2) msg = `Keep at it! 📚 It'll click soon`
      else msg = [`Nice try! 💪`, `Learning mode! 📚`, `Almost! 🍀`, `Keep going! 🌻`][Math.floor(Math.random() * 4)]
      setBadgeMessage(msg)

      setAnswerContext({ wasCorrect: false, prevTotal, prevCorrect, timeTaken, avgTime, newStreak: 0, xpGained })
    }

    setBadgeVisible(true)
    setTimeout(() => setBadgeVisible(false), 2500)

    // Check session progress milestones
    const answered = Object.keys(newAnswers).length
    const total = session?.questions?.length || 1
    const pct = Math.round((answered / total) * 100)
    const milestones = [25, 50, 75, 100]
    milestones.forEach(m => {
      if (pct >= m && !milestonesHit.has(m)) {
        setMilestonesHit(prev => new Set([...prev, m]))
        if (m === 100) setTimeout(() => setIsSessionSummaryOpen(true), 800)
      }
    })

    saveSession(newAnswers, currentIndex, updatedXP, updatedStreak)

    // Immediately update local stats for real-time UI reflection
    setSession((prev: any) => {
      if (!prev) return prev
      const newSession = { ...prev }
      const newQs = [...newSession.questions]
      const q = { ...newQs[currentIndex] }
      
      const currentStats = q.stats || { total: 0, correct: 0, avg_time: 0 }
      const newTotal = currentStats.total + 1
      const newCorrect = currentStats.correct + (correct ? 1 : 0)
      
      const oldTotalTime = (currentStats.avg_time || 0) * currentStats.total
      const newAvgTime = Math.round((oldTotalTime + timeTaken) / newTotal)
      
      q.stats = { total: newTotal, correct: newCorrect, avg_time: newAvgTime }
      newQs[currentIndex] = q
      newSession.questions = newQs
      return newSession
    })

    try {
      const res = await axios.post('/api/v1/quiz/record_answer', {
        question_id: currentQuestion.id,
        option_id: currentQuestion.options[optIdx].id,
        is_correct: correct,
        time_spent: timeTaken,
        local_date: new Date().toLocaleDateString('en-CA')
      })

      // Spaced Repetition Mastery Level Up
      const masteryUpdate = res.data.mastery_update
      if (masteryUpdate) {
        setSession((prevSession: any) => {
          if (!prevSession) return prevSession
          const updatedQuestions = [...prevSession.questions]
          if (updatedQuestions[currentIndex]) {
            updatedQuestions[currentIndex] = {
              ...updatedQuestions[currentIndex],
              box_level: masteryUpdate.new_level
            }
          }
          return {
            ...prevSession,
            questions: updatedQuestions
          }
        })

        if (masteryUpdate.level_up) {
          confetti({
            particleCount: 50,
            angle: 90,
            spread: 45,
            origin: { y: 0.5 },
            colors: ['#34D399', '#10B981', '#FBBF24']
          })

          setActiveMasteryUpgrade({
            old_level: masteryUpdate.old_level,
            new_level: masteryUpdate.new_level,
            question_id: currentQuestion.id
          })

          setTimeout(() => {
            setActiveMasteryUpgrade(null)
          }, 3000)
        }
      }

      // Real-time Achievement Badge Unlock
      const unlockedBadge = res.data.unlocked_badge
      if (unlockedBadge) {
        setActiveUnlockedBadge(unlockedBadge)
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#8B5CF6', '#EC4899', '#FBBF24', '#3B82F6']
        })
      }

      const goalUpdate = res.data.goal_update
      if (goalUpdate) {
        setGoalToast({
          visible: !goalUpdate.just_completed,
          message: goalUpdate.motivational_message,
          isTargetMet: goalUpdate.is_target_met,
          justCompleted: goalUpdate.just_completed,
          streakCount: goalUpdate.streak_count,
          doneToday: goalUpdate.done_today,
          dailyTarget: goalUpdate.daily_target,
          bonusXP: goalUpdate.bonus_xp
        })
        
        setActiveGoal((prev: any) => {
          if (!prev) return {
            goal_id: goalUpdate.goal_id,
            quiz_id: Number(id),
            quiz_title: session?.title || "",
            cover_image: session?.cover_image || null,
            total_questions: session?.questions?.length || 0,
            total_learned: goalUpdate.is_new_question ? 1 : 0,
            daily_target: goalUpdate.daily_target,
            done_today: goalUpdate.done_today,
            is_target_met: goalUpdate.is_target_met,
            streak_count: goalUpdate.streak_count,
            days_remaining_est: Math.ceil(Math.max(0, (session?.questions?.length || 0) - (goalUpdate.is_new_question ? 1 : 0)) / goalUpdate.daily_target)
          }
          const updatedLearned = goalUpdate.is_new_question ? prev.total_learned + 1 : prev.total_learned
          const remainingQs = Math.max(0, prev.total_questions - updatedLearned)
          return {
            ...prev,
            done_today: goalUpdate.done_today,
            is_target_met: goalUpdate.is_target_met,
            streak_count: goalUpdate.streak_count,
            total_learned: updatedLearned,
            days_remaining_est: Math.ceil(remainingQs / prev.daily_target)
          }
        })

        // Auto-dismiss milestone toast after 4.5 seconds
        setTimeout(() => {
          setGoalToast(prev => prev ? { ...prev, visible: false } : null)
        }, 4500)

        if (goalUpdate.just_completed) {
          setShowGoalCelebration(true)
          // Epic continuous confetti shower from bottom corners
          const end = Date.now() + 4.5 * 1000;
          const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
          
          (function frame() {
            confetti({
              particleCount: 4,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.8 },
              colors: colors
            });
            confetti({
              particleCount: 4,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.8 },
              colors: colors
            });
            
            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          }());
        } else if (goalUpdate.is_target_met) {
          if (correct && goalUpdate.done_today > goalUpdate.daily_target) {
            // Screen flash lightning overlay
            setIsLimitlessStrike(true);
            setTimeout(() => setIsLimitlessStrike(false), 800);

            // Epic multi-angle golden/purple fireworks cascade!
            confetti({
              particleCount: 50,
              angle: 60,
              spread: 75,
              origin: { x: 0.15, y: 0.85 },
              colors: ['#F59E0B', '#F97316', '#EF4444', '#8B5CF6', '#FFF']
            });
            confetti({
              particleCount: 50,
              angle: 120,
              spread: 75,
              origin: { x: 0.85, y: 0.85 },
              colors: ['#F59E0B', '#F97316', '#EF4444', '#8B5CF6', '#FFF']
            });
            confetti({
              particleCount: 40,
              spread: 100,
              origin: { x: 0.5, y: 0.5 },
              colors: ['#F59E0B', '#F97316', '#FFF']
            });
          } else {
            // Epic gold/rose sparkle burst from the top right corner near the toast
            confetti({
              particleCount: 20,
              angle: 220,
              spread: 45,
              origin: { x: 0.9, y: 0.12 },
              colors: ['#F59E0B', '#F97316', '#EF4444', '#EC4899']
            });
          }
        }
      }
    } catch (e) {
      console.error("Failed to record answer")
    }
  }

  const navigateToQuestion = (idx: number) => {
    setCurrentIndex(idx)
    setJustAnswered(false)

    // Đóng toàn bộ các popup, toast, thông báo thành tựu khi chuyển sang câu mới
    setGoalToast(prev => prev ? { ...prev, visible: false } : null)
    setShowGoalCelebration(false)
    setBadgeVisible(false)
    setActiveUnlockedBadge(null)
    setActiveMasteryUpgrade(null)
    setLearningModeAlert(null)

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

    const questions = session.questions
    const total = questions.length

    // Fallback function to find the first unanswered question index in this session
    const getFirstUnanswered = () => {
      for (let i = 0; i < total; i++) {
        if (sessionAnswers[i] === undefined) return i
      }
      return -1
    }

    let nextIdx = -1

    if (activeMode === 'sequential') {
      nextIdx = Math.min(currentIndex + 1, total - 1)
    } else if (activeMode === 'random') {
      // Find a random index not answered in THIS session
      const pool = questions.map((_: any, i: number) => i).filter((i: number) => sessionAnswers[i] === undefined)
      if (pool.length > 0) {
        nextIdx = pool[Math.floor(Math.random() * pool.length)]
      }
    } else if (activeMode === 'unseen') {
      // Find next question with 0 historical attempts and not answered in THIS session
      nextIdx = questions.findIndex((q: any, i: number) => 
        i > currentIndex && 
        (q.stats?.total || 0) === 0 && 
        sessionAnswers[i] === undefined
      )
      if (nextIdx === -1) {
        // Loop back to find any unseen
        nextIdx = questions.findIndex((q: any, i: number) => 
          (q.stats?.total || 0) === 0 && 
          sessionAnswers[i] === undefined
        )
      }
    } else if (activeMode === 'review') {
      // Find next question with historical mistakes (total - correct > 0) and not answered in THIS session
      nextIdx = questions.findIndex((q: any, i: number) => 
        i > currentIndex && 
        ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 && 
        sessionAnswers[i] === undefined
      )
      if (nextIdx === -1) {
        // Loop back to find any mistake question not answered in THIS session
        nextIdx = questions.findIndex((q: any, i: number) => 
          ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 && 
          sessionAnswers[i] === undefined
        )
      }
    } else if (activeMode === 'hardest') {
      // Find the unanswered question in this session with the lowest correctness ratio.
      // We prioritize cards that have been attempted at least once.
      let bestIdx = -1
      let minRatio = Infinity
      let maxWrongs = -1

      for (let i = 0; i < total; i++) {
        if (sessionAnswers[i] !== undefined) continue

        const q = questions[i]
        const t = q.stats?.total || 0
        const c = q.stats?.correct || 0
        const wrongs = t - c

        if (t > 0) {
          const ratio = c / t
          // Sort by lowest ratio first, then by absolute wrong count if ratios are equal
          if (ratio < minRatio) {
            minRatio = ratio
            maxWrongs = wrongs
            bestIdx = i
          } else if (ratio === minRatio && wrongs > maxWrongs) {
            maxWrongs = wrongs
            bestIdx = i
          }
        }
      }

      nextIdx = bestIdx
    }

    // Fallback: If no candidate was found for the active mode, fall back to next unanswered question in this session,
    // or simply currentIndex + 1 if everything is answered
    if (nextIdx === -1) {
      nextIdx = getFirstUnanswered()
    }
    if (nextIdx === -1) {
      nextIdx = Math.min(currentIndex + 1, total - 1)
    }

    navigateToQuestion(nextIdx)
  }

  const applyLearningMode = (mode: string) => {
    setActiveMode(mode)
    localStorage.setItem('quiz_learning_mode', mode)
    setIsModeMenuOpen(false)

    if (!session || !session.questions) return

    const questions = session.questions
    const total = questions.length

    // If the current question is already answered (feedback is shown), 
    // we don't jump immediately. The next question will automatically follow the new mode.
    if (showFeedback) return

    let targetIdx = -1
    let alertMsg = ''

    if (mode === 'unseen') {
      targetIdx = questions.findIndex((q: any, i: number) => 
        (q.stats?.total || 0) === 0 && 
        sessionAnswers[i] === undefined
      )
      if (targetIdx === -1) {
        alertMsg = 'All cards have been attempted! Serving remaining cards sequentially.'
      }
    } else if (mode === 'review') {
      targetIdx = questions.findIndex((q: any, i: number) => 
        ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 && 
        sessionAnswers[i] === undefined
      )
      if (targetIdx === -1) {
        alertMsg = "No incorrect cards found yet! We'll serve questions sequentially until mistakes are recorded."
      }
    } else if (mode === 'hardest') {
      let bestIdx = -1
      let minRatio = Infinity
      let maxWrongs = -1

      for (let i = 0; i < total; i++) {
        if (sessionAnswers[i] !== undefined) continue

        const q = questions[i]
        const t = q.stats?.total || 0
        const c = q.stats?.correct || 0
        const wrongs = t - c

        if (t > 0) {
          const ratio = c / t
          if (ratio < minRatio) {
            minRatio = ratio
            maxWrongs = wrongs
            bestIdx = i
          } else if (ratio === minRatio && wrongs > maxWrongs) {
            maxWrongs = wrongs
            bestIdx = i
          }
        }
      }

      if (bestIdx !== -1) {
        targetIdx = bestIdx
      } else {
        alertMsg = 'No attempted cards found yet! Serving sequentially until difficulty stats are gathered.'
      }
    } else if (mode === 'random') {
      if (sessionAnswers[currentIndex] === undefined) {
        targetIdx = currentIndex
      } else {
        const pool = questions.map((_: any, i: number) => i).filter((i: number) => sessionAnswers[i] === undefined)
        if (pool.length > 0) {
          targetIdx = pool[Math.floor(Math.random() * pool.length)]
        }
      }
    } else if (mode === 'sequential') {
      targetIdx = questions.findIndex((_: any, i: number) => sessionAnswers[i] === undefined)
    }

    if (alertMsg) {
      setLearningModeAlert({
        visible: true,
        message: alertMsg,
        type: 'info'
      })
      setTimeout(() => {
        setLearningModeAlert(prev => prev ? { ...prev, visible: false } : null)
      }, 4500)
    }

    if (targetIdx !== -1 && targetIdx !== currentIndex) {
      navigateToQuestion(targetIdx)
    }
  }

  const askAI = async (manualText?: string) => {
    if (!currentQuestion) return
    setIsAskingAI(true)
    try {
      const payload: any = { question_id: currentQuestion.id }
      if (typeof manualText === 'string') payload.ai_explanation = manualText
      
      const res = await axios.post(`/api/v1/quiz/${id}/ask-ai`, payload)
      
      if (res.data.status === 'processing') {
        // Polling loop
        let attempts = 0
        const maxAttempts = 45 // 90 seconds total (45 * 2) - Gemini can be slow under load
        const poll = setInterval(async () => {
          attempts++
          try {
            // Append cache buster to completely bypass browser and proxy caching
            const quizRes = await axios.get(`/api/v1/quiz/${id}/play-data?t=${Date.now()}`)
            const updatedQ = quizRes.data.questions?.find((q: any) => q.id === currentQuestion.id)
            if (updatedQ && updatedQ.ai_explanation) {
              setSession((prev: any) => {
                const newQs = [...prev.questions]
                const targetIdx = newQs.findIndex(q => q.id === updatedQ.id)
                if (targetIdx !== -1) {
                  newQs[targetIdx].ai_explanation = updatedQ.ai_explanation
                }
                return { ...prev, questions: newQs }
              })
              setIsAskingAI(false)
              clearInterval(poll)
            }
          } catch (e) {}
          
          if (attempts >= maxAttempts) {
            clearInterval(poll)
            setIsAskingAI(false)
          }
        }, 2000)
      } else if (res.data.ai_explanation !== undefined) {
        setSession((prev: any) => {
          const newQs = [...prev.questions]
          newQs[currentIndex].ai_explanation = res.data.ai_explanation
          return { ...prev, questions: newQs }
        })
        if (typeof manualText === 'string') setIsEditingAI(false)
        setIsAskingAI(false)
      }
    } catch (e) {
      alert("AI service unavailable.")
      setIsAskingAI(false)
    }
  }

  const savePrompt = async () => {
    try {
      await axios.patch(`/api/v1/quiz/${id}`, { ai_prompt: promptInput })
      setSession((prev: any) => ({ ...prev, ai_prompt: promptInput }))
      setIsEditingPrompt(false)
      alert("Prompt saved successfully!")
    } catch (e) {
      alert("Failed to save prompt.")
    }
  }

  const clearAIExplanation = async () => {
    if (!currentQuestion) return
    if (!window.confirm("Are you sure you want to delete this AI explanation?")) return
    try {
      await axios.patch(`/api/v1/quiz/question/${currentQuestion.id}`, { ai_explanation: null })
      setSession((prev: any) => {
        const newQs = [...prev.questions]
        const targetIdx = newQs.findIndex(q => q.id === currentQuestion.id)
        if (targetIdx !== -1) {
          newQs[targetIdx].ai_explanation = null
        }
        return { ...prev, questions: newQs }
      })
    } catch (e) {
      alert("Failed to delete AI explanation.")
    }
  }

  const saveInsight = async () => {
    if (!currentQuestion) return
    try {
      await axios.patch(`/api/v1/quiz/question/${currentQuestion.id}`, { 
        explanation: insightInput 
      })
      setSession((prev: any) => {
        const newQs = [...prev.questions]
        newQs[currentIndex].explanation = insightInput
        return { ...prev, questions: newQs }
      })
      setIsEditingInsight(false)
    } catch (e) {
      alert("Failed to save insight.")
    }
  }

  const openEditModal = () => {
    if (!currentQuestion) return
    setEditFormData({
      content: currentQuestion.content,
      explanation: currentQuestion.explanation,
      ai_explanation: currentQuestion.ai_explanation,
      options: currentQuestion.options.map(o => ({ id: o.id, content: o.content, is_correct: o.is_correct }))
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!currentQuestion || !editFormData) return
    setIsSavingEdit(true)
    try {
      await axios.patch(`/api/v1/quiz/question/${currentQuestion.id}`, editFormData)
      
      // Update local state
      setSession((prev: any) => {
        const newQs = [...prev.questions]
        newQs[currentIndex] = { 
          ...newQs[currentIndex], 
          ...editFormData,
          options: editFormData.options 
        }
        return { ...prev, questions: newQs }
      })
      
      setIsEditModalOpen(false)
    } catch (e) {
      alert("Failed to save changes.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const copyCurrentTabContent = (type: 'default' | 'prompt' | 'question' = 'default') => {
    let content = ''
    if (activeFeedbackTab === 'insight') content = currentQuestion?.explanation || ''
    else if (activeFeedbackTab === 'ai') {
      if (type === 'question') {
        content = currentQuestion?.content || ''
      } else if (type === 'prompt' && session.ai_prompt) {
        const optionsText = currentQuestion?.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt.content}`).join('\n')
        const correctOpt = currentQuestion?.options.find(o => o.is_correct)
        const correctAnswerText = correctOpt ? `${String.fromCharCode(65 + (currentQuestion?.options?.indexOf(correctOpt) ?? 0))}. ${correctOpt.content}` : 'Unknown'
        
        content = session.ai_prompt
          .replace(/{{question}}/g, currentQuestion?.content || '')
          .replace(/{{options}}/g, optionsText)
          .replace(/{{correct_answer}}/g, correctAnswerText)
          .replace(/{{global_instruction}}/g, session.instruction || '')
          .replace(/{{quiz_title}}/g, session.title || '')
          .replace(/{{quiz_description}}/g, session.description || '')
          .replace(/{{option_a}}/g, currentQuestion?.options[0]?.content || '')
          .replace(/{{option_b}}/g, currentQuestion?.options[1]?.content || '')
          .replace(/{{option_c}}/g, currentQuestion?.options[2]?.content || '')
          .replace(/{{option_d}}/g, currentQuestion?.options[3]?.content || '')
      } else {
        content = currentQuestion?.ai_explanation || ''
      }
    }
    else if (activeFeedbackTab === 'note') content = personalNote || ''
    
    if (content) {
      navigator.clipboard.writeText(content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1500)
      setIsCopyMenuOpen(false)
    }
  }

  const handleEditCurrentTab = () => {
    if (activeFeedbackTab === 'insight') {
      if (isEditingInsight) saveInsight()
      else {
        setInsightInput(currentQuestion?.explanation || '')
        setIsEditingInsight(true)
      }
    } else if (activeFeedbackTab === 'ai') {
      if (isEditingAI) askAI(aiInput)
      else {
        setAiInput(currentQuestion?.ai_explanation || '')
        setIsEditingAI(true)
      }
    } else if (activeFeedbackTab === 'note') {
      if (isEditingNote) saveNote()
      setIsEditingNote(!isEditingNote)
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
      { id: 'insight', label: 'INSIGHT', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-100', hasContent: !!currentQuestion?.explanation },
      { id: 'ai', label: 'AI ANALYSIS', icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-100', hasContent: !!currentQuestion?.ai_explanation },
      { id: 'note', label: 'PERSONAL NOTE', icon: StickyNote, color: 'text-slate-400', bg: 'bg-slate-100', hasContent: !!personalNote }
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
                 <div className="text-slate-600 font-medium text-sm leading-relaxed markdown-content whitespace-pre-wrap break-words pr-2">
                    {isEditingInsight ? (
                      <textarea
                        value={insightInput}
                        onChange={(e) => setInsightInput(e.target.value)}
                        className="w-full h-80 p-3 bg-white border border-indigo-100 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                        placeholder="Enter explanation for this question..."
                      />
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                        {currentQuestion?.explanation || 'No detail.'}
                      </ReactMarkdown>
                    )}
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
                    {canEdit && currentQuestion?.ai_explanation && !isEditingAI && !isEditingPrompt && (
                      <button 
                        onClick={clearAIExplanation}
                        className="text-[9px] font-black text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200 shadow-sm transition-all ml-2"
                      >
                        CLEAR AI
                      </button>
                    )}
                 </div>
                 <div className="flex gap-2">
                   {canEdit && (
                     <button 
                       onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                       className={cn(
                         "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1.5 rounded-md",
                         isEditingPrompt ? "bg-amber-600 text-white shadow-sm" : "text-amber-500 hover:text-amber-600 hover:bg-white"
                       )}
                     >
                       {isEditingPrompt ? 'CLOSE PROMPT' : 'PROMPT'}
                     </button>
                   )}
                   {!currentQuestion?.ai_explanation && !isEditingAI && !isEditingPrompt && (
                     <button 
                       onClick={() => askAI()}
                       disabled={isAskingAI}
                       className="text-[9px] font-black text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm hover:bg-indigo-50 transition-all disabled:opacity-50"
                     >
                       {isAskingAI ? 'ANALYZING...' : 'ASK AI INSIGHT'}
                     </button>
                   )}
                   {canEdit && !isEditingPrompt && (
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
                   )}
                 </div>
               </div>
               
               {isEditingPrompt ? (
                 <div className="space-y-3 mt-2 bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">EDIT SYSTEM PROMPT FOR AI</span>
                     <button 
                       onClick={savePrompt}
                       className="text-[9px] font-black bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-all"
                     >
                       SAVE PROMPT
                     </button>
                   </div>
                   <textarea 
                     value={promptInput}
                     onChange={(e) => setPromptInput(e.target.value)}
                     placeholder="Enter System Prompt to guide the AI..."
                     className="w-full h-80 bg-white rounded-xl p-4 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none border border-amber-200 resize-none transition-all"
                   />
                   <p className="text-[9px] font-medium text-amber-600/80 italic leading-relaxed">
                     * Guide: Use variables <code>{"{{question}}"}</code>, <code>{"{{options}}"}</code>, <code>{"{{correct_answer}}"}</code> to insert dynamic data. The new prompt will be applied to all subsequently regenerated questions.
                   </p>
                 </div>
               ) : isEditingAI ? (
                 <div className="space-y-2 mt-2">
                   <textarea 
                     value={aiInput}
                     onChange={(e) => setAiInput(e.target.value)}
                     placeholder="Enter AI Analysis content manually..."
                     className="w-full h-80 bg-white/50 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border-none resize-none transition-all"
                     autoFocus
                   />
                   <p className="text-[8px] font-medium text-slate-400 italic">Click 'SAVE AI' to save changes for everyone.</p>
                 </div>
               ) : (
                  isAskingAI ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-pulse">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping" />
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        <Sparkles className="w-4 h-4 text-indigo-500 absolute animate-pulse" />
                      </div>
                      <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] text-center animate-bounce">
                        AI DEEP ANALYSIS IN PROGRESS...
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 max-w-xs text-center leading-relaxed">
                        Please wait a moment, the AI is deeply analyzing the grammar and vocabulary of this question.
                      </p>
                    </div>
                  ) : (
                    currentQuestion?.ai_explanation && (
                      <div className="text-slate-700 font-medium text-sm leading-relaxed markdown-content break-words pr-2 mt-2">
                        <TypewriterText text={currentQuestion.ai_explanation} />
                      </div>
                    )
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
                 <div className="text-slate-600 font-medium text-sm leading-relaxed markdown-content min-h-[100px] break-words pr-2">
                   <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                     {personalNote || '*Empty note.*'}
                   </ReactMarkdown>
                 </div>
               ) : (
                 <div className="space-y-2">
                   <textarea 
                     value={personalNote}
                     onChange={(e) => setPersonalNote(e.target.value)}
                     placeholder="Write your study notes here... (Supports Markdown)"
                     className="w-full h-80 bg-slate-50 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none border-none resize-none transition-all"
                     autoFocus
                   />
                   <p className="text-[8px] font-medium text-slate-300 italic">Supports Markdown syntax. Click 'SAVE & CLOSE' to complete.</p>
                 </div>
               )}
            </div>
          )
      }
    }

    return (
      <div className="flex flex-col h-full bg-[#F8FAFC]">
         {!isMobile && (
           <div className="p-6 border-b border-slate-50 flex items-center justify-center bg-white sticky top-0 z-10">
              <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em]">Learning Insights</span>
           </div>
         )}
         
         <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
            {renderTabContent()}
         </div>
         
         <div className={cn(
             "flex items-center justify-between gap-3 py-4 border-t border-slate-100 bg-white/95 backdrop-blur-xl sticky bottom-0 z-50 px-6"
          )}>
             {isMobile && (
               <button 
                 onClick={() => setIsFeedbackOpen(false)}
                 className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 rounded-xl hover:bg-rose-50 hover:border-rose-100 hover:text-rose-500 active:scale-90 transition-all shadow-sm"
               >
                 <X className="w-4 h-4" />
               </button>
             )}

             <button 
               onClick={handleEditCurrentTab}
               className={cn(
                 "w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-300 active:scale-90",
                 ((activeFeedbackTab === 'ai' && isEditingAI) || (activeFeedbackTab === 'note' && isEditingNote) || (activeFeedbackTab === 'insight' && isEditingInsight))
                   ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-100 scale-105"
                   : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 shadow-sm"
               )}
             >
               {((activeFeedbackTab === 'ai' && isEditingAI) || (activeFeedbackTab === 'note' && isEditingNote) || (activeFeedbackTab === 'insight' && isEditingInsight)) ? (
                 <Check className="w-5 h-5 stroke-[3] animate-pulse" />
               ) : (
                 <Edit3 className="w-5 h-5" />
               )}
             </button>

             <div className="flex items-center bg-slate-50 p-1 rounded-2xl h-14 border border-slate-200/60 shadow-inner gap-1">
               {tabs.map((tab: any) => {
                 const isActive = activeFeedbackTab === tab.id
                 return (
                   <button
                     key={tab.id}
                     onClick={() => setActiveFeedbackTab(tab.id)}
                     className={cn(
                       "w-12 h-11 flex items-center justify-center rounded-xl transition-all duration-300 relative",
                       isActive 
                         ? (
                             tab.id === 'insight' ? "text-amber-500 bg-white shadow-md border border-amber-100/60 scale-105" :
                             tab.id === 'ai' ? "text-indigo-600 bg-white shadow-md border border-indigo-100/60 scale-105" :
                             "text-emerald-600 bg-white shadow-md border border-emerald-100/60 scale-105"
                           )
                         : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                     )}
                   >
                     <div className="relative">
                       <tab.icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} />
                       {tab.hasContent && (
                         <span className={cn(
                           "absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white animate-pulse",
                           tab.id === 'insight' ? "bg-amber-500" :
                           tab.id === 'ai' ? "bg-indigo-600" :
                           "bg-emerald-500"
                         )} />
                       )}
                     </div>
                   </button>
                 )
               })}
             </div>

             <div className="relative">
               <AnimatePresence>
                 {isCopyMenuOpen && activeFeedbackTab === 'ai' && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10, scale: 0.9 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.9 }}
                     className="absolute bottom-16 right-0 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_30px_rgba(99,102,241,0.12)] border border-slate-100/80 p-2 flex flex-col gap-1 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
                   >
                     <button 
                       onClick={() => copyCurrentTabContent('default')}
                       className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all text-left"
                     >
                       <FileText className="w-4 h-4 text-slate-400" />
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Copy Result</span>
                     </button>
                     <button 
                       onClick={() => copyCurrentTabContent('question')}
                       className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all text-left"
                     >
                       <HelpCircle className="w-4 h-4 text-slate-400" />
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Copy Question</span>
                     </button>
                     <button 
                       onClick={() => copyCurrentTabContent('prompt')}
                       className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/60 hover:text-indigo-600 rounded-xl transition-all text-left"
                     >
                       <Brain className="w-4 h-4 text-indigo-400" />
                       <span className="text-[11px] font-black text-indigo-500 uppercase tracking-wider">Copy Prompt</span>
                     </button>
                   </motion.div>
                 )}
               </AnimatePresence>

               <button 
                 onClick={() => {
                   if (activeFeedbackTab === 'ai') setIsCopyMenuOpen(!isCopyMenuOpen)
                   else copyCurrentTabContent()
                 }}
                 className={cn(
                   "w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-300 active:scale-90 shadow-sm",
                   isCopied 
                     ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-100 scale-105" 
                     : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
                 )}
               >
                 {isCopied ? <Check className="w-5 h-5 stroke-[3]" /> : <Copy className="w-5 h-5" />}
               </button>
             </div>

             {isMobile && (
               <button 
                 onClick={() => {
                   handleNext()
                   setIsFeedbackOpen(false)
                 }}
                 className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200/60 active:scale-90 hover:scale-105 hover:rotate-3 transition-all"
               >
                 <ChevronRight className="w-5 h-5" />
               </button>
             )}
          </div>
      </div>
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
    <div className="grid grid-cols-8 md:grid-cols-10 lg:grid-cols-5 gap-3 p-1 pb-4">
      {session.questions?.map((q: any, i: number) => {
        const hasAttemptedThisSession = sessionAnswers[i] !== undefined
        const selectedOptIdx = sessionAnswers[i]
        const sessionCorrect = selectedOptIdx !== undefined ? q.options[selectedOptIdx]?.is_correct : false
        const totalStats = q.stats?.total || 0
        const correctStats = q.stats?.correct || 0
        const ratio = totalStats > 0 ? (correctStats / totalStats) * 100 : 0

        const isActive = currentIndex === i

        return (
          <button 
            key={i} 
            onClick={() => {
              navigateToQuestion(i)
              setIsMapOpen(false)
            }}
            className={cn(
              "relative aspect-square rounded-xl border flex items-center justify-center font-black text-[11px] transition-all duration-200",
              isActive 
                ? "border-indigo-400 bg-indigo-50/30 z-10 scale-105 shadow-sm" 
                : "border-slate-100 hover:border-indigo-200 bg-white",
              totalStats === 0 ? "text-slate-400" : "text-slate-700"
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 text-slate-900 font-sans overflow-hidden relative">
      {/* Animated Feedback Badge (Floating Toast at bottom) */}
      <AnimatePresence>
        {badgeVisible && selectedOption !== null && currentQuestion && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "fixed bottom-[136px] left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-2xl font-black text-[12px] uppercase tracking-[0.1em] shadow-xl flex items-center gap-3 backdrop-blur-md border whitespace-nowrap",
              currentQuestion.options[selectedOption].is_correct 
                ? "bg-emerald-500/90 text-white border-emerald-400/30 shadow-emerald-200/20" 
                : "bg-amber-400/90 text-slate-800 border-amber-300/30 shadow-amber-200/20"
            )}
          >
            {currentQuestion.options[selectedOption].is_correct ? (
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-white stroke-[4]" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/60 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-amber-700" />
              </div>
            )}
            {badgeMessage}
          </motion.div>
        )}
      </AnimatePresence>
      {/* XP Float Animation */}
      <AnimatePresence>
        {xpFloat.visible && (() => {
          const isLimitless = (activeGoal && activeGoal.done_today > activeGoal.daily_target) || (goalToast && goalToast.doneToday > goalToast.dailyTarget);
          return (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.5 }}
              animate={{ opacity: 1, y: -120, scale: isLimitless ? 1.4 : 1.2 }}
              exit={{ opacity: 0, y: -180, scale: 0.8 }}
              className={cn(
                "fixed bottom-32 left-1/2 -translate-x-1/2 z-[1001] px-6 py-3 rounded-2xl font-black text-base shadow-2xl pointer-events-none transition-all duration-300",
                isLimitless 
                  ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-amber-500/50 border border-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-bounce" 
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-300/50"
              )}
            >
              {isLimitless ? "⚡ OVERDRIVE +" : "+"}
              {xpFloat.amount} XP ✨
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Goal Milestone Toast */}
      <AnimatePresence>
        {goalToast && goalToast.visible && (() => {
          const isLimitless = goalToast.doneToday > goalToast.dailyTarget
          return (
            <motion.div
              initial={{ opacity: 0, x: 200, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 200, scale: 0.9 }}
              className={cn(
                "fixed top-24 right-6 z-[1002] max-w-sm w-82 backdrop-blur-xl rounded-[2rem] p-5 flex items-center gap-4 border transition-all duration-300",
                isLimitless 
                  ? "bg-slate-950/95 border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.15)] text-white" 
                  : "bg-white/95 border-slate-100 shadow-[0_20px_50px_rgba(99,102,241,0.15)] text-slate-900"
              )}
            >
              {/* Circular Progress Ring or Flame Icon */}
              <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
                {goalToast.justCompleted ? (
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-100 animate-bounce">
                    <Flame className="w-6 h-6 text-white fill-white" />
                  </div>
                ) : (
                  <>
                    <svg className="w-14 h-14 transform -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        className={isLimitless ? "stroke-slate-900" : "stroke-slate-100"}
                        strokeWidth="3.5"
                        fill="transparent"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        className={cn(
                          "transition-all duration-1000 ease-out",
                          isLimitless ? "stroke-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" : (goalToast.isTargetMet ? "stroke-emerald-500" : "stroke-indigo-600")
                        )}
                        strokeWidth="3.5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 22}
                        strokeDashoffset={2 * Math.PI * 22 * (1 - Math.min(1, goalToast.doneToday / goalToast.dailyTarget))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={cn(
                      "absolute text-[10px] font-black",
                      isLimitless ? "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" : "text-slate-700"
                    )}>
                      {isLimitless ? `⚡${goalToast.doneToday}` : `${goalToast.doneToday}/${goalToast.dailyTarget}`}
                    </span>
                  </>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn(
                    "text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md",
                    goalToast.justCompleted ? "bg-amber-100 text-amber-700" : 
                    isLimitless ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white animate-pulse border border-amber-400/35 shadow-lg shadow-amber-500/25 tracking-wider" :
                    "bg-indigo-50 text-indigo-600"
                  )}>
                    {goalToast.justCompleted ? "GOAL REACHED" : isLimitless ? "LIMITLESS MODE ⚡" : "DAILY GOAL"}
                  </span>
                  {goalToast.streakCount > 0 && (
                    <span className={cn(
                      "flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                      isLimitless ? "bg-amber-950 text-amber-300 border border-amber-500/20" : "bg-orange-50 text-orange-600"
                    )}>
                      🔥 {goalToast.streakCount}d
                    </span>
                  )}
                </div>
                <p className={cn(
                  "font-bold text-xs leading-relaxed pr-2",
                  isLimitless ? "text-amber-200 drop-shadow-[0_0_2px_rgba(245,158,11,0.2)]" : "text-slate-600"
                )}>
                  {goalToast.message}
                </p>
              </div>

              <button
                onClick={() => setGoalToast(prev => prev ? { ...prev, visible: false } : null)}
                className={cn(
                  "absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full transition-all",
                  isLimitless ? "hover:bg-slate-800 text-slate-500 hover:text-slate-300" : "hover:bg-slate-50 text-slate-400 hover:text-slate-600"
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Learning Mode Alert Toast */}
      <AnimatePresence>
        {learningModeAlert && learningModeAlert.visible && (
          <motion.div
            initial={{ opacity: 0, x: 200, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 200, scale: 0.9 }}
            className="fixed top-24 right-6 z-[1002] max-w-sm w-82 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-[0_20px_50px_rgba(99,102,241,0.15)] rounded-[2rem] p-5 flex items-start gap-4 text-slate-900 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">
                  SMART LEARNING
                </span>
              </div>
              <p className="font-bold text-xs leading-relaxed pr-2 text-slate-600">
                {learningModeAlert.message}
              </p>
            </div>

            <button
              onClick={() => setLearningModeAlert(prev => prev ? { ...prev, visible: false } : null)}
              className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 flex-shrink-0 z-[120] bg-white/90 backdrop-blur-2xl border-b border-slate-100/80 px-4 py-2.5 flex items-center justify-between shadow-[0_1px_20px_rgba(99,102,241,0.06)]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shadow-sm hover:bg-indigo-100 active:scale-90 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[11px] font-black text-slate-700 truncate max-w-[200px] md:max-w-md leading-tight">{session.title}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-black text-indigo-600">{initialTotalXP} XP</span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[8px] font-black shadow-sm shadow-indigo-200">
                 <span>+{sessionXP}</span>
              </div>
              {streak >= 2 && (
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-[8px] font-black shadow-sm shadow-orange-200">
                  <Flame className="w-3 h-3 fill-white" />
                  <span>{streak}🔥</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white shadow-md text-[11px] font-black transition-all",
            !showFeedback ? "bg-gradient-to-r from-slate-800 to-slate-900 shadow-slate-300" : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200"
          )}>
            <Timer className={cn("w-3.5 h-3.5", !showFeedback && "animate-pulse")} />
            <span>{timeLeft}s</span>
          </div>
          
          <AnimatePresence>
            {showFeedback && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={copyQuestionToClipboard}
                className="w-9 h-9 flex items-center justify-center bg-amber-50 border border-amber-100 rounded-xl text-amber-500 shadow-sm active:scale-90 transition-all hover:bg-amber-100"
                title="Copy question"
              >
                <Copy className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          <button 
            onClick={openEditModal}
            className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 shadow-sm active:scale-90 transition-all"
            title="Edit question"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsQuitModalOpen(true)}
            className="w-9 h-9 flex items-center justify-center bg-rose-50 border border-rose-200 rounded-xl text-rose-500 hover:bg-rose-100 shadow-sm active:scale-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex w-full max-w-none justify-center gap-4 lg:gap-8 px-2 lg:px-6 xl:px-10 md:py-6 py-2 overflow-hidden">
        <aside className="hidden xl:flex w-[340px] 2xl:w-[440px] flex-shrink-0 flex-col overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
          {showFeedback ? renderFeedbackArea(false) : (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-slate-50 flex items-center justify-center bg-white sticky top-0 z-10">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Answer to view analysis</span>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
                {/* Animated waiting indicator */}
                <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-white" />
                  <Lightbulb className="w-8 h-8 text-indigo-400 relative z-10" />
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-700 mb-1">Choose your answer</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">After answering, you will see detailed analysis and AI explanation here.</p>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-slate-100" />

                {/* Session Quick Stats */}
                <div className="w-full space-y-2">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Study Session Progress</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-lg font-black text-slate-700">{Object.keys(sessionAnswers).length}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Done</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <span className="text-lg font-black text-emerald-600">
                        {Object.entries(sessionAnswers).filter(([idx, optIdx]) => session.questions[Number(idx)]?.options[optIdx as number]?.is_correct).length}
                      </span>
                      <span className="text-[8px] font-bold text-emerald-400 uppercase">Correct</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-rose-50 rounded-2xl border border-rose-100">
                      <span className="text-lg font-black text-rose-600">
                        {Object.entries(sessionAnswers).filter(([idx, optIdx]) => !session.questions[Number(idx)]?.options[optIdx as number]?.is_correct).length}
                      </span>
                      <span className="text-[8px] font-bold text-rose-400 uppercase">Wrong</span>
                    </div>
                  </div>

                  {/* Progress bar with milestone markers */}
                  <div className="mt-1">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1.5">
                      <span>Q {currentIndex + 1} / {session.questions?.length}</span>
                      <span>{Math.round((Object.keys(sessionAnswers).length / (session.questions?.length || 1)) * 100)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((Object.keys(sessionAnswers).length / (session.questions?.length || 1)) * 100)}%` }}
                      />
                    </div>
                    {/* Milestone markers */}
                    <div className="flex justify-between mt-1">
                      {[25, 50, 75, 100].map(m => (
                        <span key={m} className={cn(
                          "text-[8px] font-black transition-all",
                          milestonesHit.has(m) ? "text-indigo-500" : "text-slate-300"
                        )}>{milestonesHit.has(m) ? (m === 25 ? '🎖' : m === 50 ? '🏆' : m === 75 ? '🌟' : '🎊') : `${m}%`}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-slate-100" />

                {/* Tip */}
                <div className="w-full p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100/60 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Learning Tip</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    {currentIndex % 3 === 0 
                      ? "Read the entire question carefully before selecting an answer. Subtle phrasing can make a big difference! 🎯"
                      : currentIndex % 3 === 1
                      ? "Eliminate obviously incorrect answers first to increase your chances. The POE method is highly effective! 💡"
                      : "Consecutive streaks help with long-term retention. Try to maintain your correct answers to activate long-term memory! 🔥"
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
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
              <div className="bg-white md:p-8 p-5 rounded-[2.5rem] border border-slate-100/80 shadow-2xl shadow-indigo-100/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                 {/* Question Stats Banner */}
                                   <div className="flex flex-wrap items-center justify-between gap-4 md:mb-8 mb-4">
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
                 {/* Community Difficulty Pill (before answering) + Post-answer Engagement Row */}
                 {!showFeedback && (currentQuestion?.stats?.total || 0) >= 5 && (() => {
                   const total = currentQuestion!.stats!.total
                   const correct = currentQuestion!.stats!.correct
                   const ratio = correct / total
                   const isHard = ratio < 0.45
                   const isEasy = ratio > 0.80
                   return (
                     <div className={cn(
                       "mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                       isHard ? "bg-rose-50 border-rose-200 text-rose-600" :
                       isEasy ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                       "bg-amber-50 border-amber-200 text-amber-600"
                     )}>
                       {isHard ? "⚠️ HARD" : isEasy ? "✅ EASY" : "📊 MODERATE"}
                       <span className="opacity-70 font-semibold normal-case tracking-normal">
                         — {Math.round(ratio * 100)}% answer correctly
                       </span>
                     </div>
                   )
                 })()}

                 {/* Post-answer engagement badges */}
                 {showFeedback && answerContext && (
                   <div className="mb-5 flex flex-wrap gap-2">
                     {/* Mastery Badge */}
                     {(() => {
                       const total = answerContext.prevTotal
                       const correct = answerContext.prevCorrect
                       if (total === 0) return (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-blue-100 text-blue-700 border border-blue-200">🆕 FIRST ATTEMPT</span>
                       )
                       const ratio = correct / total
                       if (ratio >= 0.8) return (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">⭐ MASTERED ({Math.round(ratio*100)}%)</span>
                       )
                       if (ratio >= 0.5) return (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-teal-100 text-teal-700 border border-teal-200">📈 GETTING STRONGER ({Math.round(ratio*100)}%)</span>
                       )
                       return (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">🔄 KEEP PRACTICING ({Math.round(ratio*100)}%)</span>
                       )
                     })()}

                     {/* Speed badge */}
                     {answerContext.avgTime > 0 && answerContext.timeTaken > 0 && (
                       answerContext.timeTaken < answerContext.avgTime * 0.8 ? (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200">
                           ⚡ FAST! {answerContext.timeTaken}s vs avg {answerContext.avgTime}s
                         </span>
                       ) : answerContext.timeTaken > answerContext.avgTime * 1.5 ? (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                           🐢 Careful thinker — {answerContext.timeTaken}s
                         </span>
                       ) : null
                     )}

                     {/* Streak badge */}
                     {answerContext.wasCorrect && answerContext.newStreak >= 3 && (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-orange-100 text-orange-700 border border-orange-200">
                         🔥 {answerContext.newStreak} STREAK
                       </span>
                     )}

                     {/* Daily Goal Badge */}
                      {activeGoal && (
                        activeGoal.done_today > activeGoal.daily_target ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-gradient-to-r from-amber-500 to-red-500 text-white border border-transparent shadow-md shadow-amber-200/50 animate-pulse">
                            ⚡ OVERDRIVE ({activeGoal.done_today}/{activeGoal.daily_target})
                          </span>
                        ) : activeGoal.is_target_met ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-emerald-500 text-white border border-emerald-400 shadow-md shadow-emerald-100/50 animate-pulse">
                            🎯 GOAL MET ({activeGoal.done_today}/{activeGoal.daily_target})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                            🎯 GOAL: {activeGoal.done_today}/{activeGoal.daily_target}
                          </span>
                        )
                      )}

                     {/* Deck Completion Speed Badge */}
                     {activeGoal && (
                       activeGoal.days_remaining_est > 0 ? (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-100">
                           🚀 COMPLETE IN {activeGoal.days_remaining_est} DAYS
                         </span>
                       ) : (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-100">
                           🎉 DECK MASTERED
                         </span>
                       )
                     )}
                   </div>
                 )}

                 {session.instruction && (
                    <div className="md:mb-6 mb-4 md:p-5 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 shadow-sm animate-in fade-in slide-in-from-top-2">
                       <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Global Instruction</span>
                       </div>
                       <p className="text-[13px] font-bold text-slate-600 italic leading-relaxed">{session.instruction}</p>
                    </div>
                 )}
                 {currentQuestion && (
                    <div className="mb-3 flex items-center gap-2 flex-wrap">
                      {getMasteryPill(currentQuestion.box_level || 1)}
                      {currentQuestion.stats && currentQuestion.stats.total > 0 && (
                        <span className="text-[10px] font-black tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 uppercase">
                          ({currentQuestion.stats.correct}/{currentQuestion.stats.total} correct)
                        </span>
                      )}
                    </div>
                  )}
                  <h2 className="text-xl md:text-2xl font-bold leading-snug text-slate-800 md:mb-8 mb-5 mt-1">{currentQuestion?.content}</h2>
                 
                 <div className="grid grid-cols-1 gap-3">
                    {currentQuestion?.options.map((opt, idx) => (
                      <button 
                        key={opt.id}
                        onClick={() => handleAnswer(idx)}
                        disabled={showFeedback}
                        className={cn(
                          "group md:p-5 p-4 rounded-2xl border-2 text-left transition-all duration-200 relative overflow-hidden active:scale-[0.99]",
                          selectedOption === idx 
                            ? (opt.is_correct 
                                ? "border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-lg shadow-emerald-100/50" 
                                : "border-rose-400 bg-gradient-to-r from-rose-50 to-pink-50 shadow-lg shadow-rose-100/50")
                            : (showFeedback && opt.is_correct 
                                ? "border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-lg shadow-emerald-100/50" 
                                : "border-slate-100 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-md hover:shadow-indigo-100/30")
                        )}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                           <div className={cn(
                             "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 transition-all duration-200",
                             selectedOption === idx 
                               ? (opt.is_correct 
                                   ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-200" 
                                   : "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md shadow-rose-200")
                               : (showFeedback && opt.is_correct 
                                   ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-200" 
                                   : "bg-slate-100 text-slate-500 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-purple-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-indigo-200")
                           )}>
                             {String.fromCharCode(65 + idx)}
                           </div>
                           <span className={cn(
                             "flex-1 font-semibold text-sm md:text-base leading-snug",
                             selectedOption === idx
                               ? (opt.is_correct ? "text-emerald-800" : "text-rose-800")
                               : (showFeedback && opt.is_correct ? "text-emerald-800" : "text-slate-700 group-hover:text-slate-900")
                           )}>{opt.content}</span>
                           {showFeedback && opt.is_correct && (
                             <div className="w-8 h-8 flex-shrink-0 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200">
                               <Check className="w-4 h-4 text-white stroke-[3]" />
                             </div>
                           )}
                           {showFeedback && selectedOption === idx && !opt.is_correct && (
                             <div className="w-8 h-8 flex-shrink-0 rounded-xl bg-rose-500 flex items-center justify-center shadow-md shadow-rose-200">
                               <X className="w-4 h-4 text-white stroke-[3]" />
                             </div>
                           )}
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
          <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col overflow-hidden">
            <h4 className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 flex-shrink-0">QUESTION MAP</h4>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">
               {renderSessionStats()}
               {renderQuestionMapGrid()}
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Controls - Fixed to bottom (same pattern as Layout bottom nav) */}
      <footer className="flex-shrink-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100/80 px-4 py-3 z-[120] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
        <div className="max-w-2xl mx-auto w-full flex items-center gap-3 h-13">
          <button onClick={() => setIsMapOpen(true)} className="lg:hidden w-12 h-12 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm active:scale-95 transition-all">
            <LayoutGrid className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setIsModeMenuOpen(true)} 
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm active:scale-95 transition-all"
            title="Change Smart Learning Mode"
          >
            {activeMode === 'sequential' && <ListOrdered className="w-5 h-5" />}
            {activeMode === 'random' && <Shuffle className="w-5 h-5" />}
            {activeMode === 'unseen' && <EyeOff className="w-5 h-5" />}
            {activeMode === 'review' && <AlertCircle className="w-5 h-5" />}
            {activeMode === 'hardest' && <TrendingUp className="w-5 h-5" />}
          </button>
          
          {showFeedback && (
            <button 
              onClick={() => setIsFeedbackOpen(true)} 
              className={`xl:hidden w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl shadow-sm active:scale-95 transition-all relative ${
                justAnswered 
                  ? 'bg-indigo-600 border border-indigo-600 text-white animate-[pulse_1.5s_infinite] ring-4 ring-indigo-300 ring-offset-1 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]' 
                  : 'bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100'
              }`}
              title="Xem giải thích và hướng dẫn"
            >
              <BookOpen className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>
          )}

          {!showFeedback ? (
            <button 
              disabled={selectedOption === null}
              className="flex-1 h-12 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-black text-xs rounded-2xl shadow-lg shadow-slate-300/40 uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              CONFIRM ANSWER
            </button>
          ) : (
            <button 
              onClick={handleNext}
              className="flex-1 h-12 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-300/50 flex items-center justify-center gap-2.5 uppercase tracking-widest active:scale-[0.98] transition-all hover:shadow-indigo-400/60 hover:shadow-xl"
            >
              NEXT QUESTION <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>

      {/* 💡 CHỒI LÊN BÊN DƯỚI - QUICK SWIPE-UP/CLICK HANDLE */}
      {justAnswered && !isFeedbackOpen && (
        <div 
          onClick={() => setIsFeedbackOpen(true)}
          className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg bg-gradient-to-r from-indigo-600/95 to-purple-600/95 text-white py-2.5 px-5 rounded-2xl shadow-[0_-8px_20px_rgba(99,102,241,0.25)] flex items-center justify-between cursor-pointer border border-indigo-400/20 backdrop-blur-md active:scale-98 transition-all hover:from-indigo-600 hover:to-purple-600 group select-none animate-[bounce_2s_infinite] xl:hidden"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black tracking-wide uppercase">💡 Xem hướng dẫn & Giải thích chi tiết</span>
          </div>
          <ChevronRight className="w-4 h-4 animate-[translate-x_1s_infinite] group-hover:translate-x-0.5 transition-transform opacity-85" />
        </div>
      )}
      {/* ✅ SESSION COMPLETE SUMMARY MODAL */}
      <AnimatePresence>
        {isSessionSummaryOpen && (() => {
          const answeredCount = Object.keys(sessionAnswers).length
          const correctCount = Object.entries(sessionAnswers).filter(([idx, optIdx]) =>
            session.questions[Number(idx)]?.options[optIdx as number]?.is_correct
          ).length
          const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
          const grade = accuracy >= 90 ? { label: 'S', color: 'from-yellow-400 to-amber-500', text: 'OUTSTANDING!' } :
                        accuracy >= 75 ? { label: 'A', color: 'from-emerald-400 to-teal-500', text: 'EXCELLENT!' } :
                        accuracy >= 60 ? { label: 'B', color: 'from-indigo-400 to-blue-500', text: 'WELL DONE!' } :
                        accuracy >= 45 ? { label: 'C', color: 'from-amber-400 to-orange-500', text: 'KEEP IT UP!' } :
                                         { label: 'D', color: 'from-rose-400 to-pink-500', text: 'KEEP PRACTICING!' }
          return (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
                onClick={() => setIsSessionSummaryOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.8, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 30 }} transition={{ type: 'spring', bounce: 0.35 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
                {/* Grade header */}
                <div className={`bg-gradient-to-br ${grade.color} p-8 flex flex-col items-center text-white`}>
                  <div className="text-[9px] font-black uppercase tracking-[0.4em] opacity-80 mb-2">SESSION COMPLETE</div>
                  <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-5xl font-black mb-3 border-2 border-white/30">
                    {grade.label}
                  </div>
                  <h2 className="text-xl font-black">{grade.text}</h2>
                  <p className="text-sm opacity-80 mt-1">{accuracy}% accuracy</p>
                </div>

                {/* Stats grid */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-slate-50 rounded-2xl">
                      <div className="text-2xl font-black text-slate-800">{answeredCount}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase">Answered</div>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-2xl">
                      <div className="text-2xl font-black text-emerald-600">{correctCount}</div>
                      <div className="text-[9px] font-black text-emerald-400 uppercase">Correct</div>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-2xl">
                      <div className="text-2xl font-black text-indigo-600">+{sessionXP}</div>
                      <div className="text-[9px] font-black text-indigo-400 uppercase">XP Earned</div>
                    </div>
                  </div>

                  {/* Milestones unlocked */}
                  {milestonesHit.size > 0 && (
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                      <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2">Milestones Unlocked</div>
                      <div className="flex gap-3">
                        {milestonesHit.has(25) && <span className="text-2xl" title="25%">🎖</span>}
                        {milestonesHit.has(50) && <span className="text-2xl" title="50%">🏆</span>}
                        {milestonesHit.has(75) && <span className="text-2xl" title="75%">🌟</span>}
                        {milestonesHit.has(100) && <span className="text-2xl" title="100%">🎊</span>}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setIsSessionSummaryOpen(false)}
                      className="py-3.5 bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all">
                      Keep Going
                    </button>
                    <button onClick={() => navigate(`/quiz/${id}`)}
                      className="py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all">
                      Finish &amp; Exit
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        })()}
      </AnimatePresence>

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
            <div className="flex items-center justify-center p-3 border-b border-slate-100 bg-white shadow-sm flex-shrink-0">
              <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.4em]">
                {activeFeedbackTab === 'insight' ? 'LEARNING INSIGHTS' : activeFeedbackTab === 'ai' ? 'AI DEEP ANALYSIS' : 'PERSONAL NOTES'}
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
               {renderFeedbackArea(true)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⚡ LIMITLESS MODE SCREEN FLASH OVERLAY */}
      <AnimatePresence>
        {isLimitlessStrike && (
          <div className="pointer-events-none fixed inset-0 z-[1999] border-[8px] border-amber-400/50 shadow-[inset_0_0_100px_rgba(245,158,11,0.4)] animate-pulse flex items-center justify-center">
            <motion.div 
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 tracking-widest drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] uppercase text-center"
            >
              ⚡ OVERDRIVE STRIKE! ⚡
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🏆 DAILY GOAL CELEBRATION MODAL */}
      <AnimatePresence>
        {showGoalCelebration && goalToast && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowGoalCelebration(false)
                confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl pointer-events-auto"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: 'spring', bounce: 0.35, duration: 0.6 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] p-8 shadow-[0_25px_60px_rgba(99,102,241,0.3)] border border-slate-100/80 overflow-hidden text-center z-10 pointer-events-auto"
            >
              {/* Top premium border indicator */}
              <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"></div>
              
              {/* Spinning/glowing light background aura */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 h-56 bg-gradient-to-tr from-amber-200/20 to-orange-200/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
              
              {/* Giant Bouncing Trophy Icon */}
              <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-[2.5rem] rotate-12 scale-95 opacity-20 animate-pulse" />
                <div className="relative w-24 h-24 bg-gradient-to-tr from-amber-400 via-orange-500 to-red-500 rounded-[2rem] flex items-center justify-center shadow-lg shadow-orange-300 transform hover:scale-105 transition-all">
                  <Trophy className="w-12 h-12 text-white fill-white animate-bounce" />
                </div>
              </div>
              
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-4 py-1.5 rounded-full uppercase tracking-[0.2em] mb-4 inline-block shadow-sm">
                Daily Goal Achieved! 🏆
              </span>
              
              <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight mb-3">
                SUPER STUDY DISCIPLINE!
              </h3>
              
              <p className="text-slate-500 font-bold text-xs leading-relaxed mb-8 px-4">
                {goalToast.message}
              </p>
              
              {/* Rewards Summary Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-white border border-indigo-100/50 rounded-3xl p-5 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">BONUS REWARD</span>
                  <span className="text-xl font-black text-indigo-600">⚡ +{goalToast.bonusXP || 50} XP</span>
                </div>
                <div className="bg-gradient-to-br from-orange-50/50 via-amber-50/30 to-white border border-orange-100/50 rounded-3xl p-5 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1.5">DAILY STREAK</span>
                  <span className="text-xl font-black text-orange-600">🔥 {goalToast.streakCount}d</span>
                </div>
              </div>
              
              {/* High Motivation Action Button */}
              <button 
                onClick={() => {
                  setShowGoalCelebration(false)
                  confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-200 hover:shadow-orange-300 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                AWESOME, KEEP GOING! 🚀
              </button>
            </motion.div>
          </div>
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
                
                <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">End Study Session?</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">Exiting now will clear the current state of this study session. Are you sure you want to exit?</p>
                
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => setIsQuitModalOpen(false)}
                    className="py-4 bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
                  >
                    KEEP STUDYING
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
                    CONFIRM EXIT
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Edit Question Modal */}
      <AnimatePresence>
        {isEditModalOpen && editFormData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsEditModalOpen(false)}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
             >
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                     <Edit3 className="w-5 h-5 text-indigo-600" />
                     EDIT QUESTION #{currentIndex + 1}
                   </h2>
                   <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                      <X className="w-5 h-5 text-slate-400" />
                   </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                   {/* Content */}
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">QUESTION CONTENT</label>
                      <textarea 
                        value={editFormData.content}
                        onChange={(e) => setEditFormData({...editFormData, content: e.target.value})}
                        className="w-full h-24 p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none"
                      />
                   </div>
                   
                   {/* Options */}
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OPTIONS</label>
                      <div className="grid grid-cols-1 gap-2">
                        {editFormData.options.map((opt: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 group">
                             <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-lg font-black text-[10px] text-slate-400 group-focus-within:bg-indigo-600 group-focus-within:text-white transition-all">
                               {String.fromCharCode(65 + idx)}
                             </div>
                             <input 
                               value={opt.content}
                               onChange={(e) => {
                                 const newOpts = [...editFormData.options]
                                 newOpts[idx].content = e.target.value
                                 setEditFormData({...editFormData, options: newOpts})
                               }}
                               className="flex-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700"
                             />
                             <button 
                               onClick={() => {
                                 const newOpts = editFormData.options.map((o: any, i: number) => ({...o, is_correct: i === idx}))
                                 setEditFormData({...editFormData, options: newOpts})
                               }}
                               className={cn(
                                 "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                 opt.is_correct ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100" : "bg-slate-100 text-slate-300 hover:bg-emerald-50 hover:text-emerald-500"
                               )}
                             >
                               <Check className="w-4 h-4 stroke-[3]" />
                             </button>
                          </div>
                        ))}
                      </div>
                   </div>
                   
                   {/* Insights */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">INSIGHT (EXPLANATION)</label>
                        <textarea 
                          value={editFormData.explanation}
                          onChange={(e) => setEditFormData({...editFormData, explanation: e.target.value})}
                          className="w-full h-32 p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          AI DEEP ANALYSIS
                        </label>
                        <textarea 
                          value={editFormData.ai_explanation}
                          onChange={(e) => setEditFormData({...editFormData, ai_explanation: e.target.value})}
                          className="w-full h-32 p-4 bg-indigo-50/50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 transition-all resize-none text-xs"
                        />
                      </div>
                   </div>
                </div>
                
                <div className="p-8 border-t border-slate-100 flex items-center justify-end gap-4 bg-slate-50/50">
                   <button 
                     onClick={() => setIsEditModalOpen(false)}
                     className="px-6 py-3 text-sm font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
                   >
                     CANCEL
                   </button>
                   <button 
                     onClick={handleSaveEdit}
                     disabled={isSavingEdit}
                     className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                   >
                     {isSavingEdit ? 'SAVING...' : 'SAVE CHANGES'}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚙️ SMART LEARNING MODE MODAL */}
      <AnimatePresence>
        {isModeMenuOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModeMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md pointer-events-auto"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-6 shadow-[0_25px_60px_rgba(99,102,241,0.25)] border border-slate-100 overflow-hidden z-[1010] pointer-events-auto"
            >
              {/* Top premium border indicator */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Smart Learning Modes</h3>
                </div>
                <button 
                  onClick={() => setIsModeMenuOpen(false)} 
                  className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 active:scale-95 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Description */}
              <p className="text-slate-500 font-bold text-xs leading-relaxed mb-5">
                Customize how QuizMind serves the next question. Choose a pathway that matches your active study goals.
              </p>
              
              {/* Mode Options List */}
              <div className="space-y-2.5 mb-6">
                {[
                  {
                    id: 'sequential',
                    name: 'Sequential Order',
                    desc: 'Follow deck natural sequence from first to last question.',
                    icon: ListOrdered,
                    color: 'from-blue-500 to-indigo-500',
                    bg: 'bg-blue-50/50 border-blue-100'
                  },
                  {
                    id: 'random',
                    name: 'Shuffle Mode',
                    desc: 'Serve questions in a completely randomized, unexpected order.',
                    icon: Shuffle,
                    color: 'from-purple-500 to-indigo-500',
                    bg: 'bg-purple-50/50 border-purple-100'
                  },
                  {
                    id: 'unseen',
                    name: 'New Cards First',
                    desc: 'Prioritize questions you have never attempted in this deck.',
                    icon: EyeOff,
                    color: 'from-teal-500 to-emerald-500',
                    bg: 'bg-teal-50/50 border-teal-100'
                  },
                  {
                    id: 'review',
                    name: 'Mistakes First',
                    desc: 'Focus on review cards you answered incorrectly in prior attempts.',
                    icon: AlertCircle,
                    color: 'from-amber-500 to-red-500',
                    bg: 'bg-amber-50/50 border-amber-100'
                  },
                  {
                    id: 'hardest',
                    name: 'Hardest First (SRS)',
                    desc: 'Prioritize questions with the lowest accuracy ratio first.',
                    icon: TrendingUp,
                    color: 'from-rose-500 to-pink-500',
                    bg: 'bg-rose-50/50 border-rose-100'
                  }
                ].map((m) => {
                  const Icon = m.icon
                  const isSelected = activeMode === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        applyLearningMode(m.id)
                      }}
                      className={cn(
                        "w-full p-4 rounded-2xl border-2 text-left flex items-start gap-4 transition-all duration-200 active:scale-[0.99]",
                        isSelected 
                          ? "border-indigo-500 bg-indigo-50/20 shadow-md shadow-indigo-100/50" 
                          : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/30"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br shadow-md flex-shrink-0",
                        m.color
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-sm text-slate-800">{m.name}</span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-200">
                              <Check className="w-3 h-3 text-white stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 leading-relaxed block">{m.desc}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              
              <button 
                onClick={() => setIsModeMenuOpen(false)}
                className="w-full py-3.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-slate-300 active:scale-95 transition-all hover:bg-slate-800"
              >
                APPLY & CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Card Mastery Level Up Toast */}
      <AnimatePresence>
        {activeMasteryUpgrade && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed bottom-24 left-6 z-[1002] max-w-sm backdrop-blur-xl rounded-[2rem] p-5 flex items-center gap-4 border bg-gradient-to-r from-emerald-500/95 to-teal-600/95 border-emerald-400/60 text-white shadow-[0_20px_50px_rgba(16,185,129,0.35)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md bg-white/20 text-white mb-1 inline-block">
                CARD UPGRADED! ⚡
              </span>
              <h4 className="font-black text-sm text-white">Mastery Level Increased!</h4>
              <p className="text-[11px] text-emerald-100/90 font-bold mt-0.5">
                Box {activeMasteryUpgrade.old_level} → Box {activeMasteryUpgrade.new_level} (Consecutive Correct 🎉)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Achievement Celebration Overlay */}
      <AnimatePresence>
        {activeUnlockedBadge && (() => {
          const BadgeIcon = getBadgeIcon(activeUnlockedBadge.id)
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            >
              {/* Radial glow background effect */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_60%)] animate-pulse pointer-events-none" />

              <motion.div
                initial={{ scale: 0.9, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 50 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative max-w-md w-full bg-slate-900/95 border border-violet-500/30 rounded-[3rem] p-8 text-center shadow-[0_0_80px_rgba(139,92,246,0.35)] overflow-hidden"
              >
                {/* Background neon splashes */}
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Sparkling particles background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4))] pointer-events-none" />

                {/* Close Button */}
                <button
                  onClick={() => setActiveUnlockedBadge(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Animated Badge Hexagon Glow container */}
                <div className="relative mx-auto w-32 h-32 flex items-center justify-center mb-6 mt-4">
                  {/* Hexagon Neon Ring */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-pink-500 rounded-[2.5rem] rotate-45 opacity-20 blur-md animate-pulse" />
                  <div className="absolute inset-2 bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-pink-600 rounded-[2rem] rotate-12 animate-spin-slow" />
                  
                  {/* Frosted Icon Shield */}
                  <div className="relative w-20 h-20 rounded-2xl bg-slate-950/60 border border-white/15 flex items-center justify-center shadow-2xl backdrop-blur-md">
                    <BadgeIcon className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-tr from-violet-400 via-fuchsia-400 to-pink-400" />
                  </div>
                </div>

                <span className="text-[10px] font-black tracking-[0.3em] text-violet-400 uppercase bg-violet-500/10 px-4 py-1.5 rounded-full border border-violet-500/20 mb-2 inline-block">
                  ACHIEVEMENT UNLOCKED
                </span>

                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3 uppercase bg-gradient-to-tr from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]">
                  {activeUnlockedBadge.name}
                </h2>

                <p className="text-slate-400 text-sm font-bold leading-relaxed mb-6 px-4">
                  {activeUnlockedBadge.description}
                </p>

                {/* Reward stats display */}
                <div className="flex items-center justify-center gap-4 mb-8 bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                  <div className="text-center flex-1 border-r border-white/5">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 block uppercase mb-1">XP REWARD</span>
                    <span className="text-lg font-black text-amber-400">+{activeUnlockedBadge.xp_reward} XP ✨</span>
                  </div>
                  <div className="text-center flex-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 block uppercase mb-1">BONUS REWARD</span>
                    <span className="text-lg font-black text-violet-400">🏅 BADGE</span>
                  </div>
                </div>

                {/* Manual Dismiss CTA */}
                <button
                  onClick={() => setActiveUnlockedBadge(null)}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white shadow-lg shadow-violet-600/35 hover:shadow-violet-600/50 hover:brightness-110 active:scale-[0.98] transition-all duration-200"
                >
                  AWESOME, CLAIM IT! 🏆
                </button>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
