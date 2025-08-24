"use client"

import { createContext, useContext, useState, ReactNode, useRef } from "react"

interface FeedbackContextType {
  isOpen: boolean
  defaultType: "bug" | "feature" | "general"
  evaluationId?: string
  openFeedback: (type?: "bug" | "feature" | "general", evaluationId?: string) => void
  closeFeedback: () => void
  hasUserInteractedWithFeedback: () => boolean
  markFeedbackInteraction: () => void
  resetFeedbackInteraction: () => void
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [defaultType, setDefaultType] = useState<"bug" | "feature" | "general">("general")
  const [evaluationId, setEvaluationId] = useState<string | undefined>()

  // Track user interaction with feedback widget using ref to persist across renders
  const feedbackInteractionRef = useRef(false)
  const interactionTimestampRef = useRef<number | null>(null)

  const hasUserInteractedWithFeedback = () => {
    return feedbackInteractionRef.current
  }

  const markFeedbackInteraction = () => {
    const wasAlreadyInteracted = feedbackInteractionRef.current
    feedbackInteractionRef.current = true
    interactionTimestampRef.current = Date.now()
    console.log('FeedbackContext: User interaction with feedback marked at', new Date().toISOString())
    console.log('FeedbackContext: Was already interacted:', wasAlreadyInteracted, '-> Now interacted:', true)
  }

  const resetFeedbackInteraction = () => {
    const wasInteracted = feedbackInteractionRef.current
    feedbackInteractionRef.current = false
    interactionTimestampRef.current = null
    console.log('FeedbackContext: User feedback interaction reset')
    console.log('FeedbackContext: Was interacted:', wasInteracted, '-> Now interacted:', false)
  }

  const openFeedback = (type: "bug" | "feature" | "general" = "general", evalId?: string) => {
    console.log('FeedbackContext: openFeedback called with type =', type, 'evalId =', evalId)

    // Mark that user has interacted with feedback
    console.log('FeedbackContext: About to mark feedback interaction')
    feedbackInteractionRef.current = true
    interactionTimestampRef.current = Date.now()
    console.log('FeedbackContext: User interaction marked directly at', new Date().toISOString())

    console.log('FeedbackContext: modal state set to open')
    setDefaultType(type)
    setEvaluationId(evalId)
    setIsOpen(true)
  }

  const closeFeedback = () => {
    setIsOpen(false)
    setDefaultType("general")
    setEvaluationId(undefined)
  }

  return (
    <FeedbackContext.Provider value={{
      isOpen,
      defaultType,
      evaluationId,
      openFeedback,
      closeFeedback,
      hasUserInteractedWithFeedback,
      markFeedbackInteraction,
      resetFeedbackInteraction
    }}>
      {children}
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (context === undefined) {
    throw new Error("useFeedback must be used within a FeedbackProvider")
  }
  return context
}
