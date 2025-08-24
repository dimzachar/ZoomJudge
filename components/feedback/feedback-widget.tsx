"use client"

import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFeedback } from "./feedback-context"

export function FeedbackWidget() {
  const { openFeedback } = useFeedback()

  const handleClick = () => {
    console.log('FeedbackWidget: button clicked')
    openFeedback()
  }

  return (
    <Button
      onClick={handleClick}
      className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg lg:bottom-4 bottom-20"
      size="icon"
      aria-label="Send feedback"
    >
      <MessageCircle className="h-5 w-5" />
    </Button>
  )
}
