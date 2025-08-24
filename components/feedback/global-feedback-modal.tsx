"use client"

import { useFeedback } from "./feedback-context"
import { FeedbackModal } from "./feedback-modal"

export function GlobalFeedbackModal() {
  const { isOpen, defaultType, evaluationId, closeFeedback } = useFeedback()

  return (
    <FeedbackModal
      isOpen={isOpen}
      onClose={closeFeedback}
      defaultType={defaultType}
      evaluationId={evaluationId}
    />
  )
}
