"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MessageCircle, X } from "lucide-react"
import { useFeedback } from "./feedback-context"

interface ContextualFeedbackPromptProps {
  trigger: "evaluation-completed" | "evaluation-failed" | "error-occurred"
  evaluationId?: string
  delay?: number // delay in milliseconds before showing
  onDismiss?: () => void
}

export function ContextualFeedbackPrompt({
  trigger,
  evaluationId,
  delay = 5000,
  onDismiss
}: ContextualFeedbackPromptProps) {
  const [isVisible, setIsVisible] = useState(false)
  const { openFeedback, hasUserInteractedWithFeedback } = useFeedback()

  // Create a stable identifier for this prompt instance using useRef
  const promptIdRef = useRef(`${trigger}-${evaluationId || 'no-eval'}-${Math.random().toString(36).substr(2, 9)}`)
  const promptId = promptIdRef.current

  useEffect(() => {
    console.log(`ContextualFeedbackPrompt [${promptId}]: Setting up timer for ${trigger} with ${delay}ms delay`)

    const timer = setTimeout(() => {
      // Check if user has already interacted with feedback widget
      const hasInteracted = hasUserInteractedWithFeedback()
      console.log(`ContextualFeedbackPrompt [${promptId}]: Timer expired. Checking interaction state:`, hasInteracted)

      if (hasInteracted) {
        console.log(`ContextualFeedbackPrompt [${promptId}]: User has already interacted with feedback widget, skipping prompt for ${trigger}`)
        return
      }

      console.log(`ContextualFeedbackPrompt [${promptId}]: No user interaction detected, showing prompt for ${trigger}`)
      setIsVisible(true)
    }, delay)

    return () => {
      console.log(`ContextualFeedbackPrompt [${promptId}]: Cleaning up timer for ${trigger}`)
      clearTimeout(timer)
    }
  }, [delay, trigger, promptId, hasUserInteractedWithFeedback])

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  const handleFeedbackClick = () => {
    console.log('ContextualFeedbackPrompt: handleFeedbackClick called')
    console.log('ContextualFeedbackPrompt: trigger =', trigger)
    console.log('ContextualFeedbackPrompt: evaluationId =', evaluationId)
    const feedbackType = trigger === "evaluation-completed" ? "general" : "bug"
    console.log('ContextualFeedbackPrompt: feedbackType =', feedbackType)
    console.log('ContextualFeedbackPrompt: calling openFeedback...')
    openFeedback(feedbackType, evaluationId)
    console.log('ContextualFeedbackPrompt: openFeedback called successfully')
    setIsVisible(false)
  }

  const getPromptContent = () => {
    switch (trigger) {
      case "evaluation-completed":
        return {
          title: "How was your evaluation experience?",
          description: "Help us improve by sharing your feedback about the evaluation process.",
          buttonText: "Share Feedback"
        }
      case "evaluation-failed":
        return {
          title: "Something went wrong",
          description: "We're sorry your evaluation failed. Please let us know what happened so we can fix it.",
          buttonText: "Report Issue"
        }
      case "error-occurred":
        return {
          title: "Encountered an issue?",
          description: "Help us improve by reporting any problems you experienced.",
          buttonText: "Report Problem"
        }
    }
  }

  if (!isVisible) return null

  const content = getPromptContent()

  return (
    <>
      <Card className="fixed bottom-20 right-4 z-[60] w-80 shadow-lg border-2 animate-in slide-in-from-bottom-2">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-sm">{content.title}</h4>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={handleDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {content.description}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleFeedbackClick}
              className="flex-1 text-xs"
            >
              {content.buttonText}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="text-xs"
            >
              Not now
            </Button>
          </div>
        </CardContent>
      </Card>


    </>
  )
}
