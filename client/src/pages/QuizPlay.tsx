import { useState, useEffect, useRef, useMemo } from 'react'
import confetti from 'canvas-confetti'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutGrid, Timer, Flame, Trophy, Check, X, Sparkles, Lightbulb, StickyNote, Play, Target, CheckCircle2, XCircle, Clock, BookOpen, Hash, Copy, Edit3, Brain, FileText, HelpCircle, Sliders, ListOrdered, Shuffle, EyeOff, Eye, AlertCircle, TrendingUp, Award, Volume2, VolumeX, Compass, Flag, Headphones, CheckCircle, RotateCcw, AlertTriangle, Send, BarChart2, MessageSquare, Heart, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useRoadmapStatus } from '@/hooks/useRoadmapStatus'
import { RoadmapHeaderTracker } from '@/components/RoadmapHeaderTracker'
import { PlaySettingsModal } from '@/components/PlaySettingsModal'

interface Option {
  id: number
  content: string
  is_correct: boolean
}

const playCorrectSound = () => {
  try {
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/correct.mp3`);
    audio.volume = 0.4;
    audio.play().catch(e => console.log("SFX autoplay blocked:", e));
  } catch (e) {
    console.error("Audio SFX failed:", e);
  }
};

const playIncorrectSound = () => {
  try {
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/incorrect.mp3`);
    audio.volume = 0.4;
    audio.play().catch(e => console.log("SFX autoplay blocked:", e));
  } catch (e) {
    console.error("Audio SFX failed:", e);
  }
};

interface QuestionGroup {
  id: number
  group_code: string
  title?: string
  passage_content?: string
  audio_url?: string
  image_url?: string
  order_index: number
}

interface Question {
  id: number
  content: string
  explanation: string
  ai_explanation?: string
  options: Option[]
  stats?: { total: number, correct: number, avg_time: number }
  box_level?: number
  is_ignored?: boolean
  group_id?: number
  group_code?: string
  order_in_group?: number
  allow_shuffle?: boolean
  audio_url?: string
  image_url?: string
  others?: Record<string, any>
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
  const { user, setUser, setGamify, userSettings, updateUserSettings } = useAppStore()
  const [session, setSession] = useState<any>(null)
  const { status: roadmapStatus } = useRoadmapStatus(id)
  const [timeMode, setTimeMode] = useState<'card' | 'today' | 'all'>('card')
  const [scoreMode, setScoreMode] = useState<'all' | 'today'>('today')
  const sessionStudyTimeRef = useRef<number>(0)
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(userSettings?.sfx_enabled ?? true);
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
  const [selectedInsightField, setSelectedInsightField] = useState<string>('explanation')
  const [aiInput, setAiInput] = useState('')
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false)
  const [activeFeedbackTab, setActiveFeedbackTab] = useState<'insight' | 'ai' | 'note' | 'community'>('insight')
  const [contributions, setContributions] = useState<any[]>([])
  const [isFetchingContributions, setIsFetchingContributions] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [contributionType, setContributionType] = useState<'comment' | 'correction'>('comment')
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null)
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({})

  const activeBottomTab: 'map' | 'question' | 'stats' = isStatsOpen ? 'stats' : (isMapOpen ? 'map' : 'question')
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
  const [activeMode, setActiveMode] = useState<string>(userSettings?.quiz_learning_mode || 'sequential')
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const isModeMenuOpen = isSettingsModalOpen
  const setIsModeMenuOpen = setIsSettingsModalOpen

  const getQuestionFontSize = (size?: string) => {
    switch (size) {
      case '85%': return 'text-lg md:text-xl'
      case '115%': return 'text-2xl md:text-3xl'
      case '130%': return 'text-3xl md:text-4xl'
      default: return 'text-xl md:text-2xl'
    }
  }

  const getOptionFontSize = (size?: string) => {
    switch (size) {
      case '85%': return 'text-xs md:text-sm'
      case '115%': return 'text-base md:text-lg'
      case '130%': return 'text-lg md:text-xl'
      default: return 'text-sm md:text-base'
    }
  }
  const [learningModeAlert, setLearningModeAlert] = useState<{
    visible: boolean;
    message: string;
    type?: 'info' | 'warning';
  } | null>(null)
  const [justAnswered, setJustAnswered] = useState(false)

  const [searchParams] = useSearchParams()
  const isExamMode = searchParams.get('mode') === 'exam' || searchParams.get('mode') === 'mock'

  // ── Exam Mode State ──
  const [examAnswers, setExamAnswers] = useState<Record<number, number>>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false)
  const [isSubmittingExam, setIsSubmittingExam] = useState(false)
  const [isExamSubmitted, setIsExamSubmitted] = useState(false)
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [examResults, setExamResults] = useState<any>(null)
  const [examTimeLeft, setExamTimeLeft] = useState<number | null>(null)
  const [examTimeSpent, setExamTimeSpent] = useState<number>(0)
  const [isPassageDrawerOpen, setIsPassageDrawerOpen] = useState(false)

  const timerRef = useRef<any>(null)
  const autoAdvanceTimerRef = useRef<any>(null)
  const currentQuestion: Question | null = session?.questions?.[currentIndex] || null

  // ── Grouped Question Resolution ──
  const currentGroup = session?.groups?.find((g: any) => g.id === currentQuestion?.group_id)
  const groupQuestions = currentQuestion?.group_id
    ? (session?.questions?.filter((q: any) => q.group_id === currentQuestion.group_id) || [])
    : []
  const questionIndexInGroup = currentQuestion?.group_id
    ? groupQuestions.findIndex((q: any) => q.id === currentQuestion.id) + 1
    : 0

  // ── Custom Columns & Learning Insight Fields ──
  const insightFields = useMemo(() => {
    const list: { key: string; label: string; hasContent: boolean }[] = [
      {
        key: 'explanation',
        label: 'Main Explanation',
        hasContent: !!(currentQuestion?.explanation && currentQuestion.explanation.trim())
      }
    ]

    const configuredCols: string[] = Array.isArray(session?.practice_settings?.insight_columns)
      ? session.practice_settings.insight_columns
      : []

    const keysOnQuestion = currentQuestion?.others && typeof currentQuestion.others === 'object'
      ? Object.keys(currentQuestion.others)
      : []

    const allKeys = Array.from(new Set([...configuredCols, ...keysOnQuestion]))

    for (const k of allKeys) {
      if (['explanation', 'ai_explanation', 'content', 'image', 'audio', 'options', 'id', 'item_id'].includes(k)) continue
      const val = currentQuestion?.others?.[k]
      const hasContent = val !== undefined && val !== null && String(val).trim() !== ''
      const label = k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      list.push({ key: k, label, hasContent })
    }

    return list
  }, [session?.practice_settings, currentQuestion])

  const getSelectedInsightContent = (): string => {
    if (!currentQuestion) return ''
    if (selectedInsightField === 'explanation') {
      return currentQuestion.explanation || ''
    }
    const val = currentQuestion.others?.[selectedInsightField]
    return val !== undefined && val !== null ? String(val) : ''
  }

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
  }, [id])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        // Only increment if feedback is NOT shown
        if (showFeedback) return prev
        return prev + 1
      })
    }, 1000)
    return () => {
      clearInterval(timerRef.current)
    }
  }, [showFeedback])

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current)
        autoAdvanceTimerRef.current = null
      }
    }
  }, [])

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
      setIsEditingInsight(false)
      setSelectedInsightField('explanation')

      // Autoplay Question Audio if enabled
      if (userSettings?.autoplay_audio === 'question' || userSettings?.autoplay_audio === 'always') {
        const audioSrc = currentQuestion.audio_url || currentGroup?.audio_url
        if (audioSrc) {
          try {
            const aud = new Audio(audioSrc)
            aud.play().catch(e => console.log("Autoplay audio blocked:", e))
          } catch (e) {}
        }
      }
    }
  }, [currentIndex, currentQuestion])

  // Tự động đóng toàn bộ các popup/toast khi người dùng click mở bất kỳ khung thông tin hoặc modal phụ nào
  useEffect(() => {
    if (isFeedbackOpen || isMapOpen || isEditModalOpen || isQuitModalOpen || isSessionSummaryOpen || isSettingsModalOpen) {
      setGoalToast(prev => prev ? { ...prev, visible: false } : null)
      setShowGoalCelebration(false)
      setBadgeVisible(false)
      setActiveUnlockedBadge(null)
      setActiveMasteryUpgrade(null)
      setLearningModeAlert(null)
    }
  }, [isFeedbackOpen, isMapOpen, isEditModalOpen, isQuitModalOpen, isSessionSummaryOpen, isSettingsModalOpen])

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
      let questions = quizRes.data.questions || []

      const searchParams = new URLSearchParams(window.location.search)
      const urlMode = searchParams.get('mode')
      const urlScope = searchParams.get('scope')
      const urlCount = searchParams.get('count')

      // 1. Group map for preserving passage/audio group integrity
      const groupsMap: Record<string, any[]> = {}
      questions.forEach((q: any) => {
        if (q.group_id) {
          if (!groupsMap[q.group_id]) groupsMap[q.group_id] = []
          groupsMap[q.group_id].push(q)
        }
      })
      Object.values(groupsMap).forEach(arr => arr.sort((a, b) => (a.order_in_group || 0) - (b.order_in_group || 0)))

      // 2. Classify questions: New vs Review
      const newQuestions = questions.filter((q: any) => (!q.stats || (q.stats.total || 0) === 0) && !q.is_ignored)
      const reviewQuestions = questions.filter((q: any) => (q.stats && (q.stats.total || 0) > 0) && !q.is_ignored)
      // Sort review questions by weakness (lowest accuracy / highest wrong count first)
      reviewQuestions.sort((a: any, b: any) => {
        const aTotal = a.stats?.total || 1
        const bTotal = b.stats?.total || 1
        const aAcc = (a.stats?.correct || 0) / aTotal
        const bAcc = (b.stats?.correct || 0) / bTotal
        if (aAcc !== bAcc) return aAcc - bAcc
        return (b.stats?.wrong || 0) - (a.stats?.wrong || 0)
      })

      let selectedQuestions: any[] = questions

      if (urlScope === 'new' || urlMode === 'new' || urlMode === 'unseen') {
        if (newQuestions.length > 0) {
          selectedQuestions = newQuestions
        }
      } else if (urlScope === 'review' || urlMode === 'missed' || urlMode === 'review') {
        if (reviewQuestions.length > 0) {
          selectedQuestions = reviewQuestions
        }
      } else if (urlScope === 'mix' || (!urlScope && (urlMode === 'practice' || !urlMode))) {
        // Smart Mix: Interleave 1 new and 1 review, preserving group clusters
        const interleaved: any[] = []
        const maxLen = Math.max(newQuestions.length, reviewQuestions.length)
        for (let i = 0; i < maxLen; i++) {
          if (i < newQuestions.length) interleaved.push(newQuestions[i])
          if (i < reviewQuestions.length) interleaved.push(reviewQuestions[i])
        }
        if (interleaved.length > 0) {
          // Re-cluster groups so questions with the same group_id stay together in sequence
          const seenGroups = new Set<string>()
          const clustered: any[] = []
          interleaved.forEach((q: any) => {
            if (q.group_id) {
              if (!seenGroups.has(q.group_id)) {
                seenGroups.add(q.group_id)
                if (groupsMap[q.group_id]) {
                  clustered.push(...groupsMap[q.group_id])
                }
              }
            } else {
              clustered.push(q)
            }
          })
          selectedQuestions = clustered
        }
      } else if (urlMode === 'random') {
        // Group-aware random shuffle
        const standalones = questions.filter((q: any) => !q.group_id)
        const units: any[][] = [...Object.values(groupsMap), ...standalones.map((q: any) => [q])]
        const shuffledUnits = units.sort(() => Math.random() - 0.5)
        selectedQuestions = shuffledUnits.flat()
      }

      // 3. Apply question count quota
      if (urlCount && urlCount !== 'all') {
        const targetCount = parseInt(urlCount, 10)
        if (targetCount > 0 && targetCount < selectedQuestions.length) {
          let sliced = selectedQuestions.slice(0, targetCount)
          // If the last question belongs to a group, ensure all questions of that group are included
          const lastQ = sliced[sliced.length - 1]
          if (lastQ && lastQ.group_id && groupsMap[lastQ.group_id]) {
            const fullGroup = groupsMap[lastQ.group_id]
            const existingIds = new Set(sliced.map((x: any) => x.id))
            fullGroup.forEach((gq: any) => {
              if (!existingIds.has(gq.id)) {
                sliced.push(gq)
                existingIds.add(gq.id)
              }
            })
          }
          questions = sliced
        } else {
          questions = selectedQuestions
        }
      } else {
        questions = selectedQuestions
      }

      if (urlMode === 'exam' || urlMode === 'mock') {
        if (quizRes.data.time_limit && quizRes.data.time_limit > 0) {
          setExamTimeLeft(quizRes.data.time_limit * 60)
        } else {
          setExamTimeLeft(null)
        }
      }

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
      
      // Dynamic Realtime Queue Initialization
      let curIdx = 0
      if (urlMode === 'roadmap') {
        const unseenIdx = questions.findIndex((q: any) => (q.stats?.total || 0) === 0 && !q.is_ignored)
        if (unseenIdx !== -1) curIdx = unseenIdx
      }
      setCurrentIndex(curIdx)
      setSelectedOption(null)
      setShowFeedback(false)
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

  const fetchContributions = async () => {
    if (!currentQuestion?.id) return
    setIsFetchingContributions(true)
    try {
      const res = await axios.get(`/api/v1/quiz/question/${currentQuestion.id}/contributions`)
      setContributions(res.data || [])
    } catch (e) {
      console.error("Failed to fetch contributions:", e)
    } finally {
      setIsFetchingContributions(false)
    }
  }

  useEffect(() => {
    if (activeFeedbackTab === 'community' && currentQuestion?.id) {
      fetchContributions()
    }
  }, [activeFeedbackTab, currentQuestion?.id])

  const handleLikeContribution = async (contribId: number) => {
    try {
      const res = await axios.post(`/api/v1/quiz/contributions/${contribId}/like`)
      const data = res.data
      const updateList = (list: any[]): any[] => {
        return list.map(c => {
          if (c.id === contribId) {
            return { ...c, is_liked_by_me: data.liked, likes_count: data.likes_count }
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateList(c.replies) }
          }
          return c
        })
      }
      setContributions(prev => updateList(prev))
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim() || !currentQuestion?.id) return
    try {
      await axios.post(`/api/v1/quiz/question/${currentQuestion.id}/contributions`, {
        content: commentInput.trim(),
        type: contributionType
      })
      setCommentInput('')
      fetchContributions()
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddReply = async (parentId: number) => {
    const text = (replyInputs[parentId] || '').trim()
    if (!text || !currentQuestion?.id) return
    try {
      await axios.post(`/api/v1/quiz/question/${currentQuestion.id}/contributions`, {
        content: text,
        type: 'comment',
        parent_id: parentId
      })
      setReplyInputs(prev => ({ ...prev, [parentId]: '' }))
      setActiveReplyId(null)
      fetchContributions()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteContribution = async (contribId: number) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return
    try {
      await axios.delete(`/api/v1/quiz/contributions/${contribId}`)
      fetchContributions()
    } catch (e) {
      console.error(e)
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
      if (sfxEnabled) playCorrectSound()
      if (userSettings?.haptic_enabled !== false && navigator.vibrate) {
        navigator.vibrate(15)
      }
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
      if (sfxEnabled) playIncorrectSound()
      if (userSettings?.haptic_enabled !== false && navigator.vibrate) {
        navigator.vibrate([25, 40, 25])
      }
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
    setTimeout(() => setBadgeVisible(false), 2000)

    // Auto-Advance if enabled (off, 1s, 2s, 3s)
    const rawAutoSetting = userSettings?.auto_advance
    const autoSec = (rawAutoSetting === '1s' || rawAutoSetting === '1') ? 1
      : (rawAutoSetting === '2s' || rawAutoSetting === '2') ? 2
      : (rawAutoSetting === '3s' || rawAutoSetting === '3') ? 3
      : 0

    if (autoSec > 0) {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current)
      }
      autoAdvanceTimerRef.current = setTimeout(() => {
        handleNext()
      }, autoSec * 1000)
    }

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
      }
    } catch (e) {
      console.error("Failed to record answer")
    }
  }

  const navigateToQuestion = (idx: number) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
    setCurrentIndex(idx)
    setJustAnswered(false)

    // Đóng toàn bộ các popup, toast, thông báo thành tựu khi chuyển sang câu mới
    setGoalToast(prev => prev ? { ...prev, visible: false } : null)
    setShowGoalCelebration(false)
    setBadgeVisible(false)
    setActiveUnlockedBadge(null)
    setActiveMasteryUpgrade(null)
    setLearningModeAlert(null)

    if (isExamMode) {
      if (isReviewMode && examResults?.detailed_results) {
        const detail = examResults.detailed_results.find((d: any) => d.question_id === session?.questions?.[idx]?.id)
        if (detail) {
          const optIdx = session?.questions?.[idx]?.options?.findIndex((o: any) => o.id === detail.selected_option_id)
          setSelectedOption(optIdx !== -1 && optIdx !== undefined ? optIdx : null)
          setShowFeedback(true)
        }
      }
      return
    }

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

  const handleExamSelectOption = (optIdx: number) => {
    if (isExamSubmitted && !isReviewMode) return
    if (isReviewMode) return
    setExamAnswers(prev => ({
      ...prev,
      [currentIndex]: optIdx
    }))
  }

  const toggleFlagQuestion = (idx: number = currentIndex) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleSubmitExam = async (isAuto: boolean = false) => {
    if (!session || isSubmittingExam) return
    setIsSubmittingExam(true)
    try {
      const formattedAnswers = Object.entries(examAnswers).map(([qIdx, optIdx]) => {
        const q = session.questions[Number(qIdx)]
        const opt = q?.options?.[optIdx]
        return {
          question_id: q?.id,
          option_id: opt?.id
        }
      })

      const res = await axios.post(`/api/v1/quiz/${id}/exam/submit`, {
        answers: formattedAnswers,
        time_spent: examTimeSpent
      })

      setExamResults(res.data)
      setIsExamSubmitted(true)
      setIsSubmitConfirmOpen(false)

      if (res.data.accuracy_pct >= 50) {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6']
        })
      }
    } catch (err) {
      console.error("Failed to submit exam:", err)
      alert("Error submitting exam. Please check your connection and try again.")
    } finally {
      setIsSubmittingExam(false)
    }
  }

  const handleRetakeExam = () => {
    setExamAnswers({})
    setFlaggedQuestions(new Set())
    setIsExamSubmitted(false)
    setIsReviewMode(false)
    setExamResults(null)
    setExamTimeSpent(0)
    if (session?.time_limit && session?.time_limit > 0) {
      setExamTimeLeft(session.time_limit * 60)
    } else {
      setExamTimeLeft(null)
    }
    setCurrentIndex(0)
  }

  const handleNext = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
    if (!session || !session.questions) return

    const questions = session.questions
    const total = questions.length

    // Fallback function to find the first unanswered question index in this session
    const getFirstUnanswered = () => {
      for (let i = 0; i < total; i++) {
        if (sessionAnswers[i] === undefined && !questions[i].is_ignored) return i
      }
      return -1
    }

    let nextIdx = -1

    if (activeMode === 'sequential') {
      for (let i = currentIndex + 1; i < total; i++) {
        if (!questions[i].is_ignored) {
          nextIdx = i
          break
        }
      }
    } else if (activeMode === 'random') {
      // Find a random index not answered in THIS session
      const pool = questions.map((_: any, i: number) => i).filter((i: number) => sessionAnswers[i] === undefined && !questions[i].is_ignored)
      if (pool.length > 0) {
        nextIdx = pool[Math.floor(Math.random() * pool.length)]
      }
    } else if (activeMode === 'unseen') {
      // Find next question with 0 historical attempts and not answered in THIS session
      nextIdx = questions.findIndex((q: any, i: number) => 
        i > currentIndex && 
        (q.stats?.total || 0) === 0 && 
        sessionAnswers[i] === undefined &&
        !q.is_ignored
      )
      if (nextIdx === -1) {
        // Loop back to find any unseen
        nextIdx = questions.findIndex((q: any, i: number) => 
          (q.stats?.total || 0) === 0 && 
          sessionAnswers[i] === undefined &&
          !q.is_ignored
        )
      }
    } else if (activeMode === 'review') {
      // Find next question with historical mistakes (total - correct > 0) and not answered in THIS session
      nextIdx = questions.findIndex((q: any, i: number) => 
        i > currentIndex && 
        ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 && 
        sessionAnswers[i] === undefined &&
        !q.is_ignored
      )
      if (nextIdx === -1) {
        // Loop back to find any mistake question not answered in THIS session
        nextIdx = questions.findIndex((q: any, i: number) => 
          ((q.stats?.total || 0) - (q.stats?.correct || 0)) > 0 && 
          sessionAnswers[i] === undefined &&
          !q.is_ignored
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
        if (q.is_ignored) continue
        
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
      for (let i = currentIndex + 1; i < total; i++) {
        if (!questions[i].is_ignored) {
          nextIdx = i
          break
        }
      }
    }
    if (nextIdx === -1) {
      nextIdx = Math.min(currentIndex + 1, total - 1)
    }

    navigateToQuestion(nextIdx)
  }

  const applyLearningMode = (mode: string) => {
    setActiveMode(mode)
    updateUserSettings({ quiz_learning_mode: mode })
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
      if (selectedInsightField === 'explanation') {
        await axios.patch(`/api/v1/quiz/question/${currentQuestion.id}`, { 
          explanation: insightInput 
        })
        setSession((prev: any) => {
          const newQs = [...prev.questions]
          newQs[currentIndex] = { ...newQs[currentIndex], explanation: insightInput }
          return { ...prev, questions: newQs }
        })
      } else {
        const updatedOthers = { ...(currentQuestion.others || {}), [selectedInsightField]: insightInput }
        await axios.patch(`/api/v1/quiz/question/${currentQuestion.id}`, { 
          others: updatedOthers 
        })
        setSession((prev: any) => {
          const newQs = [...prev.questions]
          newQs[currentIndex] = { ...newQs[currentIndex], others: updatedOthers }
          return { ...prev, questions: newQs }
        })
      }
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

  const handleIgnoreQuestion = async () => {
    if (!currentQuestion) return
    const newIgnoreState = !currentQuestion.is_ignored
    try {
      await axios.post(`/api/v1/quiz/question/${currentQuestion.id}/ignore`, { is_ignored: newIgnoreState })
      
      setSession((prev: any) => {
        const newQs = [...prev.questions]
        newQs[currentIndex] = { ...newQs[currentIndex], is_ignored: newIgnoreState }
        return { ...prev, questions: newQs }
      })

      // Move to next question automatically if ignoring
      if (newIgnoreState) {
        handleNext()
      }
    } catch (e) {
      alert("Failed to ignore question.")
    }
  }

  const copyCurrentTabContent = (type: 'default' | 'prompt' | 'question' = 'default') => {
    let content = ''
    if (activeFeedbackTab === 'insight') content = getSelectedInsightContent()
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
    else if (activeFeedbackTab === 'community') {
      content = contributions.map(c => `${c.user?.full_name || c.user?.username || 'User'}: ${c.content}`).join('\n')
    }
    
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
        setInsightInput(getSelectedInsightContent())
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
    } else if (activeFeedbackTab === 'community') {
      const inputEl = document.getElementById('community-comment-input')
      if (inputEl) inputEl.focus()
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
    if (!showFeedback && !isReviewMode && !isExamSubmitted) return null
    
    const hasInsightContent = insightFields.some((f: any) => f.hasContent)
    const tabs = [
      { id: 'insight', label: 'INSIGHT', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-100', hasContent: hasInsightContent },
      { id: 'ai', label: 'AI ANALYSIS', icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-100', hasContent: !!currentQuestion?.ai_explanation },
      { id: 'note', label: 'NOTE', icon: StickyNote, color: 'text-emerald-500', bg: 'bg-emerald-100', hasContent: !!personalNote },
      { id: 'community', label: 'COMMUNITY', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-100', hasContent: contributions.length > 0 }
    ]

    const renderTabContent = () => {
      switch (activeFeedbackTab) {
        case 'insight': {
          const activeContent = getSelectedInsightContent()
          const currentFieldObj = insightFields.find((f: any) => f.key === selectedInsightField)
          const currentFieldLabel = currentFieldObj?.label || 'Explanation'

          return (
            <div className="p-6 rounded-[2rem] bg-indigo-50/30 border border-indigo-100 dark:border-indigo-950/40 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex flex-col gap-2.5 mb-3.5">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
                          <Lightbulb className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                       </div>
                       <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                         LEARNING INSIGHT
                       </span>
                     </div>
                     {canEdit && (
                       <button
                         type="button"
                         onClick={() => {
                           if (isEditingInsight) saveInsight()
                           else {
                             setInsightInput(activeContent)
                             setIsEditingInsight(true)
                           }
                         }}
                         className={cn(
                           "text-[9px] font-black uppercase tracking-widest transition-all px-2.5 py-1 rounded-md cursor-pointer",
                           isEditingInsight
                             ? "bg-emerald-600 text-white shadow-xs"
                             : "text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 shadow-2xs"
                         )}
                       >
                         {isEditingInsight ? 'SAVE' : 'EDIT'}
                       </button>
                     )}
                   </div>

                   {/* Sub-tabs for Insight Fields when there are custom columns */}
                   {insightFields.length > 1 && (
                     <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                       {insightFields.map((field: any) => {
                         const isSelected = selectedInsightField === field.key
                         return (
                           <button
                             key={field.key}
                             type="button"
                             onClick={() => {
                               if (isEditingInsight) {
                                 if (!window.confirm("Switch fields without saving changes?")) return
                                 setIsEditingInsight(false)
                               }
                               setSelectedInsightField(field.key)
                             }}
                             className={cn(
                               "px-2.5 py-1 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                               isSelected
                                 ? "bg-amber-500 text-white shadow-2xs"
                                 : "bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 hover:bg-white"
                             )}
                           >
                             <span>{field.label}</span>
                             {field.hasContent && (
                               <span className={cn(
                                 "w-1.5 h-1.5 rounded-full",
                                 isSelected ? "bg-white" : "bg-emerald-500"
                               )} />
                             )}
                           </button>
                         )
                       })}
                     </div>
                   )}
                 </div>

                 <div className="text-slate-600 dark:text-slate-300 font-medium text-sm leading-relaxed markdown-content whitespace-pre-wrap break-words pr-2">
                    {isEditingInsight ? (
                      <div className="space-y-2">
                        <textarea
                          value={insightInput}
                          onChange={(e) => setInsightInput(e.target.value)}
                          className="w-full h-80 p-3 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                          placeholder={`Enter content for ${currentFieldLabel}...`}
                          autoFocus
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span>Editing: {currentFieldLabel}</span>
                          <span>Markdown supported</span>
                        </div>
                      </div>
                    ) : activeContent ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MarkdownComponents}>
                        {activeContent}
                      </ReactMarkdown>
                    ) : (
                      <div className="text-center py-6 text-slate-400 font-medium italic text-xs">
                        No {currentFieldLabel.toLowerCase()} available for this question.
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setInsightInput('')
                              setIsEditingInsight(true)
                            }}
                            className="block mx-auto mt-2 text-[10px] font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-600 underline cursor-pointer"
                          >
                            + Add {currentFieldLabel}
                          </button>
                        )}
                      </div>
                    )}
                 </div>
            </div>
          )
        }
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
        case 'community':
          return (
            <div className="flex flex-col min-h-full bg-white rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-xs animate-in fade-in slide-in-from-bottom-2 overflow-hidden">
              <div className="flex items-center justify-between p-3.5 border-b border-purple-100/60 bg-purple-50/30 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-100 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-purple-700 uppercase tracking-wider block">
                      Community Discussions ({contributions.length})
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400">
                      Share tips, mnemonics & question feedback
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-[160px] max-h-[380px] lg:max-h-[460px]">
                {isFetchingContributions ? (
                  <div className="flex flex-col items-center justify-center py-12 animate-pulse">
                    <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-2" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loading discussions...</span>
                  </div>
                ) : contributions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <MessageSquare className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">No discussions yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 text-center">Be the first to ask a question or share a mnemonic!</p>
                  </div>
                ) : (
                  contributions.map((c: any) => (
                    <div key={c.id} className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-[10px] font-black uppercase">
                            {c.user?.username ? c.user.username.substring(0, 2) : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-700">{c.user?.full_name || c.user?.username || 'User'}</span>
                              {c.user?.role === 'admin' && (
                                <span className="px-1.5 py-0.2 bg-rose-100 text-rose-600 rounded text-[7px] font-black uppercase">Admin</span>
                              )}
                            </div>
                            <span className="text-[8px] font-bold text-slate-400">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {c.type === 'correction' && (
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                              c.status === 'approved' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                            )}>
                              Suggestion
                            </span>
                          )}
                          {(c.user_id === user?.id || user?.role === 'admin') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteContribution(c.id)}
                              className="text-slate-300 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-slate-600 whitespace-pre-wrap break-words pl-8">
                        {c.content}
                      </div>
                      <div className="flex items-center justify-between pl-8 border-t border-slate-100 pt-2 text-[10px]">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleLikeContribution(c.id)}
                            className={cn(
                              "flex items-center gap-1 font-black transition-colors cursor-pointer",
                              c.is_liked_by_me ? "text-purple-600" : "text-slate-400 hover:text-purple-500"
                            )}
                          >
                            <Heart className={cn("w-3.5 h-3.5", c.is_liked_by_me && "fill-purple-600 text-purple-600")} />
                            <span>{c.likes_count}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReplyId(activeReplyId === c.id ? null : c.id)
                            }}
                            className="text-slate-400 hover:text-purple-500 font-black transition-colors cursor-pointer"
                          >
                            {activeReplyId === c.id ? 'Cancel' : 'Reply'}
                          </button>
                        </div>
                      </div>
                      {c.replies && c.replies.length > 0 && (
                        <div className="pl-6 space-y-2 border-l-2 border-purple-100 ml-4 mt-2">
                          {c.replies.map((r: any) => (
                            <div key={r.id} className="bg-purple-50/40 p-2.5 rounded-xl text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-slate-700 text-[11px]">{r.user?.full_name || r.user?.username || 'User'}</span>
                                <span className="text-[8px] font-bold text-slate-400">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                              </div>
                              <p className="text-slate-600 font-medium">{r.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {activeReplyId === c.id && (
                        <div className="pl-6 mt-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={replyInputs[c.id] || ''}
                              onChange={(e) => setReplyInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                              placeholder="Write a reply..."
                              className="flex-1 px-3 py-1.5 bg-slate-50 border border-purple-200 rounded-xl text-xs outline-none focus:bg-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleAddReply(c.id)
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddReply(c.id)}
                              className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700 cursor-pointer shadow-xs"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddContribution} className="p-3 bg-slate-50/60 border-t border-purple-100/80 rounded-b-2xl space-y-2 flex-shrink-0 shadow-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setContributionType('comment')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer",
                      contributionType === 'comment' ? "bg-purple-600 text-white shadow-2xs" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    💬 Discussion
                  </button>
                  <button
                    type="button"
                    onClick={() => setContributionType('correction')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer",
                      contributionType === 'correction' ? "bg-amber-500 text-white shadow-2xs" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    ⚠️ Suggestion
                  </button>
                </div>
                <div className="flex gap-2 items-end">
                  <textarea
                    id="community-comment-input"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder={contributionType === 'comment' ? "Ask a question or share a tip about this question..." : "Suggest an edit or correction for this question..."}
                    className="flex-1 min-h-[38px] max-h-[80px] p-2 bg-white rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 outline-none border border-slate-200 focus:border-purple-300 resize-y"
                    required
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all active:scale-90 flex-shrink-0 cursor-pointer shadow-xs"
                    title="Post Comment"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
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
             "flex items-center justify-between gap-1.5 sm:gap-3 py-4 border-t border-slate-100 bg-white/95 backdrop-blur-xl sticky bottom-0 z-50 px-2 sm:px-6"
          )}>
             {activeFeedbackTab !== 'community' && (
               <button 
                 onClick={handleEditCurrentTab}
                 className={cn(
                   "w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl border transition-all duration-300 active:scale-90",
                   ((activeFeedbackTab === 'ai' && isEditingAI) || (activeFeedbackTab === 'note' && isEditingNote) || (activeFeedbackTab === 'insight' && isEditingInsight))
                     ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-100 scale-105"
                     : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 shadow-sm"
                 )}
               >
                 {((activeFeedbackTab === 'ai' && isEditingAI) || (activeFeedbackTab === 'note' && isEditingNote) || (activeFeedbackTab === 'insight' && isEditingInsight)) ? (
                   <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] animate-pulse" />
                 ) : (
                   <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                 )}
               </button>
             )}

             <div className="flex items-center bg-slate-50 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl h-11 sm:h-14 border border-slate-200/60 shadow-inner gap-0.5 sm:gap-1">
               {tabs.map((tab: any) => {
                 const isActive = activeFeedbackTab === tab.id
                 return (
                   <button
                     key={tab.id}
                     onClick={() => setActiveFeedbackTab(tab.id)}
                     className={cn(
                       "w-9 sm:w-11 h-9 sm:h-11 flex items-center justify-center rounded-lg sm:rounded-xl transition-all duration-300 relative cursor-pointer",
                       isActive 
                         ? (
                             tab.id === 'insight' ? "text-amber-500 bg-white shadow-md border border-amber-100/60 scale-105" :
                             tab.id === 'ai' ? "text-indigo-600 bg-white shadow-md border border-indigo-100/60 scale-105" :
                             tab.id === 'note' ? "text-emerald-600 bg-white shadow-md border border-emerald-100/60 scale-105" :
                             "text-purple-600 bg-white shadow-md border border-purple-100/60 scale-105"
                           )
                         : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                     )}
                   >
                     <div className="relative">
                       <tab.icon className={cn("w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300", isActive && "scale-110")} />
                       {tab.hasContent && (
                         <span className={cn(
                           "absolute -top-1 -right-1 w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full border border-white animate-pulse",
                           tab.id === 'insight' ? "bg-amber-500" :
                           tab.id === 'ai' ? "bg-indigo-600" :
                           tab.id === 'note' ? "bg-emerald-500" :
                           "bg-purple-600"
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
                   "w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl border transition-all duration-300 active:scale-90 shadow-sm",
                   isCopied 
                     ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-transparent text-white shadow-lg shadow-emerald-100 scale-105" 
                     : "bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
                 )}
               >
                 {isCopied ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
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
    if (isExamMode) {
      const answeredCount = Object.keys(examAnswers).length
      const totalCount = session.questions?.length || 0
      const remainingCount = Math.max(0, totalCount - answeredCount)
      const flaggedCount = flaggedQuestions.size

      return (
        <div className="bg-slate-50/80 rounded-[1.5rem] p-4 mb-4 border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {isReviewMode ? "EXAM SCORE" : "EXAM PROGRESS"}
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 rounded-full text-white">
              <Target className="w-2.5 h-2.5" />
              <span className="text-[9px] font-black">
                {isReviewMode ? `${examResults?.accuracy_pct || 0}%` : `${Math.round((answeredCount / Math.max(1, totalCount)) * 100)}%`}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-2 bg-white rounded-xl shadow-sm border border-slate-100/50">
              <span className="text-[14px] font-black text-slate-700">{answeredCount}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">DONE</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-slate-100 rounded-xl shadow-sm border border-slate-200/50">
              <span className="text-[14px] font-black text-slate-600">{remainingCount}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">REMAIN</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-amber-50 rounded-xl shadow-sm border border-amber-100/50">
              <span className="text-[14px] font-black text-amber-600">{flaggedCount}</span>
              <span className="text-[8px] font-bold text-amber-500 uppercase">FLAGGED</span>
            </div>
          </div>
        </div>
      )
    }

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
        if (isExamMode) {
          const isAnswered = examAnswers[i] !== undefined
          const isFlagged = flaggedQuestions.has(i)
          const isActive = currentIndex === i
          const detail = isReviewMode && examResults?.detailed_results?.find((d: any) => d.question_id === q.id)
          const isReviewCorrect = detail?.is_correct

          return (
            <button
              key={i}
              onClick={() => {
                navigateToQuestion(i)
                setIsMapOpen(false)
              }}
              className={cn(
                "relative aspect-square rounded-xl border flex items-center justify-center font-black text-[11px] transition-all duration-200",
                isReviewMode
                  ? (isReviewCorrect ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs" : "bg-rose-500 text-white border-rose-600 shadow-2xs")
                  : isAnswered
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300",
                isActive ? "ring-2 ring-indigo-500 ring-offset-2 scale-105 z-10" : ""
              )}
            >
              <span className="relative z-10">{i + 1}</span>
              {isFlagged && !isReviewMode && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
              )}
              {isReviewMode && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  {isReviewCorrect ? (
                    <Check className="w-5 h-5 text-white stroke-[3]" />
                  ) : (
                    <X className="w-5 h-5 text-white stroke-[3]" />
                  )}
                </div>
              )}
            </button>
          )
        }

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
              q.is_ignored ? "bg-slate-100 border-slate-200 text-slate-400 opacity-50 grayscale hover:opacity-100 hover:grayscale-0" :
              isActive 
                ? "border-indigo-400 bg-indigo-50/30 z-10 scale-105 shadow-sm" 
                : "border-slate-100 hover:border-indigo-200 bg-white",
              !q.is_ignored && (totalStats === 0 ? "text-slate-400" : "text-slate-700")
            )}
            style={
              !q.is_ignored && totalStats > 0 
                ? { background: `linear-gradient(to top, #DCFCE7 0%, #DCFCE7 ${ratio}%, #FEE2E2 ${ratio}%, #FEE2E2 100%)` } 
                : {}
            }
          >
            {q.is_ignored ? (
              <EyeOff className="w-5 h-5 text-slate-400 absolute inset-0 m-auto z-20 pointer-events-none" />
            ) : !hasAttemptedThisSession ? (
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

  const renderOptionsList = () => {
    return (
      <div className="grid grid-cols-1 gap-3">
        {currentQuestion?.options.map((opt, idx) => {
          if (isExamMode) {
            const isSelected = examAnswers[currentIndex] === idx
            const examDetail = isReviewMode ? examResults?.detailed_results?.find((d: any) => d.question_id === currentQuestion?.id) : null
            const isCorrectOpt = isReviewMode && (opt.id === examDetail?.correct_option_id || opt.is_correct)
            const isUserChoice = isReviewMode && opt.id === examDetail?.selected_option_id

            if (isReviewMode) {
              return (
                <div
                  key={opt.id}
                  className={cn(
                    "p-4 md:p-5 rounded-2xl border-2 text-left transition-all duration-200 relative overflow-hidden flex items-center justify-between gap-4",
                    isCorrectOpt
                      ? "border-emerald-500 bg-emerald-50/70 shadow-sm"
                      : isUserChoice
                      ? "border-rose-500 bg-rose-50/70 shadow-sm"
                      : "border-slate-100 bg-white opacity-60"
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-xs",
                      isCorrectOpt
                        ? "bg-emerald-500 text-white"
                        : isUserChoice
                        ? "bg-rose-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={cn(
                      "font-semibold leading-snug",
                      getOptionFontSize(userSettings?.font_size),
                      isCorrectOpt ? "text-emerald-950 font-bold" : isUserChoice ? "text-rose-950 font-bold" : "text-slate-700"
                    )}>
                      {opt.content}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isCorrectOpt && (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Correct</span>
                      </span>
                    )}
                    {isUserChoice && !isCorrectOpt && (
                      <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Your Choice</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            }

            // Taking Exam (Interactive selection without feedback)
            return (
              <button
                key={opt.id}
                onClick={() => handleExamSelectOption(idx)}
                className={cn(
                  "group p-4 md:p-5 rounded-2xl border-2 text-left transition-all duration-200 relative overflow-hidden active:scale-[0.99] cursor-pointer",
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/70 shadow-md shadow-indigo-100/50 text-indigo-950 font-bold"
                    : "border-slate-100 bg-white hover:border-indigo-300 hover:bg-indigo-50/20 text-slate-700"
                )}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 transition-all duration-200 shadow-xs",
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className={cn(
                    "flex-1 font-semibold leading-snug",
                    getOptionFontSize(userSettings?.font_size)
                  )}>
                    {opt.content}
                  </span>
                  {isSelected && (
                    <div className="w-8 h-8 flex-shrink-0 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200 text-white">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </div>
              </button>
            )
          }

          // Standard Practice Mode
          return (
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
                   "flex-1 font-semibold leading-snug",
                   getOptionFontSize(userSettings?.font_size),
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
          )
        })}
      </div>
    )
  }

  if (!session) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">LOADING SESSION...</div>

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 text-slate-900 font-sans overflow-hidden relative">
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

      {isExamMode ? (
        <header className="sticky top-0 flex-shrink-0 z-[120] bg-white/95 backdrop-blur-2xl border-b border-slate-100/80 px-4 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isReviewMode) {
                  setIsReviewMode(false)
                } else {
                  setIsQuitModalOpen(true)
                }
              }}
              className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 active:scale-90 transition-all"
              title={isReviewMode ? "Back to Scorecard" : "Exit Exam"}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                  isReviewMode
                    ? "bg-purple-100 text-purple-700"
                    : "bg-indigo-600 text-white shadow-xs"
                )}>
                  {isReviewMode ? "EXAM REVIEW" : "MOCK EXAM"}
                </span>
                <h1 className="text-xs font-black text-slate-800 truncate max-w-[160px] sm:max-w-xs">{session.title}</h1>
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                {isReviewMode
                  ? `Score: ${examResults?.score || 0}/${examResults?.total || 0} (${examResults?.accuracy_pct || 0}%)`
                  : `Question ${currentIndex + 1} of ${session.questions?.length || 0}`
                }
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isReviewMode && (
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl shadow-xs text-xs font-black transition-all",
                examTimeLeft !== null && examTimeLeft < 60
                  ? "bg-rose-500 text-white animate-pulse shadow-rose-200"
                  : "bg-slate-900 text-white"
              )}>
                <Timer className="w-3.5 h-3.5" />
                <span>
                  {examTimeLeft !== null
                    ? `${Math.floor(examTimeLeft / 60)}:${(examTimeLeft % 60).toString().padStart(2, '0')}`
                    : `${Math.floor(examTimeSpent / 60)}:${(examTimeSpent % 60).toString().padStart(2, '0')}`
                  }
                </span>
              </div>
            )}

            {!isReviewMode && (
              <button
                onClick={() => toggleFlagQuestion(currentIndex)}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-xl border transition-all active:scale-90",
                  flaggedQuestions.has(currentIndex)
                    ? "bg-amber-50 border-amber-300 text-amber-600"
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-500"
                )}
                title="Flag question"
              >
                <Flag className={cn("w-4 h-4", flaggedQuestions.has(currentIndex) && "fill-amber-500")} />
              </button>
            )}

            {isReviewMode ? (
              <button
                onClick={() => setIsReviewMode(false)}
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-100 active:scale-95 transition-all"
              >
                Scorecard
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitConfirmOpen(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs rounded-xl shadow-xs hover:from-emerald-600 hover:to-teal-700 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Submit</span>
              </button>
            )}
          </div>
        </header>
      ) : roadmapStatus && roadmapStatus.pipeline && roadmapStatus.pipeline.length > 0 ? (
        <header className="sticky top-0 flex-shrink-0 z-[120] bg-white/95 backdrop-blur-2xl border-b border-slate-100/80 px-2 sm:px-4 py-2 flex items-center shadow-xs">
          <div className="w-full">
            <RoadmapHeaderTracker
              pipeline={roadmapStatus.pipeline}
              currentStepIndex={roadmapStatus.current_step_index ?? 0}
              allDone={Boolean(roadmapStatus.all_done)}
              quizId={id || ''}
              quizTitle={session.title}
              subProgressCurr={Object.keys(sessionAnswers).length}
              subProgressTotal={session.questions?.length || 1}
              streakCount={roadmapStatus.streak || streak || 0}
              onExit={() => navigate(`/quiz/${id}/roadmap`)}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              timeMode={timeMode}
              onToggleTimeMode={() => setTimeMode(prev => prev === 'card' ? 'today' : prev === 'today' ? 'all' : 'card')}
              scoreMode={scoreMode}
              onToggleScoreMode={() => setScoreMode(prev => prev === 'today' ? 'all' : 'today')}
              xp={initialTotalXP}
              sessionXP={sessionXP}
              todayXP={initialTotalXP}
              showFeedback={showFeedback}
              hasRated={selectedOption !== null}
              currentIndex={currentIndex}
              timeLeftRef={timerRef}
              sessionStudyTimeRef={sessionStudyTimeRef}
              answeredCount={Object.keys(sessionAnswers).length}
              correctCount={Object.values(sessionAnswers).filter((optIdx, i) => session.questions?.[i]?.options?.[optIdx]?.is_correct).length}
              totalCards={session.questions?.length || 0}
              cardsRemaining={Math.max(0, (session.questions?.length || 0) - Object.keys(sessionAnswers).length)}
            />
          </div>
        </header>
      ) : (
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
          <button 
             onClick={() => {
                const nextSfx = !sfxEnabled;
                setSfxEnabled(nextSfx);
                updateUserSettings({ sfx_enabled: nextSfx });
             }}
             className={cn(
                "w-9 h-9 flex items-center justify-center rounded-xl border transition-all active:scale-90 shadow-sm",
                sfxEnabled 
                   ? "bg-emerald-50 border-emerald-100 text-emerald-500 hover:bg-emerald-100" 
                   : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
             )}
             title={sfxEnabled ? "Tắt âm thanh hiệu ứng" : "Bật âm thanh hiệu ứng"}
          >
             {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

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
            onClick={handleIgnoreQuestion}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl shadow-sm active:scale-90 transition-all",
              currentQuestion?.is_ignored 
                ? "bg-slate-700 border border-slate-800 text-white hover:bg-slate-600"
                : "bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200"
            )}
            title={currentQuestion?.is_ignored ? "Restore question" : "Ignore question"}
          >
            {currentQuestion?.is_ignored ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
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
      )}

      {isExamMode && isExamSubmitted && !isReviewMode ? (
        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-2xl bg-white rounded-[2.5rem] border border-slate-200/90 shadow-2xl p-6 md:p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
            {/* Grade banner */}
            {(() => {
              const acc = examResults?.accuracy_pct || 0
              const grade = acc >= 90 ? { label: 'S', color: 'from-amber-400 to-yellow-500', text: 'OUTSTANDING!' } :
                            acc >= 80 ? { label: 'A', color: 'from-emerald-500 to-teal-600', text: 'EXCELLENT!' } :
                            acc >= 65 ? { label: 'B', color: 'from-indigo-500 to-blue-600', text: 'GOOD JOB!' } :
                            acc >= 50 ? { label: 'C', color: 'from-amber-500 to-orange-600', text: 'PASSED!' } :
                                        { label: 'F', color: 'from-rose-500 to-pink-600', text: 'KEEP PRACTICING!' }
              return (
                <div className={cn("p-6 rounded-[2rem] bg-gradient-to-tr text-white shadow-lg", grade.color)}>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">EXAM SCORECARD</div>
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-black mb-2 border-2 border-white/30 shadow-inner">
                    {grade.label}
                  </div>
                  <h2 className="text-xl md:text-2xl font-black">{grade.text}</h2>
                  <p className="text-sm font-bold opacity-90 mt-0.5">{acc}% Accuracy</p>
                </div>
              )
            })()}

            {/* 4 Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Score</span>
                <span className="text-lg font-black text-slate-800">{examResults?.score || 0}/{examResults?.total || 0}</span>
              </div>
              <div className="p-3.5 bg-emerald-50 border border-emerald-200/70 rounded-2xl">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider block">Accuracy</span>
                <span className="text-lg font-black text-emerald-700">{examResults?.accuracy_pct || 0}%</span>
              </div>
              <div className="p-3.5 bg-indigo-50 border border-indigo-200/70 rounded-2xl">
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block">XP Awarded</span>
                <span className="text-lg font-black text-indigo-700">+{examResults?.xp_gained || 0} XP</span>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200/70 rounded-2xl">
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider block">Time Taken</span>
                <span className="text-lg font-black text-amber-700">
                  {Math.floor(examTimeSpent / 60)}m {examTimeSpent % 60}s
                </span>
              </div>
            </div>

            {/* Question Breakdown Palette */}
            <div className="text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Breakdown</span>
                <span className="text-xs font-bold text-slate-500">Tap a number to review</span>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/60 max-h-48 overflow-y-auto custom-scrollbar">
                {session.questions?.map((q: any, i: number) => {
                  const detail = examResults?.detailed_results?.find((d: any) => d.question_id === q.id)
                  const isCorrect = detail?.is_correct
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setIsReviewMode(true)
                        navigateToQuestion(i)
                      }}
                      className={cn(
                        "aspect-square rounded-xl border flex items-center justify-center font-black text-xs transition-all active:scale-90 shadow-2xs cursor-pointer",
                        isCorrect
                          ? "bg-emerald-500 border-emerald-600 text-white shadow-emerald-200/50"
                          : "bg-rose-500 border-rose-600 text-white shadow-rose-200/50"
                      )}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => {
                  setIsReviewMode(true)
                  navigateToQuestion(0)
                }}
                className="py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Review Solutions</span>
              </button>
              <button
                onClick={handleRetakeExam}
                className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Exam</span>
              </button>
              <button
                onClick={() => navigate(`/quiz/${id}`)}
                className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Exit to Quiz</span>
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex w-full max-w-none justify-center gap-4 lg:gap-8 px-2 lg:px-6 xl:px-10 md:py-6 py-2 overflow-hidden">
          {(!isExamMode || isReviewMode) && (
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
          )}

          <div className={cn("w-full min-w-0 flex flex-col overflow-hidden", currentGroup ? "max-w-6xl" : "max-w-4xl")}>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-24 xl:pb-10">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Grouped Question Split-View or Standalone */}
                  {currentGroup && (currentGroup.passage_content || currentGroup.audio_url || currentGroup.image_url) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      {/* Left: Passage / Audio / Media Pane (Desktop visible, mobile view-button) */}
                      <div className="bg-slate-50/90 border border-slate-200/90 rounded-[2.5rem] p-5 md:p-7 shadow-xs flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-wider shadow-xs">
                              {currentGroup.audio_url ? "🎧 Audio Section" : "📖 Reading Passage"}
                            </span>
                            <span className="text-xs font-black text-slate-700">
                              Group {currentGroup.group_code}
                            </span>
                          </div>
                          {currentQuestion?.order_in_group && (
                            <span className="text-[11px] font-bold text-slate-400">
                              Question {questionIndexInGroup} of {groupQuestions.length}
                            </span>
                          )}
                        </div>

                        {currentGroup.title && (
                          <h3 className="text-sm md:text-base font-black text-slate-800">
                            {currentGroup.title}
                          </h3>
                        )}

                        {currentGroup.audio_url && (
                          <div className="p-3.5 bg-white rounded-2xl border border-indigo-100 shadow-xs space-y-2">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                              <Headphones className="w-4 h-4 text-indigo-600 animate-pulse" />
                              <span>Section Audio Track</span>
                            </div>
                            <audio controls src={currentGroup.audio_url} className="w-full h-10 rounded-xl" />
                          </div>
                        )}

                        {currentGroup.image_url && (
                          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                            <img src={currentGroup.image_url} alt="Passage illustration" className="w-full max-h-72 object-contain mx-auto" />
                          </div>
                        )}

                        {currentGroup.passage_content && (
                          <div className="p-4 bg-white rounded-2xl border border-slate-200/70 overflow-y-auto max-h-[55vh] custom-scrollbar text-slate-800 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-serif">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                              {currentGroup.passage_content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Right: Question and Options */}
                      <div className="bg-white md:p-8 p-5 rounded-[2.5rem] border border-slate-200/90 shadow-xs relative overflow-hidden">
                        {/* Mobile quick view passage button */}
                        {currentGroup.passage_content && (
                          <button
                            onClick={() => setIsPassageDrawerOpen(true)}
                            className="lg:hidden w-full py-2.5 px-4 mb-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-between shadow-xs active:scale-[0.99] transition-all cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-indigo-600" />
                              <span>Passage ({currentGroup.group_code}): Tap to Read</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-indigo-500" />
                          </button>
                        )}

                        {/* Top Question Row */}
                        <div className="flex items-center justify-between gap-4 md:mb-6 mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-indigo-600 rounded-2xl text-white font-black text-base shadow-xs">
                              {currentIndex + 1}
                            </div>
                            {userSettings?.show_mastery !== false && currentQuestion?.box_level !== undefined && (
                              getMasteryPill(currentQuestion.box_level)
                            )}
                          </div>
                          {activeGoal && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10.5px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                🎯 Goal: {activeGoal.done_today}/{activeGoal.daily_target}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Question Text */}
                        <h2 className={cn("font-bold leading-snug text-slate-800 md:mb-8 mb-5 mt-1 transition-all", getQuestionFontSize(userSettings?.font_size))}>
                          {currentQuestion?.content}
                        </h2>

                        {/* Options List */}
                        {renderOptionsList()}

                        {/* Review Mode Explanation */}
                        {isReviewMode && currentQuestion?.explanation && (
                          <div className="mt-6 p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 text-left space-y-2">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                              <Lightbulb className="w-4 h-4 text-amber-500" />
                              <span className="uppercase tracking-wider">Solution & Explanation</span>
                            </div>
                            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                {currentQuestion.explanation}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Standalone Question (Single Column) */
                    <div className="bg-white md:p-8 p-5 rounded-[2.5rem] border border-slate-200/90 shadow-xs relative overflow-hidden">
                      {/* Top Question Row */}
                      <div className="flex items-center justify-between gap-4 md:mb-6 mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-indigo-600 rounded-2xl text-white font-black text-base shadow-xs">
                            {currentIndex + 1}
                          </div>
                          {userSettings?.show_mastery !== false && currentQuestion?.box_level !== undefined && (
                            getMasteryPill(currentQuestion.box_level)
                          )}
                        </div>
                        {activeGoal && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10.5px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                              🎯 Goal: {activeGoal.done_today}/{activeGoal.daily_target}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Question Text */}
                      <h2 className={cn("font-bold leading-snug text-slate-800 md:mb-8 mb-5 mt-1 transition-all", getQuestionFontSize(userSettings?.font_size))}>
                        {currentQuestion?.content}
                      </h2>

                      {/* Options List */}
                      {renderOptionsList()}

                      {/* Review Mode Explanation */}
                      {isReviewMode && currentQuestion?.explanation && (
                        <div className="mt-6 p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 text-left space-y-2">
                          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            <span className="uppercase tracking-wider">Solution & Explanation</span>
                          </div>
                          <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                              {currentQuestion.explanation}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:flex w-[340px] 2xl:w-[420px] flex-shrink-0 flex-col overflow-hidden">
            <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col overflow-hidden">
              <h4 className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4 flex-shrink-0">
                {isExamMode ? (isReviewMode ? "EXAM REVIEW PALETTE" : "EXAM PALETTE") : "QUESTION MAP"}
              </h4>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">
                {renderSessionStats()}
                {renderQuestionMapGrid()}
              </div>
            </div>
          </aside>
        </main>
      )}

      {/* Bottom Controls - Fixed to bottom (same pattern as Layout bottom nav) */}
      {isExamMode ? (
        <footer className="fixed bottom-0 left-0 right-0 xl:relative flex-shrink-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100/80 px-4 py-3 z-[120] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-3 h-13">
            <button
              onClick={() => navigateToQuestion(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-4 h-12 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-black text-xs rounded-2xl flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">PREV</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMapOpen(true)}
                className="lg:hidden px-3.5 h-12 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                title="Question Palette"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-xs font-black">{Object.keys(examAnswers).length}/{session.questions?.length || 0}</span>
              </button>

              <button
                onClick={() => toggleFlagQuestion(currentIndex)}
                className={cn(
                  "px-3.5 h-12 rounded-2xl border flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer",
                  flaggedQuestions.has(currentIndex)
                    ? "bg-amber-50 border-amber-300 text-amber-600 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                )}
                title="Flag Question for Review"
              >
                <Flag className={cn("w-4 h-4", flaggedQuestions.has(currentIndex) && "fill-amber-500")} />
                <span className="hidden sm:inline text-xs font-black">
                  {flaggedQuestions.has(currentIndex) ? "Flagged" : "Flag"}
                </span>
              </button>

              {isReviewMode && (
                <button
                  onClick={() => setIsFeedbackOpen(true)}
                  className="px-3.5 h-12 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-xs font-black">Explanation</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentIndex < (session.questions?.length || 1) - 1 ? (
                <button
                  onClick={() => navigateToQuestion(currentIndex + 1)}
                  className="px-4 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-2xl flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="hidden sm:inline">NEXT</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : null}

              {!isReviewMode && (
                <button
                  onClick={() => setIsSubmitConfirmOpen(true)}
                  className="px-5 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-200/50 flex items-center gap-2 uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>SUBMIT</span>
                </button>
              )}
            </div>
          </div>
        </footer>
      ) : (
        <footer className="fixed bottom-0 left-0 right-0 xl:relative flex-shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-100/80 dark:border-slate-800 z-[120] shadow-[0_-4px_24px_rgba(99,102,241,0.06)]">
          <div className="max-w-2xl mx-auto w-full flex flex-col">
            {/* Primary Action Zone */}
            <div className="px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3">
              {/* 1. Explanation Button (Lightbulb) - only visible after answering */}
              {(showFeedback || isReviewMode || isExamSubmitted) && (
                <button 
                  type="button"
                  onClick={() => setIsFeedbackOpen(true)}
                  className={cn(
                    "w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-2xl border transition-all active:scale-95 cursor-pointer relative",
                    justAnswered || (currentQuestion?.explanation && currentQuestion.explanation.trim())
                      ? "bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-100 shadow-xs ring-2 ring-amber-200/50 dark:ring-amber-900/30"
                      : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                  )}
                  title="View Explanation & AI Insights"
                >
                  <Lightbulb className="w-5 h-5" />
                  {(currentQuestion?.explanation && currentQuestion.explanation.trim()) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </button>
              )}

              {/* 2. Study Settings Button */}
              <button 
                type="button"
                onClick={() => setIsSettingsModalOpen(true)} 
                className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 dark:hover:bg-slate-700 shadow-xs active:scale-95 transition-all cursor-pointer"
                title="Study Settings"
              >
                <Sliders className="w-5 h-5" />
              </button>

              {/* 3. Main Action CTA */}
              {!showFeedback ? (
                <div className="flex-1 h-11 sm:h-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-slate-400 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 uppercase tracking-wider select-none shadow-xs">
                  <span>Select an option above</span>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={handleNext} 
                  className="flex-1 h-11 sm:h-12 bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-300/40 flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>NEXT QUESTION</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Interactive Navigation Tabs (Always Accessible on Mobile - Vocaburn style) */}
            <div className="w-full h-11 grid grid-cols-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-100 dark:border-slate-800 p-0 relative md:hidden">
              {/* 1. Card Map Tab */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMapOpen(true)
                  setIsStatsOpen(false)
                  setIsFeedbackOpen(false)
                }}
                className="relative flex items-center justify-center gap-1.5 py-2.5 px-1 transition-all active:scale-95 overflow-hidden cursor-pointer"
                title="Question Map"
              >
                {activeBottomTab === 'map' && (
                  <motion.div
                    layoutId="activeBottomTabBg"
                    className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider truncate transition-colors duration-200",
                  activeBottomTab === 'map' ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-slate-400 hover:text-slate-600 dark:text-slate-500"
                )}>
                  <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                  CARD MAP
                </span>
              </button>

              {/* 2. Question View Tab */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMapOpen(false)
                  setIsStatsOpen(false)
                  setIsFeedbackOpen(false)
                }}
                className="relative flex items-center justify-center gap-1.5 py-2.5 px-1 transition-all active:scale-95 overflow-hidden cursor-pointer"
                title="Current Question"
              >
                {activeBottomTab === 'question' && (
                  <motion.div
                    layoutId="activeBottomTabBg"
                    className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider truncate transition-colors duration-200",
                  activeBottomTab === 'question' ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-slate-400 hover:text-slate-600 dark:text-slate-500"
                )}>
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  QUESTION
                </span>
              </button>

              {/* 3. Stats Tab */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsStatsOpen(true)
                  setIsMapOpen(false)
                  setIsFeedbackOpen(false)
                }}
                className="relative flex items-center justify-center gap-1.5 py-2.5 px-1 transition-all active:scale-95 overflow-hidden cursor-pointer"
                title="Session Stats & Analytics"
              >
                {activeBottomTab === 'stats' && (
                  <motion.div
                    layoutId="activeBottomTabBg"
                    className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider truncate transition-colors duration-200",
                  activeBottomTab === 'stats' ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-slate-400 hover:text-slate-600 dark:text-slate-500"
                )}>
                  <BarChart2 className="w-3.5 h-3.5 shrink-0" />
                  STATS
                </span>
              </button>
            </div>
          </div>
        </footer>
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
            className="fixed inset-0 z-[200] bg-[#F8FAFC] lg:hidden flex flex-col h-screen h-[100dvh]"
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

      {/* Mobile Stats Modal */}
      <AnimatePresence>
        {isStatsOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="fixed inset-0 z-[200] bg-[#F8FAFC] dark:bg-slate-950 flex flex-col h-screen h-[100dvh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">SESSION STATS</h4>
                  <p className="text-[10px] font-bold text-slate-400">Live progress & accuracy breakdown</p>
                </div>
              </div>
              <button 
                onClick={() => setIsStatsOpen(false)} 
                className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24 space-y-4">
              {renderSessionStats()}

              {(() => {
                const answeredCount = Object.keys(sessionAnswers).length
                const correctCount = Object.entries(sessionAnswers).filter(([idx, optIdx]) => {
                  const q = session.questions[Number(idx)]
                  return q?.options?.[optIdx]?.is_correct
                }).length
                const totalCount = session.questions?.length || 0
                const remainingCount = Math.max(0, totalCount - answeredCount)
                const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accuracy</span>
                          <Target className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{accuracy}%</div>
                        <div className="text-[10px] font-semibold text-slate-400">{correctCount} of {answeredCount} correct</div>
                      </div>

                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">XP Earned</span>
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-amber-500">+{sessionXP}</div>
                        <div className="text-[10px] font-semibold text-slate-400">Total {initialTotalXP + sessionXP} XP</div>
                      </div>

                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining</span>
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{remainingCount}</div>
                        <div className="text-[10px] font-semibold text-slate-400">{Math.round((answeredCount / Math.max(1, totalCount)) * 100)}% completed</div>
                      </div>

                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Streak</span>
                          <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                        </div>
                        <div className="text-2xl font-black text-orange-500">{streak || 1}d</div>
                        <div className="text-[10px] font-semibold text-slate-400">Keep it burning!</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsStatsOpen(false)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-300/30 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                    >
                      <span>Continue Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )
              })()}
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
            className="fixed inset-0 z-[200] bg-[#F8FAFC] xl:hidden flex flex-col h-screen h-[100dvh]"
          >
            <div className="flex items-center justify-between p-3 px-4 border-b border-slate-100 bg-white shadow-sm flex-shrink-0">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">
                  {activeFeedbackTab === 'insight' ? 'LEARNING INSIGHTS' : 
                   activeFeedbackTab === 'ai' ? 'AI DEEP ANALYSIS' : 
                   activeFeedbackTab === 'note' ? 'PERSONAL NOTES' : 
                   'COMMUNITY DISCUSSIONS'}
                </h4>
              </div>
              <button 
                onClick={() => setIsFeedbackOpen(false)} 
                className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
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

      {/* ⚙️ Study Settings Modal */}
      <PlaySettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        activeMode={activeMode}
        applyLearningMode={applyLearningMode}
        currentQuestion={currentQuestion}
        copyQuestionToClipboard={copyQuestionToClipboard}
        handleIgnoreQuestion={handleIgnoreQuestion}
        openEditModal={openEditModal}
        canEdit={canEdit}
        setIsQuitModalOpen={setIsQuitModalOpen}
        currentIndex={currentIndex}
        totalQuestions={session.questions?.length || 0}
      />



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
      {/* Exam Submit Confirmation Modal */}
      <AnimatePresence>
        {isSubmitConfirmOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
              onClick={() => setIsSubmitConfirmOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-8 text-center space-y-5 z-10"
            >
              <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <Send className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-800">Ready to Submit Exam?</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold">Please review your progress before finalizing</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <div className="p-2 bg-white rounded-xl shadow-2xs">
                  <span className="text-base font-black text-slate-800">{Object.keys(examAnswers).length}</span>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Answered</span>
                </div>
                <div className="p-2 bg-white rounded-xl shadow-2xs">
                  <span className="text-base font-black text-rose-600">
                    {Math.max(0, (session?.questions?.length || 0) - Object.keys(examAnswers).length)}
                  </span>
                  <span className="text-[9px] font-bold text-rose-400 block uppercase">Unanswered</span>
                </div>
                <div className="p-2 bg-white rounded-xl shadow-2xs">
                  <span className="text-base font-black text-amber-600">{flaggedQuestions.size}</span>
                  <span className="text-[9px] font-bold text-amber-400 block uppercase">Flagged</span>
                </div>
              </div>

              {((session?.questions?.length || 0) - Object.keys(examAnswers).length) > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-800 leading-snug">
                    You still have {Math.max(0, (session?.questions?.length || 0) - Object.keys(examAnswers).length)} unanswered question(s). Unanswered questions will receive 0 points.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setIsSubmitConfirmOpen(false)}
                  className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl active:scale-95 transition-all cursor-pointer"
                >
                  Keep Working
                </button>
                <button
                  onClick={() => handleSubmitExam(false)}
                  disabled={isSubmittingExam}
                  className="py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-200/50 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmittingExam ? "Submitting..." : "Confirm & Submit"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Reading Passage Drawer/Modal */}
      <AnimatePresence>
        {isPassageDrawerOpen && currentGroup && (
          <div className="fixed inset-0 z-[500] flex flex-col justify-end lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setIsPassageDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-white rounded-t-[2.5rem] border-t border-slate-200 shadow-2xl p-5 sm:p-7 max-h-[85vh] overflow-y-auto z-10 space-y-4 w-full"
            >
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto -mt-1 mb-2" />
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-wider">
                    Group {currentGroup.group_code}
                  </span>
                  <span className="text-sm font-black text-slate-800">{currentGroup.title || "Reading Passage"}</span>
                </div>
                <button
                  onClick={() => setIsPassageDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {currentGroup.audio_url && (
                <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                    <Headphones className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <span>Audio Track</span>
                  </div>
                  <audio controls src={currentGroup.audio_url} className="w-full h-10 rounded-xl" />
                </div>
              )}

              {currentGroup.image_url && (
                <div className="rounded-2xl overflow-hidden border border-slate-200">
                  <img src={currentGroup.image_url} alt="Passage illustration" className="w-full max-h-64 object-contain mx-auto" />
                </div>
              )}

              {currentGroup.passage_content && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-serif max-h-[50vh] overflow-y-auto custom-scrollbar">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {currentGroup.passage_content}
                  </ReactMarkdown>
                </div>
              )}

              <button
                onClick={() => setIsPassageDrawerOpen(false)}
                className="w-full py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-200 active:scale-95 transition-all cursor-pointer"
              >
                Close & Return to Question
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
