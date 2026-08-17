import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

export interface PipelineStepStatus {
  id?: string
  type: 'new_cards' | 'mcq' | 'typing' | 'review' | 'study_time'
  done: boolean
  label: string
  url: string
  progress?: Record<string, any>
  daily_count?: number
  overdue_hours?: number
  question_count?: number
  pass_threshold?: number
  target_minutes?: number
}

export interface RoadmapStatusData {
  quiz_id?: number
  deck_id?: number
  quiz_title?: string
  deck_title?: string
  cover_image?: string | null
  roadmap_active: boolean
  pipeline: PipelineStepStatus[]
  current_step_index: number
  all_done: boolean
  next_action_url: string
  next_action_label: string
  stage_1_done?: boolean
  stage_2_done?: boolean
  new_learned_today?: number
  new_target_today?: number
  review_completed_today?: number
  review_due_today?: number
  roadmap_daily_new?: number
  roadmap_pass_threshold?: number
  streak?: number
  retention_rate?: number
  unlearned_cards?: number
  unlearned_questions?: number
  total_cards?: number
  total_questions?: number
  learned_cards?: number
  learned_questions?: number
  days_left?: number
  estimated_completion_date?: string
  today_total_study_minutes?: number
}

export function useRoadmapStatus(quizId: string | number | undefined, targetDate?: string | null) {
  const queryClient = useQueryClient()
  const numericId = quizId ? Number(quizId) : undefined
  
  const [justCompletedStep, setJustCompletedStep] = useState<PipelineStepStatus | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const prevStatusRef = useRef<RoadmapStatusData | null>(null)

  const { data: status, isLoading, refetch } = useQuery<RoadmapStatusData>({
    queryKey: ['quiz-roadmap-status', numericId, targetDate || 'today'],
    queryFn: async () => {
      if (!numericId) return null
      const url = targetDate 
        ? `/api/v1/quiz/${numericId}/roadmap-status?target_date=${targetDate}`
        : `/api/v1/quiz/${numericId}/roadmap-status`
      const res = await axios.get(url)
      return res.data
    },
    enabled: Boolean(numericId),
    staleTime: 5000,
  })

  const userDismissedRef = useRef(false)

  // Detect completed step and show floating banner
  useEffect(() => {
    if (!status || !status.roadmap_active || !status.pipeline || status.pipeline.length === 0) return

    if (status.next_action_url) {
      const currentPath = window.location.pathname
      const targetPath = status.next_action_url.split('?')[0]
      if (currentPath === targetPath || (targetPath.length > 1 && currentPath.endsWith(targetPath))) {
        setShowBanner(false)
        return
      }
    }

    let completedStep: PipelineStepStatus | null = null
    if (status.current_step_index > 0) {
      completedStep = status.pipeline[status.current_step_index - 1] || null
    } else if (status.all_done) {
      completedStep = status.pipeline[status.pipeline.length - 1] || null
    } else if (status.pipeline[0]?.done) {
      completedStep = status.pipeline[0]
    }

    if (completedStep && !userDismissedRef.current) {
      setJustCompletedStep(completedStep)
      setShowBanner(true)
    }

    prevStatusRef.current = status
  }, [status])

  const dismissBanner = useCallback(() => {
    userDismissedRef.current = true
    setShowBanner(false)
  }, [])

  const refetchRoadmap = useCallback(async () => {
    if (!numericId) return
    await queryClient.invalidateQueries({ queryKey: ['quiz-roadmap-status', numericId] })
    await queryClient.invalidateQueries({ queryKey: ['roadmap-global-decks'] })
    await queryClient.invalidateQueries({ queryKey: ['roadmapDecks'] })
    return refetch()
  }, [numericId, queryClient, refetch])

  return {
    status,
    isLoading,
    refetchRoadmap,
    showBanner,
    setShowBanner,
    dismissBanner,
    justCompletedStep,
    currentStep: status?.pipeline?.[status.current_step_index] || null,
    isRoadmapActive: Boolean(status?.roadmap_active),
    isAllDone: Boolean(status?.all_done),
    nextActionUrl: status?.next_action_url || `/quiz/${quizId}/roadmap`,
    nextActionLabel: status?.next_action_label || 'Tiếp Tục'
  }
}
